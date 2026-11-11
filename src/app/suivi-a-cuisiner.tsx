"use client";

import { useEffect } from "react";
import { mesurerAb } from "@/lib/mesurer-ab";

// US-49 : compte l'affichage de la rangée À cuisiner (une fois par jour côté base) et
// chaque recette ouverte depuis elle.
export function SuiviACuisiner({ children }: { children: React.ReactNode }) {
  useEffect(() => mesurerAb("affichage"), []);
  return (
    <div
      className="contents"
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest("a")) mesurerAb("ouverture");
      }}
    >
      {children}
    </div>
  );
}
