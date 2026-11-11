import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  EnTete,
  Page,
  ReserveAuxContributeurs,
} from "@/components/mise-en-page";
import type { MotDouteux } from "@/lib/lecture/resultat";
import { membreConnecte, peutNumeriser } from "@/lib/membre";
import { urlsSignees } from "@/lib/supabase/images";
import { creerClientServeur } from "@/lib/supabase/serveur";
import type { Voisines } from "./organisation";
import { Relecture, type RecetteARelire, type ScanARelire } from "./relecture";

export const metadata: Metadata = { title: "Relecture · Recettes familiales" };

// US-12 : relire une recette lue par l'IA face au scan de sa page.
export default function PageRelecture({
  params,
}: PageProps<"/numeriser/relire/[id]">) {
  return (
    <Page>
      <Suspense fallback={<p className="text-taupe">Chargement…</p>}>
        <Contenu params={params} />
      </Suspense>
    </Page>
  );
}

type Ligne = {
  id: number;
  titre: string;
  statut: string;
  groupe_ingredients: {
    nom: string | null;
    ordre: number;
    ingredient: {
      quantite: number | null;
      unite: string | null;
      nom: string;
      texte_origine: string | null;
      ordre: number;
    }[];
  }[];
  etape: { id: number; ordre: number; texte: string }[];
  note: {
    id: number;
    texte: string;
    etape_id: number | null;
    origine: "cahier" | "membre";
  }[];
  recette_page: {
    ordre: number;
    page_scannee: {
      id: number;
      numero: number;
      cahier_id: number;
      image_chemin: string;
      lecture: LectureEnregistree | null;
      cahier: { nom: string } | null;
    } | null;
  }[];
};

type LectureEnregistree = {
  mots_douteux?: MotDouteux[];
  recettes?: {
    commence_page_precedente?: boolean;
    continue_page_suivante?: boolean;
  }[];
};

const parOrdre = (a: { ordre: number }, b: { ordre: number }) =>
  a.ordre - b.ordre;

async function Contenu({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const membre = await membreConnecte();
  if (!peutNumeriser(membre?.role)) return <ReserveAuxContributeurs />;

  const supabase = await creerClientServeur();
  const { data: recette } = await supabase
    .from("recette")
    .select(
      "id, titre, statut, groupe_ingredients(nom, ordre, ingredient(quantite, unite, nom, texte_origine, ordre)), etape(id, ordre, texte), note(id, texte, etape_id, origine), recette_page(ordre, page_scannee(id, numero, cahier_id, image_chemin, lecture, cahier(nom)))",
    )
    .eq("id", Number(id))
    .maybeSingle<Ligne>();
  if (!recette) notFound();

  const pages = recette.recette_page
    .sort(parOrdre)
    .flatMap((rp) => (rp.page_scannee ? [rp.page_scannee] : []));
  const urls = await urlsSignees(pages.map((p) => p.image_chemin));
  const voisines = await chercherVoisines(recette);
  const scans: ScanARelire[] = pages.map((p) => ({
    id: p.id,
    numero: p.numero,
    cahier: p.cahier?.nom ?? "",
    url: urls.get(p.image_chemin),
    motsDouteux: p.lecture?.mots_douteux ?? [],
  }));

  const etapes = recette.etape.sort(parOrdre);
  const contenu: RecetteARelire = {
    id: recette.id,
    titre: recette.titre,
    groupes: recette.groupe_ingredients.sort(parOrdre).map((g) => ({
      nom: g.nom ?? "",
      ingredients: g.ingredient.sort(parOrdre).map((i) => ({
        quantite:
          i.quantite === null ? "" : String(i.quantite).replace(".", ","),
        unite: i.unite ?? "",
        nom: i.nom,
        texte_origine: i.texte_origine ?? "",
      })),
    })),
    etapes: etapes.map((e) => e.texte),
    notes: recette.note
      .sort((a, b) => a.id - b.id)
      .map((n) => {
        const position = etapes.findIndex((e) => e.id === n.etape_id);
        return {
          texte: n.texte,
          etape: position >= 0 ? position + 1 : null,
          origine: n.origine,
        };
      }),
  };

  return (
    <>
      <EnTete
        titre="Relecture"
        retour={{ href: "/numeriser/a-relire", libelle: "À relire" }}
      />
      <Relecture
        recette={contenu}
        scans={scans}
        publiee={recette.statut === "publiee"}
        voisines={voisines}
        key={`${pages.length}-${recette.etape.length}`}
      />
    </>
  );
}

// US-41 et US-42 : recettes lues sur les mêmes pages, et première recette de la page
// suivante du cahier, avec l'avis de l'IA sur une recette qui continue.
async function chercherVoisines(recette: Ligne): Promise<Voisines> {
  const supabase = await creerClientServeur();
  const liens = recette.recette_page.filter((rp) => rp.page_scannee);
  if (liens.length === 0)
    return { memePage: [], suivante: null, continuation: false };
  const derniere = liens.reduce((a, b) =>
    b.page_scannee!.numero > a.page_scannee!.numero ? b : a,
  );
  const page = derniere.page_scannee!;

  const [{ data: memePage }, { data: pageSuivante }] = await Promise.all([
    supabase
      .from("recette_page")
      .select("recette(id, titre)")
      .in(
        "page_id",
        liens.map((rp) => rp.page_scannee!.id),
      )
      .neq("recette_id", recette.id)
      .returns<{ recette: { id: number; titre: string } | null }[]>(),
    supabase
      .from("page_scannee")
      .select("numero, lecture, recette_page(ordre, recette(id, titre))")
      .eq("cahier_id", page.cahier_id)
      .eq("numero", page.numero + 1)
      .maybeSingle<{
        numero: number;
        lecture: LectureEnregistree | null;
        recette_page: {
          ordre: number;
          recette: { id: number; titre: string } | null;
        }[];
      }>(),
  ]);

  const autres = new Map<number, string>();
  for (const l of memePage ?? [])
    if (l.recette) autres.set(l.recette.id, l.recette.titre);

  const premiere = (pageSuivante?.recette_page ?? [])
    .filter((rp) => rp.recette && rp.recette.id !== recette.id)
    .sort(parOrdre)[0];
  const suivante =
    premiere?.recette && pageSuivante
      ? {
          id: premiere.recette.id,
          titre: premiere.recette.titre,
          numero: pageSuivante.numero,
        }
      : null;
  // Les recettes d'une page sont rangées dans l'ordre de la lecture.
  const continuation = Boolean(
    suivante &&
    (page.lecture?.recettes?.[derniere.ordre - 1]?.continue_page_suivante ||
      pageSuivante?.lecture?.recettes?.[premiere.ordre - 1]
        ?.commence_page_precedente),
  );
  return {
    memePage: [...autres].map(([id, titre]) => ({ id, titre })),
    suivante,
    continuation,
  };
}
