// Demande au serveur de lire une page (US-09). Sans attendre : la page passe
// « lecture en cours », puis « prête » ou « en échec ».
export function lancerLecture(pageId: number) {
  return fetch("/api/lecture", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pageId }),
    keepalive: true,
  }).catch(() => undefined);
}
