import type { Metadata } from "next";
import { Suspense } from "react";
import { EnTete, Page, ReserveAuxContributeurs } from "@/components/mise-en-page";
import { membreConnecte, peutNumeriser } from "@/lib/membre";
import { FormulaireNouvelleRecette } from "./formulaire-nouvelle-recette";

export const metadata: Metadata = { title: "Nouvelle recette · Recettes familiales" };

// US-52 : ajouter une recette à la main, sans scan.
export default function NouvelleRecette() {
  return (
    <Page>
      <EnTete titre="Nouvelle recette" retour={{ href: "/numeriser", libelle: "Numériser" }} />
      <Suspense fallback={<p className="text-taupe">Chargement…</p>}>
        <Contenu />
      </Suspense>
    </Page>
  );
}

async function Contenu() {
  const membre = await membreConnecte();
  if (!membre || !peutNumeriser(membre.role)) return <ReserveAuxContributeurs />;
  return <FormulaireNouvelleRecette membreId={membre.id} />;
}
