"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

// Nouveau tirage des suggestions : l'accueil est recalculé côté serveur.
export function RelancerSuggestions() {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  return (
    <button
      type="button"
      disabled={enCours}
      onClick={() => demarrer(() => router.refresh())}
      className="flex items-center gap-1.5 rounded-full border border-ardoise/25 px-3 py-1.5 text-sm font-medium disabled:opacity-50"
    >
      <span aria-hidden>↻</span> Autres idées
    </button>
  );
}
