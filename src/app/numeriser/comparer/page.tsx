import type { Metadata } from "next";
import { Suspense } from "react";
import { EnTete, Page } from "@/components/mise-en-page";
import type { ResultatLecture } from "@/lib/lecture/resultat";
import { membreConnecte } from "@/lib/membre";
import { urlsSignees } from "@/lib/supabase/images";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { ComparaisonModeles, type Essai, type PageComparee } from "./comparaison-modeles";

export const metadata: Metadata = { title: "Comparer les modèles · Recettes familiales" };

export default function Comparer() {
  return (
    <Page>
      <EnTete titre="Comparer les modèles d’IA" retour={{ href: "/numeriser", libelle: "Numériser" }} />
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
  cahier: { nom: string } | null;
  comparaison_lecture: (Omit<Essai, "resultat"> & { resultat: ResultatLecture | null })[];
};

async function Contenu() {
  const membre = await membreConnecte();
  if (membre?.role !== "admin") {
    return <p className="rounded-2xl bg-ciel/15 p-5 leading-relaxed">La comparaison des modèles est réservée à l’administrateur.</p>;
  }

  const supabase = await creerClientServeur();
  const { data } = await supabase
    .from("page_scannee")
    .select(
      "id, numero, image_chemin, cahier(nom), comparaison_lecture(id, fournisseur, modele, statut, resultat, erreur, duree_ms, jetons_entree, jetons_sortie, cout_dollars, nb_erreurs)",
    )
    .order("cree_le", { ascending: false })
    .returns<Ligne[]>();
  const urls = await urlsSignees((data ?? []).map((p) => p.image_chemin));

  const pages: PageComparee[] = (data ?? []).map((p) => ({
    id: p.id,
    numero: p.numero,
    cahier: p.cahier?.nom ?? "",
    url: urls.get(p.image_chemin),
    essais: [...p.comparaison_lecture].sort((a, b) => a.fournisseur.localeCompare(b.fournisseur)),
  }));

  return <ComparaisonModeles pages={pages} />;
}
