"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { creerClientNavigateur } from "@/lib/supabase/client";

// US-52 : on donne d'abord le nom de la recette ; elle est créée en brouillon, puis on
// saisit ingrédients et étapes sur l'écran de relecture, sans scan.
export function FormulaireNouvelleRecette({ membreId }: { membreId: string }) {
  const router = useRouter();
  const [titre, setTitre] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState(false);

  async function creer() {
    setOccupe(true);
    setErreur(false);
    const supabase = creerClientNavigateur();
    const { data, error } = await supabase
      .from("recette")
      .insert({ titre: titre.trim(), cree_par: membreId })
      .select("id")
      .single();
    if (error || !data) {
      setOccupe(false);
      setErreur(true);
      return;
    }
    router.replace(`/numeriser/relire/${data.id}`);
    router.refresh();
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (titre.trim()) creer();
      }}
    >
      <p className="leading-relaxed">
        Pour une recette qui n’est dans aucun cahier : une recette transmise de vive voix, trouvée sur une
        fiche ou improvisée en famille.
      </p>
      <label className="flex flex-col gap-2">
        <span className="font-medium">Nom de la recette</span>
        <input
          required
          autoFocus
          maxLength={160}
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Par exemple : la tarte aux pommes de mamie"
          className="rounded-xl border border-ardoise/30 px-4 py-3 text-base outline-none placeholder:text-ardoise/40 focus:border-ardoise"
        />
      </label>
      {erreur ? (
        <p role="alert" className="rounded-xl border border-peche bg-peche/15 px-4 py-3 text-sm">
          La recette n’a pas pu être créée. Vérifiez votre connexion et réessayez.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!titre.trim() || occupe}
        className="rounded-xl bg-ardoise px-5 py-3.5 font-semibold text-white disabled:opacity-60"
      >
        {occupe ? "Création…" : "Continuer"}
      </button>
    </form>
  );
}
