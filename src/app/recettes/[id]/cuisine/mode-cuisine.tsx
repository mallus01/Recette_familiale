"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useEcranAllume } from "@/lib/ecran-allume";
import { personnes as libellePersonnes } from "@/lib/portions";

type Groupe = {
  id: number;
  nom: string | null;
  ingredients: { id: number; texte: string }[];
};
type Etape = { id: number; texte: string; notes: string[] };

export function ModeCuisine({
  titre,
  retour,
  personnes,
  groupes,
  etapes,
  notesRecette,
}: {
  titre: string;
  retour: string;
  personnes: number | null;
  groupes: Groupe[];
  etapes: Etape[];
  notesRecette: string[];
}) {
  useEcranAllume();
  const [courante, setCourante] = useState(0);
  const total = etapes.length;
  const derniere = courante >= total - 1;
  const refsEtapes = useRef<(HTMLLIElement | null)[]>([]);
  const debutSwipe = useRef<{ x: number; y: number } | null>(null);

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
    refsEtapes.current[courante]?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, [courante]);

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
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col">
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
            aria-label="Ingrédients"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-sm"
          >
            {groupes.flatMap((g) => [
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
              ...g.ingredients.map((i) => (
                <li
                  key={i.id}
                  className="shrink-0 rounded-full bg-jaune/40 px-3 py-1.5 whitespace-nowrap"
                >
                  {i.texte}
                </li>
              )),
            ])}
          </ul>
        ) : null}
      </header>

      <div
        data-zone="etapes"
        className="flex-1 overflow-y-auto px-5 py-6"
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
        {total === 0 ? <p className="text-taupe">Aucune étape notée.</p> : null}
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
              <p key={j} className="text-lg leading-relaxed text-taupe italic">
                {n}
              </p>
            ))}
          </div>
        ) : null}
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
            <Link
              href={retour}
              className="flex-[2] rounded-full bg-ardoise py-4 text-center font-semibold text-white"
            >
              Terminer
            </Link>
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
