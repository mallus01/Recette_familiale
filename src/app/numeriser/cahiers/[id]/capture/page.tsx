import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EnTete, Page, ReserveAuxContributeurs } from "@/components/mise-en-page";
import { membreConnecte, peutNumeriser } from "@/lib/membre";
import { urlsSignees } from "@/lib/supabase/images";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { CaptureSerie } from "./capture-serie";

export const metadata: Metadata = { title: "Photographier les pages · Recettes familiales" };

export default function PageCapture({ params }: PageProps<"/numeriser/cahiers/[id]/capture">) {
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
  const { data: cahier } = await supabase.from("cahier").select("id, nom").eq("id", Number(id)).maybeSingle();
  if (!cahier) notFound();

  // On reprend après la dernière page déjà photographiée.
  const { data: derniere } = await supabase
    .from("page_scannee")
    .select("numero, image_chemin")
    .eq("cahier_id", cahier.id)
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();
  const urls = await urlsSignees([derniere?.image_chemin ?? ""]);

  return (
    <>
      <EnTete titre={cahier.nom} retour={{ href: `/numeriser/cahiers/${cahier.id}`, libelle: "Le cahier" }} />
      <CaptureSerie
        cahierId={cahier.id}
        prochainNumero={(derniere?.numero ?? 0) + 1}
        derniere={derniere ? { numero: derniere.numero, url: urls.get(derniere.image_chemin) } : null}
      />
    </>
  );
}
