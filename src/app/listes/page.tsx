import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Ligne } from "@/components/cartes";
import { Page } from "@/components/mise-en-page";
import { membreConnecte } from "@/lib/membre";
import { COLONNES_RESUME, enCartes, type RecetteResume } from "@/lib/recettes";
import { urlsSignees } from "@/lib/supabase/images";
import { GererListe, NouvelleListe } from "./gestion-listes";
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

// US-28 : les deux listes privées, séparées. US-53 à US-55 : suivies des listes créées
// par le membre, avec « Nouvelle liste ».
export default function MesListes({ searchParams }: PageProps<"/listes">) {
  return (
    <Page large>
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
  const membre = await membreConnecte();
  if (!membre) redirect("/connexion");

  const supabase = await creerClientServeur();
  const { data: creees } = await supabase
    .from("liste_membre")
    .select("id, nom")
    .eq("membre_id", membre.id)
    .order("cree_le");
  const mesListes = (creees ?? []) as { id: number; nom: string }[];
  const creee = mesListes.find((l) => String(l.id) === cle);
  const liste = creee
    ? null
    : (LISTES.find((l) => l.cle === cle) ?? LISTES[0]);

  const { data: lignes } = creee
    ? await supabase
        .from("liste_membre_recette")
        .select("recette_id")
        .eq("liste_id", creee.id)
        .order("ajoute_le", { ascending: false })
    : await supabase
        .from("liste_perso")
        .select("recette_id")
        .eq("membre_id", membre.id)
        .eq("type", liste!.type)
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
        className="-mx-6 -mt-2 flex gap-2 overflow-x-auto px-6 pb-1 text-sm font-medium md:mx-0 md:flex-wrap md:px-0"
        aria-label="Listes"
      >
        {[
          ...LISTES.map((l) => ({
            cle: l.cle as string,
            libelle: l.libelle as string,
            actif: l === liste,
          })),
          ...mesListes.map((l) => ({
            cle: String(l.id),
            libelle: l.nom,
            actif: l === creee,
          })),
        ].map((l) => (
          <Link
            key={l.cle}
            href={`/listes?liste=${l.cle}`}
            replace
            aria-current={l.actif ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center rounded-full border px-4 whitespace-nowrap ${
              l.actif
                ? "border-ardoise bg-ardoise text-white"
                : "border-ardoise/25"
            }`}
          >
            {l.libelle}
          </Link>
        ))}
        <NouvelleListe />
      </nav>
      {creee ? (
        <GererListe
          key={`${creee.id}-${creee.nom}`}
          id={creee.id}
          nom={creee.nom}
          nombre={recettes.length}
        />
      ) : null}
      {recettes.length === 0 ? (
        <p className="leading-relaxed text-taupe">
          {creee
            ? "Cette liste est vide. Sur la fiche d’une recette, touche « Ajouter à une liste » pour la ranger ici."
            : liste!.vide}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-ardoise/10 md:grid md:grid-cols-2 md:gap-x-10 md:divide-y-0">
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
