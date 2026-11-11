import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { membreConnecte } from "@/lib/membre";
import { ingredientsParEtape } from "@/lib/ingredients-etapes";
import { libelleAdapte, personnesChoisies } from "@/lib/portions";
import { creerClientServeur } from "@/lib/supabase/serveur";
import { ModeCuisine } from "./mode-cuisine";

export const metadata: Metadata = {
  title: "Mode cuisine · Recettes familiales",
};

// US-19 à US-23 : suivre la recette étape par étape pendant qu'on cuisine.
export default function PageModeCuisine({
  params,
  searchParams,
}: PageProps<"/recettes/[id]/cuisine">) {
  return (
    <Suspense fallback={<p className="p-6 text-taupe">Chargement…</p>}>
      <Contenu params={params} searchParams={searchParams} />
    </Suspense>
  );
}

type Ligne = {
  id: number;
  titre: string;
  portions: number | null;
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
      "id, titre, portions, groupe_ingredients(id, nom, ordre, ingredient(id, quantite, unite, nom, texte_origine, ordre)), etape(id, ordre, texte), note(id, texte, etape_id)",
    )
    .eq("id", Number(id))
    .maybeSingle<Ligne>();
  if (!r) notFound();

  // Le nombre de personnes choisi sur la fiche est conservé ; il ne se règle pas ici.
  const nb = r.portions ? (personnesChoisies(personnes) ?? r.portions) : null;
  const facteur = r.portions && nb ? nb / r.portions : 1;
  const notes = [...r.note].sort((a, b) => a.id - b.id);
  const etapes = r.etape.sort(parOrdre);
  const groupes = r.groupe_ingredients.sort(parOrdre);
  groupes.forEach((g) => g.ingredient.sort(parOrdre));
  // US-35 et US-36 : ingrédients cités dans chaque étape.
  const utilises = ingredientsParEtape(
    groupes.flatMap((g) => g.ingredient),
    etapes.map((e) => e.texte),
  );

  return (
    <ModeCuisine
      recetteId={r.id}
      membreId={membre.id}
      titre={r.titre}
      retour={
        `/recettes/${r.id}` +
        (nb && nb !== r.portions ? `?personnes=${nb}` : "")
      }
      personnes={nb}
      groupes={groupes.map((g) => ({
        id: g.id,
        nom: g.nom,
        ingredients: g.ingredient.map((i) => ({
          id: i.id,
          texte: libelleAdapte(i, facteur),
        })),
      }))}
      etapes={etapes.map((e, k) => ({
        id: e.id,
        texte: e.texte,
        ingredients: utilises[k],
        notes: notes.filter((n) => n.etape_id === e.id).map((n) => n.texte),
      }))}
      notesRecette={notes
        .filter((n) => !etapes.some((e) => e.id === n.etape_id))
        .map((n) => n.texte)}
    />
  );
}
