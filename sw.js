// Service worker de « Gestion quotidien »
// - Toutes les pages du hub, le kit commun et les icônes sont mis en cache pour fonctionner hors ligne
// - Réseau d'abord (pour recevoir les mises à jour tout de suite), le cache sert de secours
// - Chaque requête est rangée sous sa propre adresse (plus de mélange entre pages)
// - Les appels externes (API GitHub, météo, IA, CDN) ne passent jamais par ici
const CACHE = "gestion-v2.6.0";
const PAGES = ["index", "violette", "habits", "animaux", "plantes", "budget", "paperasse", "garage", "colis", "collections"];
const SHELL = ["./", ...PAGES.map(p => `./${p}.html`), "./ui/kit.css", "./ui/kit.js", "./ui/docmask.js", "./ui/tour.js", "./passerelle-budget.js",
  "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))) // un fichier manquant ne bloque pas l'installation
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const key = url.origin + url.pathname; // on ignore ?query et #hash pour la clé de cache
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
        return res;
      })
      .catch(() => caches.match(key).then(hit => hit || (req.mode === "navigate" ? caches.match("./index.html") : Response.error())))
  );
});
