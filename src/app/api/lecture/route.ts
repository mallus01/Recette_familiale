import { after } from "next/server";
import { lirePage } from "@/lib/lecture/fournisseurs";
import { creerClientServeur } from "@/lib/supabase/serveur";

// Lecture d'une page par l'IA, en arrière-plan : la requête répond tout de suite,
// la lecture continue après la réponse (cahier des charges : « l'IA traite les pages
// en arrière-plan »).
export const maxDuration = 300;

const BLOCAGE_MINUTES = 10; // une lecture en cours depuis plus longtemps peut être relancée

export async function POST(requete: Request) {
  const { pageId } = (await requete.json().catch(() => ({}))) as { pageId?: unknown };
  if (typeof pageId !== "number") return Response.json({ erreur: "pageId manquant" }, { status: 400 });

  const supabase = await creerClientServeur();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) return Response.json({ erreur: "non connecté" }, { status: 401 });

  // Passage en « lecture en cours », seulement si la page n'est pas déjà lue ou en lecture.
  const limite = new Date(Date.now() - BLOCAGE_MINUTES * 60_000).toISOString();
  const { data: page } = await supabase
    .from("page_scannee")
    .update({ statut: "lecture_en_cours", lecture_le: new Date().toISOString() })
    .eq("id", pageId)
    .or(`statut.in.(en_attente,en_echec),and(statut.eq.lecture_en_cours,lecture_le.lt."${limite}")`)
    .select("id, image_chemin")
    .maybeSingle();
  if (!page) return Response.json({ etat: "deja_traitee" }, { status: 409 });

  after(async () => {
    try {
      const { data: image, error } = await supabase.storage.from("images").download(page.image_chemin);
      if (error || !image) throw error ?? new Error("image introuvable");
      const { resultat, modele } = await lirePage(new Uint8Array(await image.arrayBuffer()), image.type || "image/jpeg");
      const enregistrement = await supabase.rpc("enregistrer_lecture", {
        p_page_id: page.id,
        p_resultat: resultat,
        p_modele: modele,
      });
      if (enregistrement.error) throw enregistrement.error;
    } catch (erreur) {
      console.error("Lecture de la page", page.id, "en échec :", erreur);
      await supabase.from("page_scannee").update({ statut: "en_echec" }).eq("id", page.id);
    }
  });

  return Response.json({ etat: "lecture_en_cours" }, { status: 202 });
}
