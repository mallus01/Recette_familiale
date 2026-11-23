"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { creerListe, renommerListe } from "@/lib/listes";
import { creerClientNavigateur } from "@/lib/supabase/client";

const CHAMP =
  "rounded-xl border border-ardoise/30 px-4 py-3 text-base outline-none placeholder:text-ardoise/40 focus:border-ardoise";
const PRINCIPAL =
  "flex-[2] rounded-xl bg-ardoise px-4 py-3.5 font-semibold text-white disabled:opacity-60";
const SECONDAIRE =
  "flex-1 rounded-xl border border-ardoise px-4 py-3.5 font-semibold";

// US-53 : « + Nouvelle liste », au bout du sélecteur de Mes listes. Le formulaire
// s'ouvre en bas de l'écran.
export function NouvelleListe() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function creer() {
    setOccupe(true);
    setErreur(null);
    const resultat = await creerListe(nom);
    setOccupe(false);
    if ("erreur" in resultat) return setErreur(resultat.erreur);
    setOuvert(false);
    setNom("");
    router.replace(`/listes?liste=${resultat.liste.id}`);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="flex min-h-12 shrink-0 items-center rounded-full border border-dashed border-ardoise/50 px-4 whitespace-nowrap"
      >
        + Nouvelle liste
      </button>
      {ouvert ? (
        <div
          className="fixed inset-0 z-40 flex items-end bg-ardoise/30 md:items-center md:justify-center"
          onClick={() => setOuvert(false)}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-nouvelle-liste"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              creer();
            }}
            className="flex w-full flex-col gap-4 rounded-t-3xl bg-white px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-base font-normal md:max-w-md md:rounded-3xl"
          >
            <h2 id="titre-nouvelle-liste" className="text-lg font-semibold">
              Nouvelle liste
            </h2>
            <label className="flex flex-col gap-2">
              <span className="font-medium">Nom de la liste</span>
              <input
                required
                autoFocus
                maxLength={60}
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Par exemple : repas de Noël"
                className={CHAMP}
              />
            </label>
            {erreur ? (
              <p role="alert" className="text-sm">
                {erreur}
              </p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOuvert(false)}
                className={SECONDAIRE}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!nom.trim() || occupe}
                className={PRINCIPAL}
              >
                {occupe ? "Création…" : "Créer la liste"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

// US-53 : renommer ou supprimer la liste affichée. Supprimer demande une confirmation et
// ne supprime pas les recettes.
export function GererListe({
  id,
  nom: nomInitial,
  nombre,
}: {
  id: number;
  nom: string;
  nombre: number;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"repos" | "renommer" | "supprimer">(
    "repos",
  );
  const [nom, setNom] = useState(nomInitial);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function renommer() {
    setOccupe(true);
    setErreur(null);
    const probleme = await renommerListe(id, nom);
    setOccupe(false);
    if (probleme) return setErreur(probleme);
    setMode("repos");
    router.refresh();
  }

  async function supprimer() {
    setOccupe(true);
    setErreur(null);
    const { error } = await creerClientNavigateur()
      .from("liste_membre")
      .delete()
      .eq("id", id);
    setOccupe(false);
    if (error)
      return setErreur(
        "La liste n’a pas pu être supprimée. Vérifie ta connexion et réessaie.",
      );
    router.replace("/listes");
    router.refresh();
  }

  if (mode === "renommer") {
    return (
      <form
        className="flex flex-col gap-3 rounded-2xl border border-ardoise/15 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          renommer();
        }}
      >
        <label className="flex flex-col gap-2">
          <span className="font-medium">Nom de la liste</span>
          <input
            required
            autoFocus
            maxLength={60}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className={CHAMP}
          />
        </label>
        {erreur ? (
          <p role="alert" className="text-sm">
            {erreur}
          </p>
        ) : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setNom(nomInitial);
              setErreur(null);
              setMode("repos");
            }}
            className={SECONDAIRE}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!nom.trim() || occupe}
            className={PRINCIPAL}
          >
            {occupe ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    );
  }

  if (mode === "supprimer") {
    return (
      <div
        role="alertdialog"
        aria-labelledby="titre-suppression"
        className="flex flex-col gap-3 rounded-2xl border border-peche bg-peche/15 p-4"
      >
        <p id="titre-suppression" className="leading-relaxed">
          Supprimer la liste <strong className="font-semibold">{nomInitial}</strong>{" "}
          ?{" "}
          {nombre > 0
            ? `Les ${nombre > 1 ? `${nombre} recettes` : "recette"} qu’elle contient restent dans l’appli.`
            : "Elle est vide."}
        </p>
        {erreur ? (
          <p role="alert" className="text-sm">
            {erreur}
          </p>
        ) : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("repos")}
            className={SECONDAIRE}
          >
            Garder la liste
          </button>
          <button
            type="button"
            onClick={supprimer}
            disabled={occupe}
            className={PRINCIPAL}
          >
            {occupe ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="-mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      <button
        type="button"
        onClick={() => setMode("renommer")}
        className="min-h-12 font-medium underline decoration-ciel decoration-2 underline-offset-4"
      >
        Renommer la liste
      </button>
      <button
        type="button"
        onClick={() => setMode("supprimer")}
        className="min-h-12 font-medium underline decoration-peche decoration-2 underline-offset-4"
      >
        Supprimer la liste
      </button>
    </div>
  );
}
