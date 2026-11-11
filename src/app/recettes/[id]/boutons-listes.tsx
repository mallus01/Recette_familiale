"use client";

import { useEffect, useState } from "react";
import { creerClientNavigateur } from "@/lib/supabase/client";

type Type = "favori" | "a_cuisiner";

// US-28 : ajouter la recette à ses listes privées, ou l'en retirer.
export function BoutonsListes({
  recetteId,
  membreId,
  initiales,
}: {
  recetteId: number;
  membreId: string;
  initiales: Type[];
}) {
  const [listes, setListes] = useState<Type[]>(initiales);
  const [erreur, setErreur] = useState(false);

  // Relu à chaque affichage : la recette a pu quitter À cuisiner en mode cuisine.
  useEffect(() => {
    let annule = false;
    creerClientNavigateur()
      .from("liste_perso")
      .select("type")
      .eq("recette_id", recetteId)
      .eq("membre_id", membreId)
      .then(({ data }) => {
        if (!annule && data) setListes(data.map((l) => l.type as Type));
      });
    return () => {
      annule = true;
    };
  }, [recetteId, membreId]);

  async function basculer(type: Type) {
    const present = listes.includes(type);
    setErreur(false);
    setListes(present ? listes.filter((l) => l !== type) : [...listes, type]);
    const table = creerClientNavigateur().from("liste_perso");
    const { error } = present
      ? await table
          .delete()
          .eq("membre_id", membreId)
          .eq("recette_id", recetteId)
          .eq("type", type)
      : await table.insert({
          membre_id: membreId,
          recette_id: recetteId,
          type,
        });
    if (error) {
      setListes(listes);
      setErreur(true);
    }
  }

  const bouton = (type: Type, actif: string, inactif: string) => {
    const present = listes.includes(type);
    return (
      <button
        type="button"
        aria-pressed={present}
        onClick={() => basculer(type)}
        className={`flex-1 rounded-full border px-4 py-2.5 text-sm font-medium ${
          present ? "border-ardoise bg-ardoise/10" : "border-ardoise/25"
        }`}
      >
        {present ? actif : inactif}
      </button>
    );
  };

  return (
    <div className="-mt-2 flex flex-col gap-2">
      <div className="flex gap-2">
        {bouton("favori", "♥ Dans mes favoris", "♡ Favori")}
        {bouton("a_cuisiner", "✓ À cuisiner", "+ À cuisiner")}
      </div>
      {erreur ? (
        <p className="text-sm">La liste n’a pas pu être modifiée. Réessaie.</p>
      ) : null}
    </div>
  );
}
