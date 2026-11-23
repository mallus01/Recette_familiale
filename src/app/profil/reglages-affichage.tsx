"use client";

import { useState } from "react";
import {
  appliquerAffichage,
  TAILLES,
  type Affichage,
  type Taille,
} from "@/lib/affichage";
import { creerClientNavigateur } from "@/lib/supabase/client";

const ECHANTILLON: Record<Taille, string> = {
  normale: "text-base",
  grande: "text-lg",
  tres_grande: "text-xl",
};

// US-56 et US-57 : réglages d'affichage dans Profil, appliqués tout de suite.
export function ReglagesAffichage({ initial }: { initial: Affichage }) {
  const [affichage, setAffichage] = useState(initial);
  const [echec, setEchec] = useState(false);

  async function changer(maj: Partial<Affichage>) {
    const suivant = { ...affichage, ...maj };
    setAffichage(suivant);
    appliquerAffichage(suivant);
    setEchec(false);
    const { error } = await creerClientNavigateur().rpc("regler_affichage", {
      p_taille: suivant.taille,
      p_contraste: suivant.contraste,
    });
    if (error) setEchec(true);
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-semibold">Affichage</h2>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">Taille du texte</legend>
        <div className="grid grid-cols-3 gap-2">
          {TAILLES.map((t) => {
            const choisie = affichage.taille === t.valeur;
            return (
              <label
                key={t.valeur}
                className={`flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-3 text-center has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ardoise ${
                  choisie ? "border-ardoise bg-ardoise/10" : "border-ardoise/25"
                }`}
              >
                <input
                  type="radio"
                  name="taille-texte"
                  value={t.valeur}
                  checked={choisie}
                  onChange={() => changer({ taille: t.valeur })}
                  className="sr-only"
                />
                <span aria-hidden className={`font-semibold ${ECHANTILLON[t.valeur]}`}>
                  Aa
                </span>
                <span className="text-sm leading-tight">
                  {choisie ? "✓ " : ""}
                  {t.libelle}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-2xl border-2 border-ardoise/25 px-4 py-3">
        <span className="flex flex-col">
          <span className="font-medium">Contraste renforcé</span>
          <span className="text-sm text-taupe">
            Textes plus foncés et bordures plus marquées.
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={affichage.contraste}
          onChange={(e) => changer({ contraste: e.target.checked })}
          className="h-7 w-7 shrink-0 accent-ardoise"
        />
      </label>
      {echec ? (
        <p role="alert" className="text-sm leading-relaxed">
          Le réglage est appliqué sur cet appareil, mais n’a pas pu être enregistré
          pour tes autres appareils. Vérifie ta connexion et réessaie.
        </p>
      ) : (
        <p className="text-sm text-taupe">
          Ce réglage te suit sur tous tes appareils.
        </p>
      )}
    </section>
  );
}
