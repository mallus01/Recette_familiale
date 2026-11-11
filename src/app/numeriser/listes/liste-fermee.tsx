"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconeOccasion, IconeTypeRepas } from "@/components/icones";
import { envoyerImage, supprimerImage } from "@/lib/photos";
import { creerClientNavigateur } from "@/lib/supabase/client";

type Valeur = {
  id: number;
  nom: string;
  nbRecettes: number;
  imageChemin: string | null;
  image?: string;
};

const pluriel = (n: number) => (n === 1 ? "1 recette" : `${n} recettes`);

// Une liste fermée : ajouter, renommer et supprimer ses valeurs, et choisir leur image
// (US-37 ; sans image, l'icône par défaut s'affiche dans les filtres).
export function ListeFermee({
  table,
  titre,
  valeurs,
}: {
  table: "type_repas" | "occasion";
  titre: string;
  valeurs: Valeur[];
}) {
  const router = useRouter();
  const [nouveau, setNouveau] = useState("");
  const [imageNouveau, setImageNouveau] = useState<File | null>(null);
  const [enCours, setEnCours] = useState<number | "ajout" | null>(null);
  const [edition, setEdition] = useState<{ id: number; nom: string } | null>(
    null,
  );
  const [aSupprimer, setASupprimer] = useState<Valeur | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const Icone = table === "type_repas" ? IconeTypeRepas : IconeOccasion;
  const fond = table === "type_repas" ? "bg-ciel/30" : "bg-jaune/60";

  const existe = (nom: string, sauf?: number) =>
    valeurs.some(
      (v) =>
        v.id !== sauf &&
        v.nom.localeCompare(nom, "fr", { sensitivity: "base" }) === 0,
    );

  async function executer(
    cle: number | "ajout",
    action: () => PromiseLike<{ error: unknown }>,
  ) {
    setEnCours(cle);
    setErreur(null);
    const { error } = await action();
    setEnCours(null);
    if (error) {
      setErreur("L’opération a échoué. Vérifiez votre connexion et réessayez.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    const nom = nouveau.trim();
    if (!nom) return;
    if (existe(nom)) return setErreur(`« ${nom} » existe déjà.`);
    if (
      await executer("ajout", async () => {
        let image_chemin: string | null = null;
        try {
          if (imageNouveau)
            image_chemin = await envoyerImage(imageNouveau, `filtres/${table}`);
        } catch {
          return { error: "image" };
        }
        const r = await creerClientNavigateur()
          .from(table)
          .insert({ nom, image_chemin });
        if (r.error) await supprimerImage(image_chemin);
        return r;
      })
    ) {
      setNouveau("");
      setImageNouveau(null);
    }
  }

  async function changerImage(v: Valeur, fichier: File | undefined) {
    if (!fichier) return;
    await executer(v.id, async () => {
      let image_chemin: string;
      try {
        image_chemin = await envoyerImage(fichier, `filtres/${table}`);
      } catch {
        return { error: "image" };
      }
      const r = await creerClientNavigateur()
        .from(table)
        .update({ image_chemin })
        .eq("id", v.id);
      await supprimerImage(r.error ? image_chemin : v.imageChemin);
      return r;
    });
  }

  async function renommer(e: React.FormEvent) {
    e.preventDefault();
    if (!edition) return;
    const nom = edition.nom.trim();
    if (!nom) return;
    if (existe(nom, edition.id)) return setErreur(`« ${nom} » existe déjà.`);
    const id = edition.id;
    if (
      await executer(id, () =>
        creerClientNavigateur().from(table).update({ nom }).eq("id", id),
      )
    )
      setEdition(null);
  }

  async function supprimer(v: Valeur) {
    if (
      await executer(v.id, () =>
        creerClientNavigateur().from(table).delete().eq("id", v.id),
      )
    ) {
      setASupprimer(null);
      await supprimerImage(v.imageChemin);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-semibold">{titre}</h2>
        <p className="text-sm text-taupe">
          Touchez l’image d’une valeur pour la changer.
        </p>
      </div>
      {valeurs.length === 0 ? (
        <p className="text-sm text-taupe">Aucune valeur pour l’instant.</p>
      ) : null}
      <ul className="flex flex-col divide-y divide-ardoise/10 rounded-2xl border border-ardoise/15">
        {valeurs.map((v) => (
          <li key={v.id} className="flex flex-col gap-3 p-3">
            <div className="flex items-center gap-3">
              <label
                className={`relative flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl ${fond}`}
              >
                {v.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- URL signée d'un bucket privé
                  <img
                    src={v.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Icone />
                )}
                <input
                  type="file"
                  accept="image/*"
                  aria-label={`Changer l’image de ${v.nom}`}
                  disabled={enCours === v.id}
                  onChange={(e) => {
                    void changerImage(v, e.target.files?.[0]);
                    e.target.value = "";
                  }}
                  className="sr-only"
                />
                {enCours === v.id ? (
                  <span className="absolute inset-0 bg-white/60" />
                ) : null}
              </label>
              {edition?.id === v.id ? (
                <form onSubmit={renommer} className="flex min-w-0 flex-1 gap-2">
                  <input
                    autoFocus
                    aria-label={`Nouveau nom pour ${v.nom}`}
                    value={edition.nom}
                    maxLength={60}
                    onChange={(e) =>
                      setEdition({ id: v.id, nom: e.target.value })
                    }
                    className="min-w-0 flex-1 rounded-lg border border-ardoise/25 px-3 py-2"
                  />
                  <button
                    type="submit"
                    disabled={enCours === v.id}
                    className="font-semibold"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => setEdition(null)}
                    className="text-sm text-taupe"
                  >
                    Annuler
                  </button>
                </form>
              ) : (
                <>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{v.nom}</span>
                    <span className="text-sm text-taupe">
                      {pluriel(v.nbRecettes)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEdition({ id: v.id, nom: v.nom });
                      setASupprimer(null);
                    }}
                    className="text-sm font-medium underline decoration-ciel decoration-2 underline-offset-4"
                  >
                    Renommer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setASupprimer(v);
                      setEdition(null);
                    }}
                    className="text-sm font-medium underline decoration-peche decoration-2 underline-offset-4"
                  >
                    Supprimer
                  </button>
                </>
              )}
            </div>
            {aSupprimer?.id === v.id ? (
              <div
                role="alert"
                className="flex flex-col gap-2 rounded-xl border border-peche bg-peche/15 p-3 text-sm"
              >
                <p>
                  Supprimer « {v.nom} » ?{" "}
                  {v.nbRecettes > 0
                    ? `${pluriel(v.nbRecettes)} ${v.nbRecettes === 1 ? "perdra" : "perdront"} ce tag.`
                    : "Aucune recette ne l’utilise."}
                </p>
                <div className="flex gap-4">
                  <button
                    type="button"
                    disabled={enCours === v.id}
                    onClick={() => supprimer(v)}
                    className="font-semibold underline underline-offset-4"
                  >
                    {enCours === v.id ? "Suppression…" : "Supprimer"}
                  </button>
                  <button type="button" onClick={() => setASupprimer(null)}>
                    Annuler
                  </button>
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <form onSubmit={ajouter} className="flex gap-2">
        <label
          className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl ${fond}`}
        >
          {imageNouveau ? (
            <span className="text-xs font-medium">Image ✓</span>
          ) : (
            <Icone />
          )}
          <input
            type="file"
            accept="image/*"
            aria-label="Image de la nouvelle valeur (facultatif)"
            onChange={(e) => setImageNouveau(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
        </label>
        <input
          aria-label={`Ajouter une valeur à ${titre}`}
          placeholder={
            table === "type_repas"
              ? "Nouveau type de repas"
              : "Nouvelle occasion"
          }
          value={nouveau}
          maxLength={60}
          onChange={(e) => setNouveau(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-ardoise/25 px-3 py-2"
        />
        <button
          type="submit"
          disabled={!nouveau.trim() || enCours === "ajout"}
          className="rounded-xl bg-ardoise px-4 py-2 font-semibold text-white disabled:opacity-60"
        >
          Ajouter
        </button>
      </form>
      {erreur ? (
        <p role="alert" className="text-sm">
          {erreur}
        </p>
      ) : null}
    </section>
  );
}
