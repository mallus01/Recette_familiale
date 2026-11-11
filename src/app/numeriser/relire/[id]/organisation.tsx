"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { creerClientNavigateur } from "@/lib/supabase/client";
import type { RecetteARelire } from "./relecture";

export type Voisines = {
  // US-41 : autres recettes lues sur la même page.
  memePage: { id: number; titre: string }[];
  // Première recette de la page suivante du cahier, et si l'IA pense qu'elles se suivent.
  suivante: { id: number; titre: string; numero: number } | null;
  continuation: boolean;
};

type Contenu = Omit<RecetteARelire, "id">;

// Découpe une recette avant l'étape k (0 = première) et, si j n'est pas null, avant le
// j-ième ingrédient (en comptant tous les groupes). Les notes suivent leur étape ; les
// notes de toute la recette restent au début.
export function decouper(
  r: RecetteARelire,
  k: number,
  j: number | null,
  titreSuite: string,
): { avant: Contenu; apres: Contenu } {
  let n = 0;
  const groupesAvant: Contenu["groupes"] = [];
  const groupesApres: Contenu["groupes"] = [];
  for (const g of r.groupes) {
    const avant = [];
    const apres = [];
    for (const i of g.ingredients) {
      if (j !== null && n >= j) apres.push(i);
      else avant.push(i);
      n++;
    }
    if (avant.length > 0 || apres.length === 0)
      groupesAvant.push({ ...g, ingredients: avant });
    if (apres.length > 0) groupesApres.push({ ...g, ingredients: apres });
  }
  return {
    avant: {
      titre: r.titre,
      groupes: groupesAvant,
      etapes: r.etapes.slice(0, k),
      notes: r.notes.filter((x) => x.etape === null || x.etape <= k),
    },
    apres: {
      titre: titreSuite.trim() || "Recette sans titre",
      groupes: groupesApres,
      etapes: r.etapes.slice(k),
      notes: r.notes
        .filter((x) => x.etape !== null && x.etape > k)
        .map((x) => ({ ...x, etape: (x.etape as number) - k })),
    },
  };
}

// US-41 à US-43 : recettes de la même page, séparation et fusion avec la page suivante.
export function Organisation({
  recette,
  voisines,
  avantAction,
  enJson,
  onSeparee,
}: {
  recette: RecetteARelire;
  voisines: Voisines;
  avantAction: () => Promise<boolean>;
  enJson: (c: Contenu) => object;
  onSeparee: (avant: RecetteARelire) => void;
}) {
  const router = useRouter();
  const [panneau, setPanneau] = useState<"separer" | "fusionner" | null>(null);
  const [etape, setEtape] = useState(1);
  const [ingredient, setIngredient] = useState<number | null>(null);
  const [titre, setTitre] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{
    texte: string;
    lien?: string;
    erreur?: boolean;
  } | null>(null);
  const ingredients = recette.groupes.flatMap((g) => g.ingredients);
  const { suivante } = voisines;

  async function separer() {
    setEnCours(true);
    setMessage(null);
    const { avant, apres } = decouper(recette, etape, ingredient, titre);
    const { data, error } = await creerClientNavigateur().rpc(
      "separer_recette",
      {
        p_recette_id: recette.id,
        p_avant: enJson(avant),
        p_apres: enJson(apres),
      },
    );
    setEnCours(false);
    if (error) {
      setMessage({ texte: "La séparation a échoué. Réessayez.", erreur: true });
      return;
    }
    onSeparee({ ...avant, id: recette.id });
    setPanneau(null);
    setTitre("");
    setMessage({
      texte: `Nouvelle recette créée : « ${apres.titre} ».`,
      lien: `/numeriser/relire/${data}`,
    });
    router.refresh();
  }

  async function fusionner() {
    if (!suivante) return;
    setEnCours(true);
    setMessage(null);
    if (!(await avantAction())) return setEnCours(false);
    const { error } = await creerClientNavigateur().rpc("fusionner_recettes", {
      p_recette_id: recette.id,
      p_suivante_id: suivante.id,
    });
    setEnCours(false);
    if (error) {
      setMessage({ texte: "La fusion a échoué. Réessayez.", erreur: true });
      return;
    }
    setPanneau(null);
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3 border-t border-ardoise/10 pt-5">
      <h2 className="font-semibold">Pages et recettes</h2>

      {voisines.memePage.length > 0 ? (
        <div className="rounded-xl bg-ciel/15 px-4 py-3 text-sm leading-relaxed">
          <p>
            L’IA a trouvé d’autres recettes sur cette page, chacune se relit à
            part :
          </p>
          <ul className="mt-1 flex flex-col gap-1">
            {voisines.memePage.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/numeriser/relire/${r.id}`}
                  className="font-medium underline decoration-ciel decoration-2 underline-offset-4"
                >
                  {r.titre}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {suivante && voisines.continuation && panneau !== "fusionner" ? (
        <div className="flex flex-col gap-2 rounded-xl bg-ciel/15 px-4 py-3 text-sm leading-relaxed">
          <p>
            {`Cette recette semble continuer page ${suivante.numero} (« ${suivante.titre} »).`}
          </p>
          <button
            type="button"
            onClick={() => setPanneau("fusionner")}
            className="self-start font-semibold underline underline-offset-4"
          >
            Fusionner avec la page suivante
          </button>
        </div>
      ) : null}

      {panneau === "fusionner" && suivante ? (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-xl border border-peche bg-peche/15 p-3 text-sm"
        >
          <p>
            Ajouter « {suivante.titre} » (page {suivante.numero}) à la suite de
            cette recette ? Ses ingrédients, étapes et notes passent ici, avec
            son scan, et elle disparaît de la liste.
          </p>
          <div className="flex gap-4">
            <button
              type="button"
              disabled={enCours}
              onClick={fusionner}
              className="font-semibold underline underline-offset-4"
            >
              {enCours ? "Fusion…" : "Fusionner"}
            </button>
            <button type="button" onClick={() => setPanneau(null)}>
              Annuler
            </button>
          </div>
        </div>
      ) : null}

      {panneau === "separer" ? (
        <div className="flex flex-col gap-3 rounded-xl border border-ardoise/15 p-4 text-sm">
          <p>
            La fin de la recette devient une nouvelle recette, liée à la même
            page. Les corrections en cours sont gardées.
          </p>
          <label className="flex flex-col gap-1">
            <span className="font-medium">Nouvelle recette à partir de</span>
            <select
              value={etape}
              onChange={(e) => setEtape(Number(e.target.value))}
              className="rounded-lg border border-ardoise/25 bg-white px-3 py-2"
            >
              {recette.etapes.map((t, k) =>
                k === 0 ? null : (
                  <option key={k} value={k}>
                    Étape {k + 1} : {t.slice(0, 40)}
                  </option>
                ),
              )}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium">Ingrédients emportés</span>
            <select
              value={ingredient ?? ""}
              onChange={(e) =>
                setIngredient(
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
              className="rounded-lg border border-ardoise/25 bg-white px-3 py-2"
            >
              <option value="">Aucun</option>
              {ingredients.map((i, n) => (
                <option key={n} value={n}>
                  À partir de : {i.texte_origine || i.nom}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium">Titre de la nouvelle recette</span>
            <input
              value={titre}
              maxLength={120}
              onChange={(e) => setTitre(e.target.value)}
              className="rounded-lg border border-ardoise/25 px-3 py-2"
            />
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPanneau(null)}
              className="flex-1 rounded-xl border border-ardoise/25 py-3 font-medium"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={enCours || !titre.trim()}
              onClick={separer}
              className="flex-[2] rounded-xl bg-ardoise py-3 font-semibold text-white disabled:opacity-60"
            >
              {enCours ? "Séparation…" : "Séparer"}
            </button>
          </div>
        </div>
      ) : null}

      {panneau === null ? (
        <div className="flex flex-col gap-2 text-sm">
          {recette.etapes.length > 1 ? (
            <button
              type="button"
              onClick={() => {
                setEtape(1);
                setPanneau("separer");
              }}
              className="self-start font-medium underline decoration-ciel decoration-2 underline-offset-4"
            >
              Séparer en deux recettes
            </button>
          ) : null}
          {suivante && !voisines.continuation ? (
            <button
              type="button"
              onClick={() => setPanneau("fusionner")}
              className="self-start font-medium underline decoration-ciel decoration-2 underline-offset-4"
            >
              Fusionner avec la page suivante
            </button>
          ) : null}
        </div>
      ) : null}

      {message ? (
        <p
          role={message.erreur ? "alert" : "status"}
          className="text-sm leading-relaxed"
        >
          {message.texte}{" "}
          {message.lien ? (
            <Link
              href={message.lien}
              className="font-medium underline decoration-ciel decoration-2 underline-offset-4"
            >
              La relire
            </Link>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
