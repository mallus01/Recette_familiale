import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Ligne } from "@/components/cartes";
import { Page } from "@/components/mise-en-page";
import { membreConnecte } from "@/lib/membre";
import { COLONNES_RESUME, enCartes, type RecetteResume } from "@/lib/recettes";
import { urlsSignees } from "@/lib/supabase/images";
import { creerClientServeur } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Mes listes · Recettes familiales" };

const LISTES = [
  {
    cle: "favoris",
    type: "favori",
    libelle: "Favoris",
    vide: "Touche « Favori » sur une fiche pour retrouver la recette ici.",
  },
  {
    cle: "a-cuisiner",
    type: "a_cuisiner",
    libelle: "À cuisiner",
    vide: "Touche « À cuisiner » sur une fiche pour la mettre de côté. Elle quitte la liste quand tu la termines en mode cuisine.",
  },
] as const;

// US-28 : les deux listes privées, séparées.
export default function MesListes({ searchParams }: PageProps<"/listes">) {
  return (
    <Page>
      <h1 className="text-2xl font-semibold tracking-tight">Mes listes</h1>
      <Suspense fallback={<p className="text-taupe">Chargement…</p>}>
        <Contenu searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}

async function Contenu({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { liste: cle } = await searchParams;
  const liste = LISTES.find((l) => l.cle === cle) ?? LISTES[0];
  const membre = await membreConnecte();
  if (!membre) redirect("/connexion");

  const supabase = await creerClientServeur();
  const { data: lignes } = await supabase
    .from("liste_perso")
    .select("recette_id")
    .eq("membre_id", membre.id)
    .eq("type", liste.type)
    .order("ajoute_le", { ascending: false });
  const ids = (lignes ?? []).map((l) => l.recette_id as number);
  const { data: brut } = ids.length
    ? await supabase
        .from("recette_resume")
        .select(COLONNES_RESUME)
        .in("id", ids)
    : { data: [] };
  const recettes = ids
    .map((id) => (brut as RecetteResume[]).find((r) => r.id === id))
    .filter((r): r is RecetteResume => Boolean(r));
  const urls = await urlsSignees(
    recettes.flatMap((r) => (r.vignette_chemin ? [r.vignette_chemin] : [])),
  );

  return (
    <>
      <nav
        className="-mt-2 flex rounded-full bg-ardoise/10 p-1 text-sm font-medium"
        aria-label="Listes"
      >
        {LISTES.map((l) => (
          <Link
            key={l.cle}
            href={`/listes?liste=${l.cle}`}
            replace
            aria-current={l === liste ? "page" : undefined}
            className={`flex-1 rounded-full py-2 text-center ${l === liste ? "bg-white shadow-sm" : "text-ardoise/70"}`}
          >
            {l.libelle}
          </Link>
        ))}
      </nav>
      {recettes.length === 0 ? (
        <p className="leading-relaxed text-taupe">{liste.vide}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-ardoise/10">
          {enCartes(recettes, urls).map((r) => (
            <li key={r.id}>
              <Ligne recette={r} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
