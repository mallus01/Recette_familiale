"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { MotDouteux } from "@/lib/lecture/resultat";
import { contientDouteux, motifDouteux } from "@/lib/mots-douteux";
import { creerClientNavigateur } from "@/lib/supabase/client";
import { ChampSurligne } from "./champ-surligne";
import { Organisation, type Voisines } from "./organisation";
import { ScanZoomable } from "@/components/scan-zoomable";

export type IngredientARelire = {
  quantite: string;
  unite: string;
  nom: string;
  texte_origine: string;
};
// etape : numéro de l'étape que la note complète (1, 2…), ou null pour toute la recette.
export type NoteARelire = {
  texte: string;
  etape: number | null;
  origine: "cahier" | "membre";
};
export type RecetteARelire = {
  id: number;
  titre: string;
  groupes: { nom: string; ingredients: IngredientARelire[] }[];
  etapes: string[];
  notes: NoteARelire[];
};
export type ScanARelire = {
  id: number;
  numero: number;
  cahier: string;
  url?: string;
  motsDouteux: MotDouteux[];
};

const INGREDIENT_VIDE: IngredientARelire = {
  quantite: "",
  unite: "",
  nom: "",
  texte_origine: "",
};

// Contenu au format attendu par enregistrer_relecture (et separer_recette).
function enJson(r: Omit<RecetteARelire, "id">) {
  return {
    titre: r.titre,
    groupes: r.groupes.map((g) => ({
      nom: g.nom,
      ingredients: g.ingredients.map((i) => ({
        quantite: enNombre(i.quantite),
        unite: i.unite,
        nom: i.nom,
        texte_origine: i.texte_origine,
      })),
    })),
    etapes: r.etapes,
    notes: r.notes,
  };
}

// « 1,5 » ou « 1.5 » → 1.5 ; vide ou illisible → null.
function enNombre(s: string) {
  const n = Number(s.trim().replace(",", "."));
  return s.trim() === "" || !Number.isFinite(n) || n < 0 ? null : n;
}

export function Relecture({
  recette: initiale,
  scans,
  publiee,
  voisines,
}: {
  recette: RecetteARelire;
  scans: ScanARelire[];
  publiee: boolean;
  voisines: Voisines;
}) {
  const router = useRouter();
  const [recette, setRecette] = useState(initiale);
  const [scanVu, setScanVu] = useState(0);
  const [modifiee, setModifiee] = useState(false);
  const [suite, setSuite] = useState<"plus-tard" | "valider" | null>(null);
  const [etat, setEtat] = useState<
    "repos" | "enregistrement" | "enregistree" | "echec"
  >("repos");

  const tousLesMots = useMemo(
    () => [...new Set(scans.flatMap((s) => s.motsDouteux.map((m) => m.mot)))],
    [scans],
  );
  const motif = useMemo(() => motifDouteux(tousLesMots), [tousLesMots]);

  // Mots douteux encore présents dans la recette, à vérifier.
  const textes = [
    recette.titre,
    ...recette.groupes.flatMap((g) => [
      g.nom,
      ...g.ingredients.flatMap((i) => [i.nom, i.texte_origine]),
    ]),
    ...recette.etapes,
    ...recette.notes.map((n) => n.texte),
  ];
  const restants = tousLesMots.filter((mot) =>
    textes.some((t) => contientDouteux(t, motifDouteux([mot]))),
  );

  // Prévient avant de quitter avec des corrections non enregistrées.
  useEffect(() => {
    if (!modifiee) return;
    const avertir = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avertir);
    return () => window.removeEventListener("beforeunload", avertir);
  }, [modifiee]);

  function modifier(maj: (r: RecetteARelire) => RecetteARelire) {
    setRecette(maj);
    setModifiee(true);
    setEtat("repos");
  }
  const majGroupe = (
    gi: number,
    maj: Partial<RecetteARelire["groupes"][number]>,
  ) =>
    modifier((r) => ({
      ...r,
      groupes: r.groupes.map((g, k) => (k === gi ? { ...g, ...maj } : g)),
    }));
  const majNote = (ni: number, maj: Partial<NoteARelire>) =>
    modifier((r) => ({
      ...r,
      notes: r.notes.map((n, k) => (k === ni ? { ...n, ...maj } : n)),
    }));
  const majIngredient = (
    gi: number,
    ii: number,
    maj: Partial<IngredientARelire>,
  ) =>
    majGroupe(gi, {
      ingredients: recette.groupes[gi].ingredients.map((ing, k) =>
        k === ii ? { ...ing, ...maj } : ing,
      ),
    });

  async function enregistrer() {
    setEtat("enregistrement");
    const supabase = creerClientNavigateur();
    const { error } = await supabase.rpc("enregistrer_relecture", {
      p_recette_id: recette.id,
      p_recette: enJson(recette),
    });
    if (error) {
      setEtat("echec");
      return false;
    }
    setModifiee(false);
    setEtat("enregistree");
    return true;
  }

  // US-17 : Plus tard garde la recette dans la file ; Valider passe à l'enrichissement.
  // Dans les deux cas, les corrections en cours sont d'abord enregistrées.
  async function continuer(suite: "plus-tard" | "valider") {
    setSuite(suite);
    if (modifiee && !(await enregistrer())) return setSuite(null);
    router.push(
      suite === "valider"
        ? `/numeriser/relire/${recette.id}/enrichir`
        : "/numeriser/a-relire",
    );
    router.refresh();
  }

  const scan = scans[scanVu];
  // Sur le scan, seuls les mots encore à vérifier restent encadrés.
  const zones = (scan?.motsDouteux ?? []).flatMap((m) =>
    m.zone && restants.includes(m.mot) ? [m.zone] : [],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-10 -mx-6 flex flex-col gap-2 bg-white px-6 pt-2 pb-3">
        <ScanZoomable
          key={scan?.id}
          url={scan?.url}
          alt={scan ? `Scan de la page ${scan.numero}` : "Scan"}
          zones={zones}
        />
        <div className="flex items-center justify-between gap-3 text-sm text-taupe">
          <span className="truncate">
            {scan ? `${scan.cahier} · page ${scan.numero}` : "Aucune page liée"}
          </span>
          {scans.length > 1 ? (
            <span className="flex shrink-0 gap-3">
              {scans.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScanVu(i)}
                  aria-pressed={i === scanVu}
                  className={
                    i === scanVu
                      ? "font-semibold text-ardoise"
                      : "underline underline-offset-4"
                  }
                >
                  p. {s.numero}
                </button>
              ))}
            </span>
          ) : null}
        </div>
      </div>

      {publiee ? (
        <p className="rounded-xl bg-ciel/15 px-4 py-3 text-sm">
          Cette recette est déjà publiée.
        </p>
      ) : null}

      {restants.length > 0 ? (
        <p className="rounded-xl border border-peche bg-peche/15 px-4 py-3 text-sm leading-relaxed">
          {restants.length === 1
            ? "1 mot douteux à vérifier"
            : `${restants.length} mots douteux à vérifier`}{" "}
          : {restants.join(", ")}. Ils sont surlignés dans les champs
          {zones.length > 0 ? " et encadrés sur le scan" : ""}.
        </p>
      ) : null}

      <Section titre="Titre">
        <ChampSurligne
          libelle="Titre"
          valeur={recette.titre}
          motif={motif}
          onChange={(titre) => modifier((r) => ({ ...r, titre }))}
          className="text-lg font-semibold"
        />
      </Section>

      <Section titre="Ingrédients">
        {recette.groupes.map((g, gi) => (
          <div key={gi} className="flex flex-col gap-3">
            {recette.groupes.length > 1 || g.nom ? (
              <div className="flex items-start gap-2">
                <ChampSurligne
                  libelle={`Titre du groupe ${gi + 1}`}
                  placeholder="Titre du groupe (pour la pâte…)"
                  valeur={g.nom}
                  motif={motif}
                  onChange={(nom) => majGroupe(gi, { nom })}
                  className="flex-1 font-medium"
                />
                <BoutonRetirer
                  libelle={`Retirer le groupe ${gi + 1}`}
                  onClick={() =>
                    modifier((r) => ({
                      ...r,
                      groupes: r.groupes.filter((_, k) => k !== gi),
                    }))
                  }
                />
              </div>
            ) : null}
            <ul className="flex flex-col gap-3">
              {g.ingredients.map((ing, ii) => (
                <li
                  key={ii}
                  className="flex flex-col gap-2 rounded-xl border border-ardoise/15 p-3"
                >
                  <div className="flex items-start gap-2">
                    <ChampSurligne
                      libelle={`Ingrédient ${ii + 1}, tel qu’écrit`}
                      placeholder="Tel qu’écrit dans le cahier"
                      valeur={ing.texte_origine}
                      motif={motif}
                      onChange={(texte_origine) =>
                        majIngredient(gi, ii, { texte_origine })
                      }
                      className="flex-1"
                    />
                    <BoutonRetirer
                      libelle={`Retirer l’ingrédient ${ii + 1}`}
                      onClick={() =>
                        majGroupe(gi, {
                          ingredients: g.ingredients.filter((_, k) => k !== ii),
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-[4.5rem_4.5rem_1fr] gap-2">
                    <input
                      aria-label={`Quantité de l’ingrédient ${ii + 1}`}
                      placeholder="Qté"
                      inputMode="decimal"
                      value={ing.quantite}
                      onChange={(e) =>
                        majIngredient(gi, ii, { quantite: e.target.value })
                      }
                      className={`rounded-lg border px-3 py-2 ${
                        ing.quantite.trim() && enNombre(ing.quantite) === null
                          ? "border-peche"
                          : "border-ardoise/25"
                      }`}
                    />
                    <input
                      aria-label={`Unité de l’ingrédient ${ii + 1}`}
                      placeholder="Unité"
                      value={ing.unite}
                      onChange={(e) =>
                        majIngredient(gi, ii, { unite: e.target.value })
                      }
                      className="rounded-lg border border-ardoise/25 px-3 py-2"
                    />
                    <ChampSurligne
                      libelle={`Nom de l’ingrédient ${ii + 1}`}
                      placeholder="Ingrédient"
                      valeur={ing.nom}
                      motif={motif}
                      onChange={(nom) => majIngredient(gi, ii, { nom })}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <BoutonAjouter
              onClick={() =>
                majGroupe(gi, {
                  ingredients: [...g.ingredients, { ...INGREDIENT_VIDE }],
                })
              }
            >
              Ajouter un ingrédient
            </BoutonAjouter>
          </div>
        ))}
        <BoutonAjouter
          onClick={() =>
            modifier((r) => ({
              ...r,
              groupes: [
                ...r.groupes,
                { nom: "", ingredients: [{ ...INGREDIENT_VIDE }] },
              ],
            }))
          }
        >
          {recette.groupes.length === 0
            ? "Ajouter un ingrédient"
            : "Ajouter un groupe d’ingrédients"}
        </BoutonAjouter>
      </Section>

      <Section titre="Étapes">
        <ol className="flex flex-col gap-3">
          {recette.etapes.map((etape, ei) => (
            <li key={ei} className="flex items-start gap-2">
              <span className="w-6 shrink-0 pt-2 text-right font-semibold">
                {ei + 1}.
              </span>
              <ChampSurligne
                libelle={`Étape ${ei + 1}`}
                valeur={etape}
                motif={motif}
                onChange={(texte) =>
                  modifier((r) => ({
                    ...r,
                    etapes: r.etapes.map((t, k) => (k === ei ? texte : t)),
                  }))
                }
                className="flex-1"
              />
              <BoutonRetirer
                libelle={`Retirer l’étape ${ei + 1}`}
                onClick={() =>
                  modifier((r) => ({
                    ...r,
                    etapes: r.etapes.filter((_, k) => k !== ei),
                    // Les notes de l'étape retirée passent à la recette, les suivantes suivent.
                    notes: r.notes.map((n) =>
                      n.etape === ei + 1
                        ? { ...n, etape: null }
                        : n.etape !== null && n.etape > ei + 1
                          ? { ...n, etape: n.etape - 1 }
                          : n,
                    ),
                  }))
                }
              />
            </li>
          ))}
        </ol>
        <BoutonAjouter
          onClick={() => modifier((r) => ({ ...r, etapes: [...r.etapes, ""] }))}
        >
          Ajouter une étape
        </BoutonAjouter>
      </Section>

      <Section titre="Notes">
        <p className="-mt-1 text-sm text-taupe">
          Remarques ajoutées au texte de la recette, en marge ou entre
          parenthèses.
        </p>
        <ul className="flex flex-col gap-3">
          {recette.notes.map((note, ni) => (
            <li key={ni} className="flex items-start gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <ChampSurligne
                  libelle={`Note ${ni + 1}`}
                  valeur={note.texte}
                  motif={motif}
                  onChange={(texte) => majNote(ni, { texte })}
                  className="text-taupe italic"
                />
                <label className="flex items-center gap-2 text-sm text-taupe">
                  Rattachée à
                  <select
                    value={note.etape ?? ""}
                    onChange={(e) =>
                      majNote(ni, {
                        etape: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="min-w-0 flex-1 rounded-lg border border-ardoise/25 bg-white px-2 py-1.5 text-ardoise"
                  >
                    <option value="">toute la recette</option>
                    {recette.etapes.map((t, ei) => (
                      <option key={ei} value={ei + 1}>
                        l’étape {ei + 1}
                        {t.trim()
                          ? ` : ${t.trim().slice(0, 40)}${t.trim().length > 40 ? "…" : ""}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <BoutonRetirer
                libelle={`Retirer la note ${ni + 1}`}
                onClick={() =>
                  modifier((r) => ({
                    ...r,
                    notes: r.notes.filter((_, k) => k !== ni),
                  }))
                }
              />
            </li>
          ))}
        </ul>
        <BoutonAjouter
          onClick={() =>
            modifier((r) => ({
              ...r,
              notes: [
                ...r.notes,
                { texte: "", etape: null, origine: "cahier" },
              ],
            }))
          }
        >
          Ajouter une note
        </BoutonAjouter>
      </Section>

      <Organisation
        recette={recette}
        voisines={voisines}
        enJson={enJson}
        avantAction={async () => !modifiee || (await enregistrer())}
        onSeparee={(avant) => {
          setRecette(avant);
          setModifiee(false);
          setEtat("repos");
        }}
      />

      <div className="sticky bottom-0 -mx-6 flex flex-col gap-2 bg-white px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {etat === "echec" ? (
          <p role="alert" className="text-sm">
            L’enregistrement a échoué. Vérifiez votre connexion et réessayez.
          </p>
        ) : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => continuer("plus-tard")}
            disabled={suite !== null}
            className="flex-1 rounded-xl border border-ardoise px-4 py-3.5 font-semibold disabled:opacity-60"
          >
            {suite === "plus-tard" ? "Enregistrement…" : "Plus tard"}
          </button>
          <button
            type="button"
            onClick={() => continuer("valider")}
            disabled={suite !== null}
            className="flex-[2] rounded-xl bg-ardoise px-4 py-3.5 font-semibold text-white disabled:opacity-60"
          >
            {suite === "valider" ? "Enregistrement…" : "Valider"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  titre,
  children,
}: {
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">{titre}</h2>
      {children}
    </section>
  );
}

function BoutonAjouter({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-start text-sm font-medium underline decoration-ciel decoration-2 underline-offset-4"
    >
      + {children}
    </button>
  );
}

function BoutonRetirer({
  libelle,
  onClick,
}: {
  libelle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={libelle}
      onClick={onClick}
      className="flex h-10 w-8 shrink-0 items-center justify-center text-xl text-taupe"
    >
      ×
    </button>
  );
}
