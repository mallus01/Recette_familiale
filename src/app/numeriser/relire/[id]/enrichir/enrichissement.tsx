"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconeOccasion, IconeTypeRepas } from "@/components/icones";
import { creerClientNavigateur } from "@/lib/supabase/client";

type Valeur = { id: number; nom: string };
type Infos = {
  transmis_par: string;
  souvenir: string;
  portions: string;
  duree_minutes: string;
  type: number | null;
  occasions: number[];
  classique: boolean;
};

const entier = (s: string) => {
  const n = Number(s.trim().replace(",", "."));
  return s.trim() && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

export function Enrichissement({
  recetteId,
  publiee,
  types,
  occasions,
  initial,
}: {
  recetteId: number;
  publiee: boolean;
  types: Valeur[];
  occasions: Valeur[];
  initial: Infos;
}) {
  const router = useRouter();
  const [infos, setInfos] = useState(initial);
  const [etat, setEtat] = useState<
    "repos" | "plus-tard" | "publication" | "echec"
  >("repos");
  const modifier = (maj: Partial<Infos>) => setInfos((i) => ({ ...i, ...maj }));

  async function enregistrer(publier: boolean) {
    setEtat(publier ? "publication" : "plus-tard");
    const { error } = await creerClientNavigateur().rpc("enrichir_recette", {
      p_recette_id: recetteId,
      p_publier: publier,
      p_infos: {
        transmis_par: infos.transmis_par,
        souvenir: infos.souvenir,
        portions: entier(infos.portions),
        duree_minutes: entier(infos.duree_minutes),
        type_repas_id: infos.type,
        occasions: infos.occasions,
        classique: infos.classique,
      },
    });
    if (error) return setEtat("echec");
    // Publiée : on ouvre sa fiche ; plus tard : retour à la file à relire.
    router.push(publier ? `/recettes/${recetteId}` : "/numeriser/a-relire");
    router.refresh();
  }

  const occupe = etat === "publication" || etat === "plus-tard";

  return (
    <div className="flex flex-col gap-7">
      <section className="flex flex-col gap-4">
        <Champ
          libelle="Transmis par"
          aide="Qui a donné cette recette (texte libre)"
        >
          <input
            value={infos.transmis_par}
            maxLength={120}
            placeholder="Tante Paule, la voisine…"
            onChange={(e) => modifier({ transmis_par: e.target.value })}
            className="rounded-lg border border-ardoise/25 px-3 py-2"
          />
        </Champ>
        <Champ
          libelle="Souvenir"
          aide="Une anecdote, un moment associé à cette recette"
        >
          <textarea
            value={infos.souvenir}
            rows={3}
            onChange={(e) => modifier({ souvenir: e.target.value })}
            className="rounded-lg border border-ardoise/25 px-3 py-2"
          />
        </Champ>
        <div className="grid grid-cols-2 gap-3">
          <Champ libelle="Portions">
            <input
              inputMode="numeric"
              value={infos.portions}
              placeholder="6"
              onChange={(e) => modifier({ portions: e.target.value })}
              className="rounded-lg border border-ardoise/25 px-3 py-2"
            />
          </Champ>
          <Champ libelle="Durée (minutes)">
            <input
              inputMode="numeric"
              value={infos.duree_minutes}
              placeholder="45"
              onChange={(e) => modifier({ duree_minutes: e.target.value })}
              className="rounded-lg border border-ardoise/25 px-3 py-2"
            />
          </Champ>
        </div>
      </section>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-semibold">Type de repas</legend>
        <p className="-mt-2 text-sm text-taupe">
          Un seul choix. Touchez à nouveau pour le retirer.
        </p>
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <Pastille
              key={t.id}
              choisie={infos.type === t.id}
              couleur="bg-ciel"
              icone={<IconeTypeRepas className="h-5 w-5" />}
              onClick={() =>
                modifier({ type: infos.type === t.id ? null : t.id })
              }
            >
              {t.nom}
            </Pastille>
          ))}
          {types.length === 0 ? <Vide /> : null}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-semibold">Occasions</legend>
        <p className="-mt-2 text-sm text-taupe">Une ou plusieurs, ou aucune.</p>
        <div className="flex flex-wrap gap-2">
          {occasions.map((o) => {
            const choisie = infos.occasions.includes(o.id);
            return (
              <Pastille
                key={o.id}
                choisie={choisie}
                couleur="bg-jaune"
                icone={<IconeOccasion className="h-5 w-5" />}
                onClick={() =>
                  modifier({
                    occasions: choisie
                      ? infos.occasions.filter((x) => x !== o.id)
                      : [...infos.occasions, o.id],
                  })
                }
              >
                {o.nom}
              </Pastille>
            );
          })}
          {occasions.length === 0 ? <Vide /> : null}
        </div>
      </fieldset>

      <button
        type="button"
        role="switch"
        aria-checked={infos.classique}
        onClick={() => modifier({ classique: !infos.classique })}
        className="flex items-center gap-4 rounded-2xl border border-ardoise/15 p-4 text-left"
      >
        <span
          aria-hidden
          className={`text-3xl leading-none ${infos.classique ? "text-ardoise" : "text-ardoise/25"}`}
        >
          ★
        </span>
        <span className="flex flex-col">
          <span className="font-semibold">Classique</span>
          <span className="text-sm text-taupe">
            Une recette très populaire, comme le bœuf bourguignon
          </span>
        </span>
        <span className="ml-auto text-sm font-medium">
          {infos.classique ? "Oui" : "Non"}
        </span>
      </button>

      <div className="sticky bottom-0 -mx-6 flex flex-col gap-2 bg-white px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {etat === "echec" ? (
          <p role="alert" className="text-sm">
            L’enregistrement a échoué. Vérifiez votre connexion et réessayez.
          </p>
        ) : null}
        <div className="flex gap-2">
          {!publiee ? (
            <button
              type="button"
              disabled={occupe}
              onClick={() => enregistrer(false)}
              className="flex-1 rounded-xl border border-ardoise px-4 py-3.5 font-semibold disabled:opacity-60"
            >
              {etat === "plus-tard" ? "Enregistrement…" : "Plus tard"}
            </button>
          ) : null}
          <button
            type="button"
            disabled={occupe}
            onClick={() => enregistrer(true)}
            className="flex-[2] rounded-xl bg-ardoise px-4 py-3.5 font-semibold text-white disabled:opacity-60"
          >
            {etat === "publication"
              ? "Publication…"
              : publiee
                ? "Enregistrer"
                : "Publier la recette"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Champ({
  libelle,
  aide,
  children,
}: {
  libelle: string;
  aide?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-semibold">{libelle}</span>
      {aide ? <span className="-mt-1 text-sm text-taupe">{aide}</span> : null}
      {children}
    </label>
  );
}

// Tag à choisir : fond de couleur quand il est choisi, texte toujours ardoise.
function Pastille({
  choisie,
  couleur,
  icone,
  onClick,
  children,
}: {
  choisie: boolean;
  couleur: string;
  icone: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={choisie}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-4 py-2 font-medium ${
        choisie ? `${couleur} border-transparent` : "border-ardoise/25 bg-white"
      }`}
    >
      {icone}
      {children}
    </button>
  );
}

function Vide() {
  return (
    <p className="text-sm text-taupe">
      Aucune valeur pour l’instant. L’administrateur peut en ajouter.
    </p>
  );
}
