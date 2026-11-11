"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { creerClientNavigateur } from "@/lib/supabase/client";
import {
  LIBELLES_VARIANTE,
  TEST_CARTES,
  type VarianteCartes,
} from "@/lib/test-ab";

export type Resultat = {
  variante: VarianteCartes;
  membres: number;
  jours_vus: number;
  ouvertures: number;
  cuisinees: number;
};

// En dessous, l'écart entre les variantes tient surtout du hasard.
const JOURS_CONSEILLES = 20;

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const parJour = (n: number, jours: number) =>
  jours === 0
    ? "–"
    : (n / jours).toLocaleString("fr-FR", { maximumFractionDigits: 2 });

export function Pilotage({
  statut,
  gagnante,
  commenceLe,
  termineLe,
  maVariante,
  resultats,
}: {
  statut: "en_cours" | "termine";
  gagnante: VarianteCartes | null;
  commenceLe: string;
  termineLe: string | null;
  maVariante: VarianteCartes | null;
  resultats: Resultat[];
}) {
  const router = useRouter();
  const [occupe, setOccupe] = useState(false);
  const [aConfirmer, setAConfirmer] = useState<VarianteCartes | null>(null);
  const [message, setMessage] = useState<{
    texte: string;
    erreur: boolean;
  } | null>(null);
  const enCours = statut === "en_cours";
  const peuDeDonnees = resultats.some((r) => r.jours_vus < JOURS_CONSEILLES);

  async function appeler(
    fonction: "changer_variante_ab" | "conclure_test_ab",
    variante: VarianteCartes | null,
    reussite: string,
  ) {
    setOccupe(true);
    setMessage(null);
    const supabase = creerClientNavigateur();
    const { error } =
      fonction === "changer_variante_ab"
        ? await supabase.rpc(fonction, {
            p_test: TEST_CARTES,
            p_variante: variante,
          })
        : await supabase.rpc(fonction, {
            p_test: TEST_CARTES,
            p_gagnante: variante,
          });
    setOccupe(false);
    setAConfirmer(null);
    setMessage(
      error
        ? { texte: "L’opération a échoué. Réessaie.", erreur: true }
        : { texte: reussite, erreur: false },
    );
    if (!error) router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      {message ? (
        <p
          role={message.erreur ? "alert" : "status"}
          className="rounded-xl bg-ciel/15 px-4 py-3 text-sm"
        >
          {message.texte}
        </p>
      ) : null}

      <section className="flex flex-col gap-2 leading-relaxed">
        <p>
          Chaque membre voit la rangée À cuisiner de l’accueil en cartes
          standard ou en grandes cartes, attribuées au hasard. On compte, pour
          chaque variante, les jours où la rangée a été vue, les recettes
          ouvertes depuis elle et les recettes de la liste cuisinées jusqu’au
          bout.
        </p>
        <p className="text-sm text-taupe">
          {enCours
            ? `Test en cours depuis le ${date(commenceLe)}.`
            : `Test terminé le ${date(termineLe ?? commenceLe)} : ${
                gagnante ? LIBELLES_VARIANTE[gagnante].toLowerCase() : ""
              } pour tout le monde.`}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Résultats</h2>
        <ul className="flex flex-col gap-4 md:grid md:grid-cols-2">
          {resultats.map((r) => (
            <li
              key={r.variante}
              data-variante={r.variante}
              className="flex flex-col gap-3 rounded-2xl border border-ardoise/15 p-5"
            >
              <h3 className="font-semibold">
                {LIBELLES_VARIANTE[r.variante]}
                {!enCours && gagnante === r.variante ? (
                  <span className="ml-2 rounded-full bg-jaune px-2 py-0.5 text-sm font-medium">
                    Retenue
                  </span>
                ) : null}
              </h3>
              <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
                <dt className="text-taupe">Membres</dt>
                <dd className="text-right font-medium">{r.membres}</dd>
                <dt className="text-taupe">Jours où la rangée a été vue</dt>
                <dd className="text-right font-medium">{r.jours_vus}</dd>
                <dt className="text-taupe">Recettes ouvertes</dt>
                <dd className="text-right font-medium">{r.ouvertures}</dd>
                <dt className="text-taupe">Recettes cuisinées jusqu’au bout</dt>
                <dd className="text-right font-medium">{r.cuisinees}</dd>
                <dt className="text-taupe">Ouvertures par jour vu</dt>
                <dd className="text-right font-semibold">
                  {parJour(r.ouvertures, r.jours_vus)}
                </dd>
              </dl>
            </li>
          ))}
        </ul>
        {enCours && peuDeDonnees ? (
          <p className="text-sm leading-relaxed text-taupe">
            Encore peu de données : attends au moins {JOURS_CONSEILLES} jours
            vus par variante avant de conclure.
          </p>
        ) : null}
      </section>

      {enCours ? (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Ma variante</h2>
            <p className="text-sm leading-relaxed text-taupe">
              Pour essayer l’autre affichage sur ton accueil. Tes visites
              comptent alors pour la variante choisie.
            </p>
            <div role="group" aria-label="Ma variante" className="flex gap-2">
              {(["standard", "grandes"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={maVariante === v}
                  disabled={occupe || maVariante === v}
                  onClick={() =>
                    appeler(
                      "changer_variante_ab",
                      v,
                      `Ton accueil affiche maintenant les ${LIBELLES_VARIANTE[v].toLowerCase()}.`,
                    )
                  }
                  className="rounded-full border border-ardoise/25 px-4 py-2 text-sm font-medium aria-pressed:border-ardoise aria-pressed:bg-ardoise aria-pressed:text-white disabled:cursor-default"
                >
                  {LIBELLES_VARIANTE[v]}
                </button>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Terminer le test</h2>
            <p className="text-sm leading-relaxed text-taupe">
              La variante retenue s’affiche ensuite pour tout le monde. Les
              mesures déjà prises sont gardées.
            </p>
            {aConfirmer ? (
              <div className="flex flex-col gap-3 rounded-2xl bg-ciel/15 p-4">
                <p className="text-sm">
                  Retenir les {LIBELLES_VARIANTE[aConfirmer].toLowerCase()} pour
                  tout le monde ?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={occupe}
                    onClick={() => setAConfirmer(null)}
                    className="flex-1 rounded-full border border-ardoise/25 py-2.5 text-sm font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={occupe}
                    onClick={() =>
                      appeler(
                        "conclure_test_ab",
                        aConfirmer,
                        `Test terminé : ${LIBELLES_VARIANTE[aConfirmer].toLowerCase()} pour tout le monde.`,
                      )
                    }
                    className="flex-1 rounded-full bg-ardoise py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Terminer
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 md:flex-row">
                {(["standard", "grandes"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAConfirmer(v)}
                    className="rounded-full border border-ardoise/25 px-4 py-2.5 text-sm font-medium"
                  >
                    Retenir les {LIBELLES_VARIANTE[v].toLowerCase()}
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Reprendre le test</h2>
          <p className="text-sm leading-relaxed text-taupe">
            Chacun retrouve sa variante et les mesures reprennent.
          </p>
          <button
            type="button"
            disabled={occupe}
            onClick={() =>
              appeler("conclure_test_ab", null, "Le test a repris.")
            }
            className="self-start rounded-full border border-ardoise/25 px-4 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            Reprendre le test
          </button>
        </section>
      )}
    </div>
  );
}
