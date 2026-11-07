"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { creerClientNavigateur } from "@/lib/supabase/client";

type Valeur = { id: number; nom: string };
type Tags = { type: number | null; occasions: number[]; classique: boolean };

export function ChoixTags({
  recetteId,
  types,
  occasions,
  initial,
}: {
  recetteId: number;
  types: Valeur[];
  occasions: Valeur[];
  initial: Tags;
}) {
  const router = useRouter();
  const [tags, setTags] = useState(initial);
  const [modifies, setModifies] = useState(false);
  const [etat, setEtat] = useState<
    "repos" | "enregistrement" | "enregistre" | "echec"
  >("repos");

  function modifier(maj: Partial<Tags>) {
    setTags((t) => ({ ...t, ...maj }));
    setModifies(true);
    setEtat("repos");
  }

  async function enregistrer() {
    setEtat("enregistrement");
    const { error } = await creerClientNavigateur().rpc("classer_recette", {
      p_recette_id: recetteId,
      p_type_repas_id: tags.type,
      p_occasions: tags.occasions,
      p_classique: tags.classique,
    });
    if (error) return setEtat("echec");
    setModifies(false);
    setEtat("enregistre");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-7">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-semibold">Type de repas</legend>
        <p className="-mt-2 text-sm text-taupe">
          Un seul choix. Touchez à nouveau pour le retirer.
        </p>
        <div className="flex flex-wrap gap-2">
          {types.map((t) => (
            <Pastille
              key={t.id}
              choisie={tags.type === t.id}
              couleur="bg-ciel"
              onClick={() =>
                modifier({ type: tags.type === t.id ? null : t.id })
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
            const choisie = tags.occasions.includes(o.id);
            return (
              <Pastille
                key={o.id}
                choisie={choisie}
                couleur="bg-jaune"
                onClick={() =>
                  modifier({
                    occasions: choisie
                      ? tags.occasions.filter((x) => x !== o.id)
                      : [...tags.occasions, o.id],
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
        aria-checked={tags.classique}
        onClick={() => modifier({ classique: !tags.classique })}
        className="flex items-center gap-4 rounded-2xl border border-ardoise/15 p-4 text-left"
      >
        <span
          aria-hidden
          className={`text-3xl leading-none ${tags.classique ? "text-ardoise" : "text-ardoise/25"}`}
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
          {tags.classique ? "Oui" : "Non"}
        </span>
      </button>

      <div className="flex flex-col gap-2">
        {etat === "echec" ? (
          <p role="alert" className="text-sm">
            L’enregistrement a échoué. Vérifiez votre connexion et réessayez.
          </p>
        ) : null}
        <button
          type="button"
          onClick={enregistrer}
          disabled={
            etat === "enregistrement" || (!modifies && etat !== "echec")
          }
          className="rounded-xl bg-ardoise px-5 py-3.5 font-semibold text-white disabled:opacity-60"
        >
          {etat === "enregistrement"
            ? "Enregistrement…"
            : etat === "enregistre" && !modifies
              ? "Tags enregistrés"
              : modifies
                ? "Enregistrer les tags"
                : "Aucun changement"}
        </button>
      </div>
    </div>
  );
}

// Tag à choisir : fond de couleur quand il est choisi, texte toujours ardoise.
function Pastille({
  choisie,
  couleur,
  onClick,
  children,
}: {
  choisie: boolean;
  couleur: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={choisie}
      onClick={onClick}
      className={`rounded-full border px-4 py-2 font-medium ${
        choisie ? `${couleur} border-transparent` : "border-ardoise/25 bg-white"
      }`}
    >
      {choisie ? "✓ " : ""}
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
