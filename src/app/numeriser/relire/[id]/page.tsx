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
  etape: { ordre: number; texte: string }[];
  note: { id: number; texte: string }[];
  recette_page: {
    ordre: number;
    page_scannee: {
      id: number;
      numero: number;
      image_chemin: string;
      lecture: { mots_douteux?: MotDouteux[] } | null;
      cahier: { nom: string } | null;
    } | null;
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
      "id, titre, statut, groupe_ingredients(nom, ordre, ingredient(quantite, unite, nom, texte_origine, ordre)), etape(ordre, texte), note(id, texte), recette_page(ordre, page_scannee(id, numero, image_chemin, lecture, cahier(nom)))",
    )
    .eq("id", Number(id))
    .maybeSingle<Ligne>();
  if (!recette) notFound();

  const pages = recette.recette_page
    .sort(parOrdre)
    .flatMap((rp) => (rp.page_scannee ? [rp.page_scannee] : []));
  const urls = await urlsSignees(pages.map((p) => p.image_chemin));
  const scans: ScanARelire[] = pages.map((p) => ({
    id: p.id,
    numero: p.numero,
    cahier: p.cahier?.nom ?? "",
    url: urls.get(p.image_chemin),
    motsDouteux: p.lecture?.mots_douteux ?? [],
  }));

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
    etapes: recette.etape.sort(parOrdre).map((e) => e.texte),
    notes: recette.note.sort((a, b) => a.id - b.id).map((n) => n.texte),
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
      />
    </>
  );
}
