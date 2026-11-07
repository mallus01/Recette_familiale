import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Couverture } from "@/components/couverture";
import { EnTete, Page, ReserveAuxContributeurs } from "@/components/mise-en-page";
import { membreConnecte, peutNumeriser } from "@/lib/membre";
import { urlsSignees } from "@/lib/supabase/images";
import { creerClientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Cahier · Recettes familiales" };

export default function PageCahier({ params }: PageProps<"/numeriser/cahiers/[id]">) {
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
  const { data: cahier } = await supabase
    .from("cahier")
    .select("id, nom, couverture_chemin")
    .eq("id", Number(id))
    .maybeSingle();
  if (!cahier) notFound();
  const urls = await urlsSignees([cahier.couverture_chemin ?? ""]);

  return (
    <>
      <EnTete titre={cahier.nom} retour={{ href: "/numeriser", libelle: "Numériser" }} />
      <div className="w-2/3 self-center">
        <Couverture url={cahier.couverture_chemin ? urls.get(cahier.couverture_chemin) : undefined} nom={cahier.nom} />
      </div>
      <p className="rounded-2xl bg-ciel/15 p-5 leading-relaxed">
        Le cahier est créé. La photo des pages à la suite arrive à la prochaine étape.
      </p>
    </>
  );
}
