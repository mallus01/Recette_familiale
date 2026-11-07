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
import { ChoixTags } from "./choix-tags";

export const metadata: Metadata = {
  title: "Classer la recette · Recettes familiales",
};

// US-14 : classer une recette par type de repas, occasions et case Classique.
export default function PageClasser({
  params,
}: PageProps<"/numeriser/relire/[id]/classer">) {
  return (
    <Page>
      <Suspense fallback={<p className="text-taupe">Chargement…</p>}>
        <Contenu params={params} />
      </Suspense>
    </Page>
  );
}

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
          "id, titre, type_repas_id, classique, recette_occasion(occasion_id)",
        )
        .eq("id", Number(id))
        .maybeSingle<{
          id: number;
          titre: string;
          type_repas_id: number | null;
          classique: boolean;
          recette_occasion: { occasion_id: number }[];
        }>(),
      supabase.from("type_repas").select("id, nom").order("nom"),
      supabase.from("occasion").select("id, nom").order("nom"),
    ]);
  if (!recette) notFound();

  return (
    <>
      <EnTete
        titre="Classer la recette"
        retour={{
          href: `/numeriser/relire/${recette.id}`,
          libelle: "Relecture",
        }}
      />
      <p className="-mt-3 font-medium">{recette.titre}</p>
      <ChoixTags
        recetteId={recette.id}
        types={types ?? []}
        occasions={occasions ?? []}
        initial={{
          type: recette.type_repas_id,
          occasions: recette.recette_occasion.map((o) => o.occasion_id),
          classique: recette.classique,
        }}
      />
    </>
  );
}
