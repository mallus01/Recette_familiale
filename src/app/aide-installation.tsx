"use client";

import { useSyncExternalStore } from "react";

// Safari iOS ne propose pas d'invite d'installation : on explique le geste.
// Le message disparaît une fois l’appli ouverte depuis l’écran d’accueil.
function estIosHorsAppli() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const installee =
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true);
  return ios && !installee;
}

const sAbonner = () => () => {};

export function AideInstallation() {
  const afficher = useSyncExternalStore(sAbonner, estIosHorsAppli, () => false);
  if (!afficher) return null;
  return (
    <p className="rounded-2xl border border-ciel bg-ciel/15 px-4 py-3 text-sm leading-relaxed">
      Pour installer l’appli, touchez le bouton Partager de Safari, puis Sur l’écran d’accueil.
    </p>
  );
}
