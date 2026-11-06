// Service worker minimal : rend l'appli installable et affiche une page
// hors connexion quand le réseau manque. Aucune donnée n'est mise en cache
// pour l'instant (les recettes arriveront avec Supabase).
const CACHE = "recettes-v1";
const HORS_LIGNE = "/hors-ligne.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(HORS_LIGNE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(HORS_LIGNE)));
});
