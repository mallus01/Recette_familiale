"use client";

import { useEffect } from "react";
import { appliquerAffichage, type Taille } from "@/lib/affichage";

// Reprend le réglage enregistré avec le membre, choisi peut-être sur un autre appareil.
export function SynchroAffichage({
  taille,
  contraste,
}: {
  taille: Taille;
  contraste: boolean;
}) {
  useEffect(() => {
    appliquerAffichage({ taille, contraste });
  }, [taille, contraste]);
  return null;
}
