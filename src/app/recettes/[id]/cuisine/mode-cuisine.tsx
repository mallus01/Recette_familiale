"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useEcranAllume } from "@/lib/ecran-allume";
import { mesurerAb } from "@/lib/mesurer-ab";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { personnes as libellePersonnes } from "@/lib/portions";

type Groupe = {
  id: number;
  nom: string | null;
  ingredients: { id: number; texte: string }[];
};
type Etape = {
  id: number;
  texte: string;
  notes: string[];
  ingredients: number[];
};

export function ModeCuisine({
  recetteId,
  membreId,
  titre,
  retour,
  personnes,
  groupes,
  etapes,
  notesRecette,
}: {
  recetteId: number;
  membreId: string;
  titre: string;
  retour: string;
  personnes: number | null;
  groupes: Groupe[];
  etapes: Etape[];
  notesRecette: string[];
}) {
  useEcranAllume();
  const router = useRouter();
  const [fin, setFin] = useState(false);
  const [courante, setCourante] = useState(0);
  const total = etapes.length;
  const derniere = courante >= total - 1;
  const refsEtapes = useRef<(HTMLLIElement | null)[]>([]);
  const debutSwipe = useRef<{ x: number; y: number } | null>(null);
  const refBandeau = useRef<HTMLUListElement | null>(null);

  // US-35 : ingrédients de l'étape en cours, placés en tête du bandeau.
  // US-36 : ingrédients des étapes passées barrés, sauf s'ils resservent maintenant.
  const maintenant = new Set(etapes[courante]?.ingredients ?? []);
  const passes = new Set(
    etapes.slice(0, courante).flatMap((e) => e.ingredients),
  );
  const tous = groupes.flatMap((g) => g.ingredients);
  const enCours = tous.filter((i) => maintenant.has(i.id));

  const aller = (sens: 1 | -1) =>
    setCourante((c) => Math.min(Math.max(c + sens, 0), Math.max(total - 1, 0)));

  // US-21 : flèches du clavier sur ordinateur.
  useEffect(() => {
    function auClavier(e: KeyboardEvent) {
      const sens = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (sens)
        setCourante((c) =>
          Math.min(Math.max(c + sens, 0), Math.max(total - 1, 0)),
        );
    }
    window.addEventListener("keydown", auClavier);
    return () => window.removeEventListener("keydown", auClavier);
  }, [total]);

  useEffect(() => {
    refBandeau.current?.scrollTo({ left: 0, behavior: "smooth" });
    refsEtapes.current[courante]?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [courante]);

  // US-29 : passer la dernière étape retire la recette de À cuisiner, puis ramène à la
  // fiche ; le prochain passage en mode cuisine repart de l'étape 1.
  async function terminer() {
    setFin(true);
    const { data: retirees } = await creerClientNavigateur()
      .from("liste_perso")
      .delete()
      .eq("membre_id", membreId)
      .eq("recette_id", recetteId)
      .eq("type", "a_cuisiner")
      .select("recette_id");
    // V3 (US-49) : une recette de À cuisiner cuisinée jusqu'au bout.
    if (retirees?.length) mesurerAb("cuisinee");
    setCourante(0);
    setFin(false);
    router.push(retour);
  }

  // Swipe horizontal, uniquement sur la zone des étapes.
  function finSwipe(x: number, y: number) {
    const debut = debutSwipe.current;
    debutSwipe.current = null;
    if (!debut) return;
    const dx = x - debut.x;
    const dy = y - debut.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    aller(dx < 0 ? 1 : -1);
  }

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col md:max-w-6xl">
      <header className="flex flex-col gap-3 border-b border-ardoise/10 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center gap-3">
          <Link
            href={retour}
            aria-label="Quitter le mode cuisine"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ardoise/25 text-2xl leading-none"
          >
            ×
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{titre}</p>
            {personnes ? (
              <p className="text-sm text-taupe">
                Pour {libellePersonnes(personnes)}
              </p>
            ) : null}
          </div>
        </div>

        {total > 0 ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium" aria-live="polite">
              Étape {courante + 1} sur {total}
            </p>
            <div
              role="progressbar"
              aria-label="Progression"
              aria-valuemin={1}
              aria-valuemax={total}
              aria-valuenow={courante + 1}
              className="h-2 overflow-hidden rounded-full bg-ardoise/10"
            >
              <div
                className="h-full rounded-full bg-peche transition-[width] duration-300"
                style={{ width: `${((courante + 1) / total) * 100}%` }}
              />
            </div>
          </div>
        ) : null}

        {groupes.some((g) => g.ingredients.length > 0) ? (
          <ul
            ref={refBandeau}
            aria-label="Ingrédients"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-sm md:hidden"
          >
            {enCours.map((i) => (
              <li
                key={`c${i.id}`}
                data-etat="en-cours"
                className="shrink-0 rounded-full bg-peche px-3 py-1.5 font-medium whitespace-nowrap"
              >
                {i.texte}
              </li>
            ))}
            {groupes.flatMap((g) => {
              const restants = g.ingredients.filter(
                (i) => !maintenant.has(i.id),
              );
              if (restants.length === 0) return [];
              return [
                ...(g.nom
                  ? [
                      <li
                        key={`g${g.id}`}
                        className="shrink-0 self-center font-medium text-taupe"
                      >
                        {g.nom}
                      </li>,
                    ]
                  : []),
                ...restants.map((i) =>
                  passes.has(i.id) ? (
                    <li
                      key={i.id}
                      data-etat="utilise"
                      className="shrink-0 rounded-full bg-ardoise/5 px-3 py-1.5 whitespace-nowrap text-ardoise/50 line-through"
                    >
                      <span className="sr-only">Déjà utilisé : </span>
                      {i.texte}
                    </li>
                  ) : (
                    <li
                      key={i.id}
                      className="shrink-0 rounded-full bg-jaune/40 px-3 py-1.5 whitespace-nowrap"
                    >
                      {i.texte}
                    </li>
                  ),
                ),
              ];
            })}
          </ul>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1">
        {/* US-45 : sur grand écran, ingrédients dans une colonne fixe à gauche. */}
        {groupes.some((g) => g.ingredients.length > 0) ? (
          <aside
            aria-label="Ingrédients de la recette"
            className="hidden w-80 shrink-0 flex-col gap-5 overflow-y-auto border-r border-ardoise/10 px-5 py-6 md:flex"
          >
            {groupes.map((g) =>
              g.ingredients.length === 0 ? null : (
                <div key={g.id} className="flex flex-col gap-2">
                  <h2 className="font-semibold">{g.nom ?? "Ingrédients"}</h2>
                  <ul className="flex flex-col gap-1.5">
                    {g.ingredients.map((i) => (
                      <li
                        key={i.id}
                        data-etat={
                          maintenant.has(i.id)
                            ? "en-cours"
                            : passes.has(i.id)
                              ? "utilise"
                              : undefined
                        }
                        className={`rounded-xl px-3 py-2 ${
                          maintenant.has(i.id)
                            ? "bg-peche font-medium"
                            : passes.has(i.id)
                              ? "text-ardoise/50 line-through"
                              : "bg-jaune/30"
                        }`}
                      >
                        {passes.has(i.id) && !maintenant.has(i.id) ? (
                          <span className="sr-only">Déjà utilisé : </span>
                        ) : null}
                        {i.texte}
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )}
          </aside>
        ) : null}
        <div
          data-zone="etapes"
          className="flex-1 overflow-y-auto px-5 py-6 md:px-10 md:py-8"
          onTouchStart={(e) =>
            (debutSwipe.current = {
              x: e.touches[0].clientX,
              y: e.touches[0].clientY,
            })
          }
          onTouchEnd={(e) =>
            finSwipe(e.changedTouches[0].clientX, e.changedTouches[0].clientY)
          }
        >
          {total === 0 ? (
            <p className="text-taupe">Aucune étape notée.</p>
          ) : null}
          <ol className="flex flex-col gap-6">
            {etapes.map((e, k) => (
              <li
                key={e.id}
                ref={(el) => {
                  refsEtapes.current[k] = el;
                }}
                aria-current={k === courante ? "step" : undefined}
                onClick={() => setCourante(k)}
                className={`flex gap-3 text-xl leading-relaxed transition-colors ${
                  k === courante ? "font-semibold" : "text-ardoise/40"
                }`}
              >
                <span className="w-7 shrink-0 text-right">{k + 1}.</span>
                <div className="flex flex-col gap-2">
                  <p>{e.texte}</p>
                  {e.notes.map((n, j) => (
                    <p
                      key={j}
                      className={`text-lg font-normal italic ${
                        k === courante ? "text-taupe" : ""
                      }`}
                    >
                      {n}
                    </p>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          {notesRecette.length > 0 ? (
            <div className="mt-8 flex flex-col gap-2 border-t border-ardoise/10 pt-5">
              <h2 className="font-semibold">Notes</h2>
              {notesRecette.map((n, j) => (
                <p
                  key={j}
                  className="text-lg leading-relaxed text-taupe italic"
                >
                  {n}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {total > 0 ? (
        <nav className="flex gap-3 border-t border-ardoise/10 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => aller(-1)}
            disabled={courante === 0}
            className="flex-1 rounded-full border border-ardoise/25 py-4 font-medium disabled:opacity-40"
          >
            Précédent
          </button>
          {derniere ? (
            <button
              type="button"
              disabled={fin}
              onClick={terminer}
              className="flex-[2] rounded-full bg-ardoise py-4 font-semibold text-white disabled:opacity-60"
            >
              Terminer
            </button>
          ) : (
            <button
              type="button"
              onClick={() => aller(1)}
              className="flex-[2] rounded-full bg-ardoise py-4 font-semibold text-white"
            >
              Suivant
            </button>
          )}
        </nav>
      ) : null}
    </div>
  );
}
