import type { Metadata } from "next";
import Link from "next/link";
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
  const { data: pages } = await supabase
    .from("page_scannee")
    .select("id, numero, image_chemin")
    .eq("cahier_id", cahier.id)
    .order("numero");
  const urls = await urlsSignees([cahier.couverture_chemin ?? "", ...(pages ?? []).map((p) => p.image_chemin)]);
  const nbPages = pages?.length ?? 0;

  return (
    <>
      <EnTete titre={cahier.nom} retour={{ href: "/numeriser", libelle: "Numériser" }} />
      <div className="w-1/2 self-center">
        <Couverture url={cahier.couverture_chemin ? urls.get(cahier.couverture_chemin) : undefined} nom={cahier.nom} />
      </div>

      <Link
        href={`/numeriser/cahiers/${cahier.id}/capture`}
        className="rounded-xl bg-ardoise px-5 py-3.5 text-center font-semibold text-white"
      >
        {nbPages > 0 ? "Photographier d’autres pages" : "Photographier les pages"}
      </Link>

      {nbPages > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">{nbPages === 1 ? "1 page" : `${nbPages} pages`}</h2>
          <ul className="grid grid-cols-3 gap-3">
            {pages!.map((p) => (
              <li key={p.id} className="flex flex-col gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL signée d'un bucket privé */}
                <img
                  src={urls.get(p.image_chemin)}
                  alt={`Page ${p.numero}`}
                  className="aspect-[3/4] w-full rounded-lg bg-jaune/40 object-cover"
                />
                <span className="text-center text-xs text-taupe">Page {p.numero}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="leading-relaxed text-taupe">Aucune page photographiée pour l’instant.</p>
      )}
    </>
  );
}
