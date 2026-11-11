import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Carte, Rangee } from "@/components/cartes";
import { Couverture } from "@/components/couverture";
import { Page } from "@/components/mise-en-page";
import { membreConnecte } from "@/lib/membre";
import { COLONNES_RESUME, enCartes, type RecetteResume } from "@/lib/recettes";
import { urlsSignees } from "@/lib/supabase/images";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { Recherche } from "./recherche";
import { RelancerSuggestions } from "./relancer-suggestions";

// US-30 : accueil avec recherche, filtres et trois rangées.
export default function Accueil() {
  return (
    <Page>
      <h1 className="text-2xl font-semibold tracking-tight">
        Recettes familiales
      </h1>
      <Suspense fallback={<p className="text-taupe">Chargement…</p>}>
        <Contenu />
      </Suspense>
    </Page>
  );
}

async function Contenu() {
  const membre = await membreConnecte();
  if (!membre) redirect("/connexion");
  const supabase = await creerClientServeur();

  const [
    { data: types },
    { data: occasions },
    { data: liste },
    { data: cahiers },
    { data: suggestions },
  ] = await Promise.all([
    supabase.from("type_repas").select("id, nom, image_chemin").order("nom"),
    supabase.from("occasion").select("id, nom, image_chemin").order("nom"),
    supabase
      .from("liste_perso")
      .select("recette_id, ajoute_le")
      .eq("membre_id", membre.id)
      .eq("type", "a_cuisiner")
      .order("ajoute_le", { ascending: false }),
    supabase
      .from("cahier")
      .select("id, nom, couverture_chemin")
      .order("cree_le"),
    supabase.rpc("suggestions_recettes", { p_nombre: 8 }),
  ]);

  const idsACuisiner = (liste ?? []).map((l) => l.recette_id as number);
  const { data: aCuisinerBrut } = idsACuisiner.length
    ? await supabase
        .from("recette_resume")
        .select(COLONNES_RESUME)
        .in("id", idsACuisiner)
    : { data: [] };
  const aCuisiner = idsACuisiner
    .map((id) => (aCuisinerBrut as RecetteResume[]).find((r) => r.id === id))
    .filter((r): r is RecetteResume => Boolean(r));
  const proposees = (suggestions ?? []) as RecetteResume[];
  const listeCahiers = (cahiers ?? []) as {
    id: number;
    nom: string;
    couverture_chemin: string | null;
  }[];

  const urls = await urlsSignees([
    ...[...aCuisiner, ...proposees].flatMap((r) =>
      r.vignette_chemin ? [r.vignette_chemin] : [],
    ),
    ...listeCahiers.flatMap((c) =>
      c.couverture_chemin ? [c.couverture_chemin] : [],
    ),
    ...[...(types ?? []), ...(occasions ?? [])].flatMap((v) =>
      v.image_chemin ? [v.image_chemin as string] : [],
    ),
  ]);
  // US-37 : image de chaque valeur de filtre (icône par défaut sinon).
  const avecImage = (
    l: { id: number; nom: string; image_chemin: string | null }[] | null,
  ) =>
    (l ?? []).map((v) => ({
      id: v.id,
      nom: v.nom,
      image: v.image_chemin ? urls.get(v.image_chemin) : undefined,
    }));

  return (
    <Recherche typesRepas={avecImage(types)} occasions={avecImage(occasions)}>
      <div className="flex flex-col gap-8">
        <Rangee titre="À cuisiner">
          {aCuisiner.length === 0 ? (
            <p className="text-sm leading-relaxed text-taupe">
              Ajoute des recettes depuis leur fiche pour les retrouver ici.
            </p>
          ) : (
            enCartes(aCuisiner, urls).map((r) => (
              <Carte key={r.id} recette={r} />
            ))
          )}
        </Rangee>

        <Rangee titre="Les cahiers">
          {listeCahiers.length === 0 ? (
            <p className="text-sm text-taupe">Aucun cahier pour l’instant.</p>
          ) : (
            listeCahiers.map((c) => (
              <Link
                key={c.id}
                href={`/cahiers/${c.id}`}
                className="flex w-32 shrink-0 flex-col gap-2"
              >
                <Couverture
                  url={
                    c.couverture_chemin
                      ? urls.get(c.couverture_chemin)
                      : undefined
                  }
                  nom={c.nom}
                />
                <span className="line-clamp-2 text-sm leading-snug font-medium">
                  {c.nom}
                </span>
              </Link>
            ))
          )}
        </Rangee>

        <Rangee
          titre="Suggestions"
          action={proposees.length > 1 ? <RelancerSuggestions /> : null}
        >
          {proposees.length === 0 ? (
            <p className="text-sm text-taupe">
              Aucune recette publiée pour l’instant.
            </p>
          ) : (
            enCartes(proposees, urls).map((r) => (
              <Carte key={r.id} recette={r} />
            ))
          )}
        </Rangee>
      </div>
    </Recherche>
  );
}
