"use client";

import { useEffect } from "react";

// US-19 : garde l'écran allumé tant que le composant est affiché (API Screen Wake Lock).
// La demande peut échouer (navigateur trop ancien, batterie faible) : on l'ignore. Le
// navigateur relâche le verrou quand l'appli passe en arrière-plan ; on le redemande
// au retour.
export function useEcranAllume() {
  useEffect(() => {
    let verrou: WakeLockSentinel | null = null;
    let actif = true;

    async function demander() {
      if (!("wakeLock" in navigator) || document.visibilityState !== "visible")
        return;
      try {
        const nouveau = await navigator.wakeLock.request("screen");
        if (actif) verrou = nouveau;
        else await nouveau.release();
      } catch {
        verrou = null;
      }
    }

    function auRetour() {
      if (
        document.visibilityState === "visible" &&
        (!verrou || verrou.released)
      )
        void demander();
    }

    void demander();
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      actif = false;
      document.removeEventListener("visibilitychange", auRetour);
      void verrou?.release().catch(() => {});
    };
  }, []);
}
