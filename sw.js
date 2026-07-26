// Minimaler Service Worker - noetig, damit die Seite als "App" installierbar ist.
// Bewusst ohne Offline-Caching, damit du auf PC und Handy immer den
// aktuellen Stand aus Supabase siehst statt einer alten, zwischengespeicherten Version.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
