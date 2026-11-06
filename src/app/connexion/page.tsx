import type { Metadata } from "next";
import { Suspense } from "react";
import { FormulaireConnexion } from "./formulaire-connexion";

export const metadata: Metadata = { title: "Connexion · Recettes familiales" };

export default function Connexion() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 pt-[max(4rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Recettes familiales</h1>
        <p className="text-taupe leading-relaxed">Connectez-vous avec votre adresse e-mail.</p>
      </header>
      <Suspense>
        <FormulaireConnexion />
      </Suspense>
    </main>
  );
}
