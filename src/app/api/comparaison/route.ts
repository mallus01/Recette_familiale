import { after } from "next/server";
import { lirePage, type Fournisseur } from "@/lib/lecture/fournisseurs";
import { coutEstime } from "@/lib/lecture/prix";
import { membreConnecte } from "@/lib/membre";
import { creerClientServeur } from "@/lib/supabase/serveur";

// US-11 : lit une page avec chacun des modèles comparés, en arrière-plan, et garde
// le résultat, la durée et le coût de chacun. N'écrit aucune recette.
export const maxDuration = 300;

function fournisseursCompares(): Fournisseur[] {
  return process.env.LECTURE_IA === "simulee" ? ["simulee"] : ["claude", "gemini"];
}

export async function POST(requete: Request) {
  const { pageId } = (await requete.json().catch(() => ({}))) as { pageId?: unknown };
  if (typeof pageId !== "number") return Response.json({ erreur: "pageId manquant" }, { status: 400 });

  const membre = await membreConnecte();
  if (membre?.role !== "admin") return Response.json({ erreur: "réservé à l'administrateur" }, { status: 403 });
  const supabase = await creerClientServeur();

  const { data: page } = await supabase.from("page_scannee").select("id, image_chemin").eq("id", pageId).maybeSingle();
  if (!page) return Response.json({ erreur: "page introuvable" }, { status: 404 });

  const fournisseurs = fournisseursCompares();
  const { error } = await supabase.from("comparaison_lecture").upsert(
    fournisseurs.map((fournisseur) => ({
      page_id: page.id,
      fournisseur,
      statut: "en_cours",
      resultat: null,
      erreur: null,
      nb_erreurs: null,
    })),
    { onConflict: "page_id,fournisseur" },
  );
  if (error) return Response.json({ erreur: error.message }, { status: 500 });

  after(async () => {
    const { data: image, error: erreurImage } = await supabase.storage.from("images").download(page.image_chemin);
    const octets = image ? new Uint8Array(await image.arrayBuffer()) : null;
    await Promise.all(
      fournisseurs.map(async (fournisseur) => {
        const debut = Date.now();
        try {
          if (!octets) throw erreurImage ?? new Error("image introuvable");
          const lecture = await lirePage(octets, image?.type || "image/jpeg", fournisseur);
          await supabase
            .from("comparaison_lecture")
            .update({
              statut: "terminee",
              modele: lecture.modele,
              resultat: lecture.resultat,
              duree_ms: Date.now() - debut,
              jetons_entree: lecture.jetons.entree,
              jetons_sortie: lecture.jetons.sortie,
              cout_dollars: coutEstime(fournisseur, lecture.modele, lecture.jetons.entree, lecture.jetons.sortie),
            })
            .eq("page_id", page.id)
            .eq("fournisseur", fournisseur);
        } catch (e) {
          console.error("Comparaison", fournisseur, "page", page.id, ":", e);
          await supabase
            .from("comparaison_lecture")
            .update({ statut: "en_echec", erreur: String(e instanceof Error ? e.message : e).slice(0, 500), duree_ms: Date.now() - debut })
            .eq("page_id", page.id)
            .eq("fournisseur", fournisseur);
        }
      }),
    );
  });

  return Response.json({ etat: "en_cours" }, { status: 202 });
}
