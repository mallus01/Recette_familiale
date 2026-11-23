"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { creerClientNavigateur } from "@/lib/supabase/client";

// US-51 : renommer un cahier et modifier sa description.
export function ModifierCahier({
  id,
  nom: nomInitial,
  description: descriptionInitiale,
}: {
  id: number;
  nom: string;
  description: string;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState(nomInitial);
  const [description, setDescription] = useState(descriptionInitiale);
  const [etat, setEtat] = useState<"repos" | "enregistrement" | "echec">("repos");

  async function enregistrer() {
    setEtat("enregistrement");
    const supabase = creerClientNavigateur();
    const { error } = await supabase
      .from("cahier")
      .update({ nom: nom.trim(), description: description.trim() || null })
      .eq("id", id);
    if (error) return setEtat("echec");
    setEtat("repos");
    setOuvert(false);
    router.refresh();
  }

  if (!ouvert) {
    return (
      <div className="flex flex-col gap-2">
        {descriptionInitiale ? <p className="leading-relaxed">{descriptionInitiale}</p> : null}
        <button
          type="button"
          onClick={() => setOuvert(true)}
          className="self-start text-sm font-medium underline decoration-ciel decoration-2 underline-offset-4"
        >
          Modifier le nom et la description
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border border-ardoise/15 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (nom.trim()) enregistrer();
      }}
    >
      <label className="flex flex-col gap-2">
        <span className="font-medium">Nom du cahier</span>
        <input
          required
          autoFocus
          maxLength={120}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="rounded-xl border border-ardoise/30 px-4 py-3 text-base outline-none focus:border-ardoise"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-medium">Description</span>
        <textarea
          rows={3}
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Par exemple : recettes notées par mamie Jeanne dans les années 1970"
          className="rounded-xl border border-ardoise/30 px-4 py-3 text-base outline-none placeholder:text-ardoise/40 focus:border-ardoise"
        />
      </label>
      {etat === "echec" ? (
        <p role="alert" className="rounded-xl border border-peche bg-peche/15 px-4 py-3 text-sm">
          Les modifications n’ont pas pu être enregistrées. Vérifiez votre connexion et réessayez.
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setNom(nomInitial);
            setDescription(descriptionInitiale);
            setEtat("repos");
            setOuvert(false);
          }}
          className="flex-1 rounded-xl border border-ardoise px-4 py-3.5 font-semibold"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={!nom.trim() || etat === "enregistrement"}
          className="flex-[2] rounded-xl bg-ardoise px-4 py-3.5 font-semibold text-white disabled:opacity-60"
        >
          {etat === "enregistrement" ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
