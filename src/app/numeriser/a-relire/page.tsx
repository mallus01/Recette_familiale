import type { Metadata } from "next";
import { Suspense } from "react";
import { EnTete, Page, ReserveAuxContributeurs } from "@/components/mise-en-page";
import { membreConnecte, peutNumeriser } from "@/lib/membre";
import type { StatutPage } from "@/lib/lecture/etat";
import { urlsSignees } from "@/lib/supabase/images";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { FileARelire, type CahierARelire } from "./file-a-relire";

export const metadata: Metadata = { title: "À relire · Recettes familiales" };

export default function ARelire() {
  return (
    <Page>
      <EnTete titre="À relire" retour={{ href: "/numeriser", libelle: "Numériser" }} />
      <Suspense fallback={<p className="text-taupe">Chargement…</p>}>
        <Contenu />
      </Suspense>
    </Page>
  );
}

type Ligne = {
  id: number;
  numero: number;
  image_chemin: string;
  statut: StatutPage;
  nb_mots_douteux: number;
  cahier: { id: number; nom: string } | null;
  recette_page: { recette: { id: number; titre: string; statut: string } | null }[];
};

async function Contenu() {
  const membre = await membreConnecte();
  if (!peutNumeriser(membre?.role)) return <ReserveAuxContributeurs />;

  const supabase = await creerClientServeur();
  const { data } = await supabase
    .from("page_scannee")
    .select(
      "id, numero, image_chemin, statut, nb_mots_douteux, cahier(id, nom), recette_page(recette(id, titre, statut))",
    )
    .order("numero")
    .returns<Ligne[]>();

  // Une page reste dans la file tant qu'elle n'est pas lue, ou qu'une de ses recettes
  // est encore un brouillon.
  const pages = (data ?? []).filter(
    (p) =>
      p.statut !== "prete" ||
      p.recette_page.length === 0 ||
      p.recette_page.some((rp) => rp.recette?.statut === "brouillon"),
  );
  const urls = await urlsSignees(pages.map((p) => p.image_chemin));

  // Tri par cahier (ordre alphabétique), puis par numéro de page.
  const parCahier = new Map<number, CahierARelire>();
  for (const p of pages) {
    if (!p.cahier) continue;
    const cahier = parCahier.get(p.cahier.id) ?? { id: p.cahier.id, nom: p.cahier.nom, pages: [] };
    cahier.pages.push({
      id: p.id,
      numero: p.numero,
      url: urls.get(p.image_chemin),
      statut: p.statut,
      nb_mots_douteux: p.nb_mots_douteux,
      recettes: p.recette_page.flatMap((rp) =>
        rp.recette?.statut === "brouillon" ? [{ id: rp.recette.id, titre: rp.recette.titre }] : [],
      ),
    });
    parCahier.set(p.cahier.id, cahier);
  }
  const cahiers = [...parCahier.values()].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  return <FileARelire cahiers={cahiers} />;
}
