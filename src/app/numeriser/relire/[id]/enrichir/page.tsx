import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  EnTete,
  Page,
  ReserveAuxContributeurs,
} from "@/components/mise-en-page";
import { membreConnecte, peutNumeriser } from "@/lib/membre";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { Enrichissement } from "./enrichissement";

export const metadata: Metadata = {
  title: "Enrichir la recette · Recettes familiales",
};

// US-16 et US-17 : après Valider, on enrichit la recette (transmis par, souvenir,
// portions, durée, tags), puis on la publie.
export default function PageEnrichir({
  params,
}: PageProps<"/numeriser/relire/[id]/enrichir">) {
  return (
    <Page>
      <Suspense fallback={<p className="text-taupe">Chargement…</p>}>
        <Contenu params={params} />
      </Suspense>
    </Page>
  );
}

type Ligne = {
  id: number;
  titre: string;
  statut: "brouillon" | "publiee";
  transmis_par: string | null;
  souvenir: string | null;
  portions: number | null;
  duree_minutes: number | null;
  type_repas_id: number | null;
  classique: boolean;
  recette_occasion: { occasion_id: number }[];
};

async function Contenu({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const membre = await membreConnecte();
  if (!peutNumeriser(membre?.role)) return <ReserveAuxContributeurs />;

  const supabase = await creerClientServeur();
  const [{ data: recette }, { data: types }, { data: occasions }] =
    await Promise.all([
      supabase
        .from("recette")
        .select(
          "id, titre, statut, transmis_par, souvenir, portions, duree_minutes, type_repas_id, classique, recette_occasion(occasion_id)",
        )
        .eq("id", Number(id))
        .maybeSingle<Ligne>(),
      supabase.from("type_repas").select("id, nom").order("nom"),
      supabase.from("occasion").select("id, nom").order("nom"),
    ]);
  if (!recette) notFound();

  return (
    <>
      <EnTete
        titre="Enrichir la recette"
        retour={{
          href: `/numeriser/relire/${recette.id}`,
          libelle: "Relecture",
        }}
      />
      <p className="-mt-3 font-medium">{recette.titre}</p>
      <Enrichissement
        recetteId={recette.id}
        publiee={recette.statut === "publiee"}
        types={types ?? []}
        occasions={occasions ?? []}
        initial={{
          transmis_par: recette.transmis_par ?? "",
          souvenir: recette.souvenir ?? "",
          portions: recette.portions === null ? "" : String(recette.portions),
          duree_minutes:
            recette.duree_minutes === null ? "" : String(recette.duree_minutes),
          type: recette.type_repas_id,
          occasions: recette.recette_occasion.map((o) => o.occasion_id),
          classique: recette.classique,
        }}
      />
    </>
  );
}
