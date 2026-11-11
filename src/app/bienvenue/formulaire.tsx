"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { creerClientNavigateur } from "@/lib/supabase/client";

export function FormulaireBienvenue({ email }: { email: string }) {
  const router = useRouter();
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(false);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setEnvoi(true);
        setErreur(false);
        const { error } = await creerClientNavigateur().rpc(
          "completer_profil",
          { p_prenom: prenom, p_nom: nom },
        );
        if (error) {
          setErreur(true);
          setEnvoi(false);
          return;
        }
        router.replace("/");
        router.refresh();
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">E-mail</span>
        <input
          type="email"
          value={email}
          readOnly
          aria-readonly
          className="rounded-xl border border-ardoise/15 bg-ardoise/5 px-4 py-3 text-ardoise/80"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Prénom</span>
        <input
          required
          autoComplete="given-name"
          value={prenom}
          onChange={(e) => setPrenom(e.target.value)}
          className="rounded-xl border border-ardoise/25 px-4 py-3"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Nom de famille</span>
        <input
          required
          autoComplete="family-name"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="rounded-xl border border-ardoise/25 px-4 py-3"
        />
        <span className="text-sm text-taupe">
          Seule son initiale sera affichée aux autres membres.
        </span>
      </label>
      {erreur ? (
        <p role="alert" className="text-sm">
          L’enregistrement n’a pas marché. Réessayez.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={envoi}
        className="rounded-xl bg-ardoise px-5 py-3 font-semibold text-white disabled:opacity-60"
      >
        {envoi ? "Enregistrement…" : "Entrer dans l’appli"}
      </button>
    </form>
  );
}
