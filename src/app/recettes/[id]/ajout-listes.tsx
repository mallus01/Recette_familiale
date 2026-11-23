"use client";

import { useCallback, useEffect, useState } from "react";
import { creerListe, type ListeCreee } from "@/lib/listes";
import { creerClientNavigateur } from "@/lib/supabase/client";

type Ligne = ListeCreee & { liste_membre_recette: { recette_id: number }[] };

// US-54 : ranger la recette dans une ou plusieurs de ses listes, ou en créer une.
export function AjoutListes({ recetteId }: { recetteId: number }) {
  const [listes, setListes] = useState<ListeCreee[]>([]);
  const [dedans, setDedans] = useState<Set<number>>(new Set());
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const { data } = await creerClientNavigateur()
      .from("liste_membre")
      .select("id, nom, liste_membre_recette(recette_id)")
      .eq("liste_membre_recette.recette_id", recetteId)
      .order("cree_le")
      .returns<Ligne[]>();
    if (!data) return;
    setListes(data.map(({ id, nom }) => ({ id, nom })));
    setDedans(
      new Set(
        data.filter((l) => l.liste_membre_recette.length > 0).map((l) => l.id),
      ),
    );
  }, [recetteId]);

  useEffect(() => {
    // Chargement initial depuis la base : rien d'autre ne fixe cet état.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  async function basculer(id: number) {
    const present = dedans.has(id);
    const avant = dedans;
    const apres = new Set(dedans);
    if (present) apres.delete(id);
    else apres.add(id);
    setDedans(apres);
    setErreur(null);
    const table = creerClientNavigateur().from("liste_membre_recette");
    const { error } = present
      ? await table.delete().eq("liste_id", id).eq("recette_id", recetteId)
      : await table.insert({ liste_id: id, recette_id: recetteId });
    if (error) {
      setDedans(avant);
      setErreur("La liste n’a pas pu être modifiée. Réessaie.");
    }
  }

  async function nouvelle() {
    setOccupe(true);
    setErreur(null);
    const resultat = await creerListe(nom);
    if ("erreur" in resultat) {
      setOccupe(false);
      return setErreur(resultat.erreur);
    }
    const { error } = await creerClientNavigateur()
      .from("liste_membre_recette")
      .insert({ liste_id: resultat.liste.id, recette_id: recetteId });
    setOccupe(false);
    setNom("");
    setListes((l) => [...l, resultat.liste]);
    if (error)
      setErreur("La liste est créée, mais la recette n’a pas pu y être ajoutée.");
    else setDedans((d) => new Set([...d, resultat.liste.id]));
  }

  const nombre = dedans.size;

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        aria-haspopup="dialog"
        className={`min-h-12 rounded-full border px-4 py-2.5 text-sm font-medium ${
          nombre > 0 ? "border-ardoise bg-ardoise/10" : "border-ardoise/25"
        }`}
      >
        {nombre === 0
          ? "+ Ajouter à une liste"
          : nombre === 1
            ? "✓ Dans 1 de mes listes"
            : `✓ Dans ${nombre} de mes listes`}
      </button>
      {ouvert ? (
        <div
          className="fixed inset-0 z-40 flex items-end bg-ardoise/30 md:items-center md:justify-center"
          onClick={() => setOuvert(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-mes-listes"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85dvh] w-full flex-col gap-4 overflow-y-auto rounded-t-3xl bg-white px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:max-w-md md:rounded-3xl"
          >
            <h2 id="titre-mes-listes" className="text-lg font-semibold">
              Mes listes
            </h2>
            {listes.length === 0 ? (
              <p className="leading-relaxed text-taupe">
                Tu n’as pas encore de liste. Crée la première ci-dessous.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-ardoise/10">
                {listes.map((l) => (
                  <li key={l.id}>
                    <label className="flex min-h-12 items-center gap-3 py-2">
                      <input
                        type="checkbox"
                        checked={dedans.has(l.id)}
                        onChange={() => basculer(l.id)}
                        className="h-6 w-6 shrink-0 accent-ardoise"
                      />
                      <span className="leading-snug">{l.nom}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                nouvelle();
              }}
            >
              <label className="flex flex-col gap-2">
                <span className="font-medium">Nouvelle liste</span>
                <input
                  maxLength={60}
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Par exemple : repas de Noël"
                  className="rounded-xl border border-ardoise/30 px-4 py-3 text-base outline-none placeholder:text-ardoise/40 focus:border-ardoise"
                />
              </label>
              <button
                type="submit"
                disabled={!nom.trim() || occupe}
                className="rounded-xl border border-ardoise px-4 py-3 font-semibold disabled:opacity-60"
              >
                {occupe ? "Création…" : "Créer et y ajouter la recette"}
              </button>
            </form>
            {erreur ? (
              <p role="alert" className="text-sm">
                {erreur}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setOuvert(false)}
              className="rounded-xl bg-ardoise px-4 py-3.5 font-semibold text-white"
            >
              Fermer
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
