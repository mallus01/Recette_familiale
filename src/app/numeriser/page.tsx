import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Couverture } from "@/components/couverture";
import { EnTete, Page, ReserveAuxContributeurs } from "@/components/mise-en-page";
import { membreConnecte, peutNumeriser } from "@/lib/membre";
import { urlsSignees } from "@/lib/supabase/images";
import { creerClientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Numériser · Recettes familiales" };

export default function Numeriser() {
  return (
    <Page>
      <EnTete titre="Numériser" retour={{ href: "/", libelle: "Accueil" }} />
      <Suspense fallback={<p className="text-taupe">Chargement…</p>}>
        <ListeCahiers />
      </Suspense>
    </Page>
  );
}

async function ListeCahiers() {
  const membre = await membreConnecte();
  if (!peutNumeriser(membre?.role)) return <ReserveAuxContributeurs />;

  const supabase = await creerClientServeur();
  const { data: cahiers } = await supabase
    .from("cahier")
    .select("id, nom, couverture_chemin")
    .order("cree_le", { ascending: false });
  const urls = await urlsSignees((cahiers ?? []).map((c) => c.couverture_chemin ?? ""));

  return (
    <>
      <Link
        href="/numeriser/nouveau-cahier"
        className="rounded-xl bg-ardoise px-5 py-3.5 text-center font-semibold text-white"
      >
        Nouveau cahier
      </Link>
      {cahiers && cahiers.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Les cahiers</h2>
          <ul className="grid grid-cols-2 gap-4">
            {cahiers.map((c) => (
              <li key={c.id}>
                <Link href={`/numeriser/cahiers/${c.id}`} className="flex flex-col gap-2">
                  <Couverture url={c.couverture_chemin ? urls.get(c.couverture_chemin) : undefined} nom={c.nom} />
                  <span className="text-sm font-medium leading-snug">{c.nom}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-taupe leading-relaxed">Aucun cahier pour l’instant. Commencez par photographier la couverture du premier.</p>
      )}
    </>
  );
}
