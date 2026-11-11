"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { equivalence, quantiteModerne } from "@/lib/mesures";
import {
  libelleAdapte,
  personnes as libellePersonnes,
  texteCourses,
  type IngredientQuantifie,
} from "@/lib/portions";

export type GroupeFiche = {
  id: number;
  nom: string | null;
  ingredients: (IngredientQuantifie & { id: number })[];
};

// US-24 et US-25 : nombre de personnes, ingrédients adaptés, copie pour les courses
// et lancement du mode cuisine (US-19), qui garde le nombre de personnes choisi.
export function Ingredients({
  recetteId,
  titre,
  portions,
  personnesInitiales,
  groupes,
  avecEtapes,
}: {
  recetteId: number;
  titre: string;
  portions: number | null;
  personnesInitiales: number | null;
  groupes: GroupeFiche[];
  avecEtapes: boolean;
}) {
  const [nb, setNb] = useState(personnesInitiales ?? portions);
  const [copie, setCopie] = useState<"ok" | "erreur" | null>(null);
  const facteur = portions && nb ? nb / portions : 1;

  // La valeur suit l'adresse de la page, pour la retrouver au retour du mode cuisine.
  useEffect(() => {
    if (!portions || !nb) return;
    const url = new URL(window.location.href);
    if (nb === portions) url.searchParams.delete("personnes");
    else url.searchParams.set("personnes", String(nb));
    window.history.replaceState(null, "", url);
  }, [nb, portions]);

  useEffect(() => {
    if (!copie) return;
    const minuteur = setTimeout(() => setCopie(null), 2500);
    return () => clearTimeout(minuteur);
  }, [copie]);

  async function copier() {
    const texte = texteCourses(
      titre,
      portions ? nb : null,
      groupes.flatMap((g) => g.ingredients),
      facteur,
    );
    try {
      await navigator.clipboard.writeText(texte);
      setCopie("ok");
    } catch {
      setCopie("erreur");
    }
  }

  const cuisine =
    `/recettes/${recetteId}/cuisine` +
    (portions && nb && nb !== portions ? `?personnes=${nb}` : "");

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Ingrédients</h2>
        {groupes.length > 0 ? (
          <button
            type="button"
            onClick={copier}
            className="rounded-full border border-ardoise/25 px-4 py-1.5 text-sm font-medium"
          >
            {copie === "ok" ? "Copié" : "Copier"}
          </button>
        ) : null}
      </div>
      <p role="status" className="sr-only">
        {copie === "ok" ? "Ingrédients copiés" : ""}
      </p>
      {copie === "erreur" ? (
        <p className="-mt-2 text-sm">
          La copie n’a pas marché sur cet appareil.
        </p>
      ) : null}

      {portions && nb ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Une personne de moins"
            disabled={nb <= 1}
            onClick={() => setNb(nb - 1)}
            className="h-11 w-11 rounded-full border border-ardoise/25 text-xl disabled:opacity-40"
          >
            −
          </button>
          <p className="min-w-28 text-center font-medium" aria-live="polite">
            {libellePersonnes(nb)}
          </p>
          <button
            type="button"
            aria-label="Une personne de plus"
            disabled={nb >= 50}
            onClick={() => setNb(nb + 1)}
            className="h-11 w-11 rounded-full border border-ardoise/25 text-xl disabled:opacity-40"
          >
            +
          </button>
          {nb !== portions ? (
            <button
              type="button"
              onClick={() => setNb(portions)}
              className="text-sm text-taupe underline underline-offset-4"
            >
              Revenir à {portions}
            </button>
          ) : null}
        </div>
      ) : null}

      {groupes.length === 0 ? (
        <p className="text-taupe">Aucun ingrédient noté.</p>
      ) : null}
      {groupes.map((g) => (
        <div key={g.id} className="flex flex-col gap-2">
          {g.nom ? <h3 className="font-medium">{g.nom}</h3> : null}
          <ul className="flex flex-col gap-2">
            {g.ingredients.map((i) => (
              <li key={i.id} className="flex items-baseline gap-3">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 shrink-0 translate-y-[-0.15rem] rounded-full bg-peche"
                />
                <LigneIngredient ingredient={i} facteur={facteur} />
              </li>
            ))}
          </ul>
        </div>
      ))}

      {avecEtapes ? (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-ardoise/10 bg-white/95 px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <Link
            href={cuisine}
            className="mx-auto block w-full max-w-md rounded-full bg-ardoise py-3.5 text-center font-semibold text-white"
          >
            Lancer le mode cuisine
          </Link>
        </div>
      ) : null}
    </section>
  );
}

// Quantité d'origine telle qu'écrite (avec son équivalence moderne) ; adaptée au
// nombre de personnes dès qu'il change.
function LigneIngredient({
  ingredient: i,
  facteur,
}: {
  ingredient: IngredientQuantifie;
  facteur: number;
}) {
  if (facteur !== 1 && i.quantite !== null) {
    return <span>{libelleAdapte(i, facteur)}</span>;
  }
  const texte =
    i.texte_origine ||
    [quantiteModerne(i.quantite, i.unite), i.nom].filter(Boolean).join(" ");
  const moderne = equivalence(i.texte_origine, i.quantite, i.unite);
  return (
    <span>
      {texte}
      {moderne ? <span className="text-taupe"> · {moderne}</span> : null}
    </span>
  );
}
