import type { Metadata } from "next";
import { Suspense } from "react";
import { EnTete, Page, ReserveAuxContributeurs } from "@/components/mise-en-page";
import { membreConnecte, peutNumeriser } from "@/lib/membre";
import { FormulaireNouveauCahier } from "./formulaire-nouveau-cahier";

export const metadata: Metadata = { title: "Nouveau cahier · Recettes familiales" };

export default function NouveauCahier() {
  return (
    <Page>
      <EnTete titre="Nouveau cahier" retour={{ href: "/numeriser", libelle: "Numériser" }} />
      <Suspense fallback={<p className="text-taupe">Chargement…</p>}>
        <Contenu />
      </Suspense>
    </Page>
  );
}

async function Contenu() {
  const membre = await membreConnecte();
  if (!membre || !peutNumeriser(membre.role)) return <ReserveAuxContributeurs />;
  return <FormulaireNouveauCahier membreId={membre.id} />;
}
