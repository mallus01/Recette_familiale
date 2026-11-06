"use client";

import { useEffect } from "react";

export function EnregistrementServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((erreur) => console.error("Service worker non enregistré", erreur));
  }, []);
  return null;
}
