import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Couverture } from "@/components/couverture";
import { EnTete, Page, ReserveAuxContributeurs } from "@/components/mise-en-page";
import { membreConnecte, peutNumeriser } from "@/lib/membre";
import { urlsSignees } from "@/lib/supabase/images";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { PagesDuCahier } from "./pages-du-cahier";

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
    .select("id, numero, image_chemin, statut, nb_mots_douteux, recette_page(recette(id, titre, statut))")
    .eq("cahier_id", cahier.id)
    .order("numero")
    .returns<
      {
        id: number;
        numero: number;
        image_chemin: string;
        statut: "en_attente" | "lecture_en_cours" | "prete" | "en_echec";
        nb_mots_douteux: number;
        recette_page: { recette: { id: number; titre: string; statut: string } | null }[];
      }[]
    >();
  // Recettes publiées de ce cahier, dans l'ordre des pages (une recette sur deux pages
  // n'apparaît qu'une fois).
  const publiees = [
    ...new Map(
      (pages ?? [])
        .flatMap((p) => p.recette_page.map((rp) => rp.recette))
        .filter((r) => r?.statut === "publiee")
        .map((r) => [r!.id, r!]),
    ).values(),
  ];
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

      {publiees.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Recettes publiées</h2>
          <ul className="flex flex-col gap-1.5">
            {publiees.map((r) => (
              <li key={r.id}>
                <Link href={`/recettes/${r.id}`} className="underline decoration-ciel decoration-2 underline-offset-4">
                  {r.titre}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {nbPages > 0 ? (
        <PagesDuCahier pages={pages!.map((p) => ({ ...p, url: urls.get(p.image_chemin) }))} />
      ) : (
        <p className="leading-relaxed text-taupe">Aucune page photographiée pour l’instant.</p>
      )}
    </>
  );
}
