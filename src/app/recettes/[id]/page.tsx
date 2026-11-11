import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { IconeOccasion, IconeTypeRepas } from "@/components/icones";
import { EnTete, Page } from "@/components/mise-en-page";
import { ScanZoomable } from "@/components/scan-zoomable";
import { duree } from "@/lib/mesures";
import {
  personnes as libellePersonnes,
  personnesChoisies,
} from "@/lib/portions";
import { membreConnecte, peutNumeriser } from "@/lib/membre";
import { urlsSignees } from "@/lib/supabase/images";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { BoutonsListes } from "./boutons-listes";
import { Ingredients } from "./ingredients";
import { Photos } from "./photos";

export const metadata: Metadata = { title: "Recette · Recettes familiales" };

// US-18 : fiche d'une recette, à lire avant de cuisiner.
export default function FicheRecette({
  params,
  searchParams,
}: PageProps<"/recettes/[id]">) {
  return (
    <Page>
      <Suspense fallback={<p className="text-taupe">Chargement…</p>}>
        <Contenu params={params} searchParams={searchParams} />
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
  classique: boolean;
  type_repas: { nom: string } | null;
  recette_occasion: { occasion: { nom: string } | null }[];
  groupe_ingredients: {
    id: number;
    nom: string | null;
    ordre: number;
    ingredient: {
      id: number;
      quantite: number | null;
      unite: string | null;
      nom: string;
      texte_origine: string | null;
      ordre: number;
    }[];
  }[];
  etape: { id: number; ordre: number; texte: string }[];
  note: { id: number; texte: string; etape_id: number | null }[];
  photo: {
    id: number;
    image_chemin: string;
    statut: "en_attente" | "validee";
    validee_le: string | null;
    propose_par: string | null;
  }[];
  recette_page: {
    ordre: number;
    page_scannee: {
      id: number;
      numero: number;
      image_chemin: string;
      cahier: { nom: string } | null;
    } | null;
  }[];
};

const parOrdre = (a: { ordre: number }, b: { ordre: number }) =>
  a.ordre - b.ordre;

async function Contenu({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { personnes } = await searchParams;
  const membre = await membreConnecte();
  if (!membre) redirect("/connexion");

  const supabase = await creerClientServeur();
  const { data: r } = await supabase
    .from("recette")
    .select(
      "id, titre, statut, transmis_par, souvenir, portions, duree_minutes, classique, type_repas(nom), recette_occasion(occasion(nom)), groupe_ingredients(id, nom, ordre, ingredient(id, quantite, unite, nom, texte_origine, ordre)), etape(id, ordre, texte), note(id, texte, etape_id), recette_page(ordre, page_scannee(id, numero, image_chemin, cahier(nom))), photo(id, image_chemin, statut, validee_le, propose_par)",
    )
    .eq("id", Number(id))
    .maybeSingle<Ligne>();
  if (!r) notFound();
  const { data: listes } = await supabase
    .from("liste_perso")
    .select("type")
    .eq("recette_id", r.id)
    .eq("membre_id", membre.id);

  const pages = r.recette_page
    .sort(parOrdre)
    .flatMap((rp) => (rp.page_scannee ? [rp.page_scannee] : []));
  const photos = r.photo
    .filter((p) => p.statut === "validee")
    .sort(
      (a, b) =>
        (a.validee_le ?? "").localeCompare(b.validee_le ?? "") || a.id - b.id,
    );
  const enAttente = r.photo.filter(
    (p) => p.statut === "en_attente" && p.propose_par === membre.id,
  ).length;
  const urls = await urlsSignees([
    ...pages.map((p) => p.image_chemin),
    ...photos.map((p) => p.image_chemin),
  ]);
  const occasions = r.recette_occasion
    .flatMap((o) => (o.occasion ? [o.occasion.nom] : []))
    .sort((a, b) => a.localeCompare(b, "fr"));
  const notes = [...r.note].sort((a, b) => a.id - b.id);
  const notesRecette = notes.filter(
    (n) => n.etape_id === null || !r.etape.some((e) => e.id === n.etape_id),
  );
  const infos = [
    r.portions ? `Pour ${libellePersonnes(r.portions)}` : null,
    r.duree_minutes ? duree(r.duree_minutes) : null,
  ].filter(Boolean);

  return (
    <article className="flex flex-col gap-7 pb-20">
      <EnTete titre={r.titre} retour={{ href: "/", libelle: "Accueil" }} />

      {r.statut === "brouillon" ? (
        <p className="-mt-3 rounded-xl bg-ciel/15 px-4 py-3 text-sm">
          Brouillon : cette recette n’est pas encore publiée.
        </p>
      ) : null}

      {r.type_repas || occasions.length > 0 || r.classique ? (
        <ul
          className="-mt-3 flex flex-wrap gap-2 text-sm font-medium"
          aria-label="Tags"
        >
          {r.type_repas ? (
            <li className="flex items-center gap-1.5 rounded-full bg-ciel px-3 py-1">
              <IconeTypeRepas className="h-4 w-4" />
              {r.type_repas.nom}
            </li>
          ) : null}
          {occasions.map((o) => (
            <li
              key={o}
              className="flex items-center gap-1.5 rounded-full bg-jaune px-3 py-1"
            >
              <IconeOccasion className="h-4 w-4" />
              {o}
            </li>
          ))}
          {r.classique ? (
            <li className="rounded-full border border-ardoise/25 px-3 py-1">
              ★ Classique
            </li>
          ) : null}
        </ul>
      ) : null}

      {r.transmis_par || infos.length > 0 ? (
        <div className="-mt-2 flex flex-col gap-1">
          {r.transmis_par ? (
            <p className="text-taupe">Transmis par {r.transmis_par}</p>
          ) : null}
          {infos.length > 0 ? (
            <p className="text-sm text-taupe">{infos.join(" · ")}</p>
          ) : null}
        </div>
      ) : null}

      <BoutonsListes
        recetteId={r.id}
        membreId={membre.id}
        initiales={(listes ?? []).map((l) => l.type as "favori" | "a_cuisiner")}
      />

      {r.souvenir ? (
        <blockquote className="border-l-4 border-jaune pl-4 leading-relaxed whitespace-pre-line text-taupe italic">
          {r.souvenir}
        </blockquote>
      ) : null}

      <Photos
        recetteId={r.id}
        admin={membre.role === "admin"}
        enAttente={enAttente}
        photos={photos.map((p) => ({
          id: p.id,
          chemin: p.image_chemin,
          url: urls.get(p.image_chemin),
        }))}
      />

      {pages.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Scan d’origine</h2>
          {pages.map((p) => (
            <figure key={p.id} className="flex flex-col gap-1">
              <ScanZoomable
                url={urls.get(p.image_chemin)}
                alt={`Page ${p.numero} du cahier`}
                zones={[]}
              />
              <figcaption className="text-sm text-taupe">
                {p.cahier?.nom} · page {p.numero}
              </figcaption>
            </figure>
          ))}
        </section>
      ) : null}

      <Ingredients
        recetteId={r.id}
        titre={r.titre}
        portions={r.portions}
        personnesInitiales={personnesChoisies(personnes)}
        groupes={r.groupe_ingredients.sort(parOrdre).map((g) => ({
          id: g.id,
          nom: g.nom,
          ingredients: g.ingredient.sort(parOrdre),
        }))}
        avecEtapes={r.etape.length > 0}
      />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Étapes</h2>
        {r.etape.length === 0 ? (
          <p className="text-taupe">Aucune étape notée.</p>
        ) : null}
        <ol className="flex flex-col gap-4">
          {r.etape.sort(parOrdre).map((e, k) => (
            <li key={e.id} className="flex gap-3">
              <span className="w-6 shrink-0 text-right font-semibold">
                {k + 1}.
              </span>
              <div className="flex flex-col gap-1.5 leading-relaxed">
                <p>{e.texte}</p>
                {notes
                  .filter((n) => n.etape_id === e.id)
                  .map((n) => (
                    <p key={n.id} className="text-taupe italic">
                      {n.texte}
                    </p>
                  ))}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {notesRecette.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Notes</h2>
          {notesRecette.map((n) => (
            <p key={n.id} className="leading-relaxed text-taupe italic">
              {n.texte}
            </p>
          ))}
        </section>
      ) : null}

      {peutNumeriser(membre.role) ? (
        <div className="flex flex-col gap-2 border-t border-ardoise/10 pt-5 text-sm">
          <Link
            href={`/numeriser/relire/${r.id}`}
            className="self-start underline decoration-ciel decoration-2 underline-offset-4"
          >
            Corriger la recette
          </Link>
          <Link
            href={`/numeriser/relire/${r.id}/enrichir`}
            className="self-start underline decoration-ciel decoration-2 underline-offset-4"
          >
            Modifier les informations et les tags
          </Link>
        </div>
      ) : null}
    </article>
  );
}
