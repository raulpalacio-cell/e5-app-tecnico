// App do técnico: guarda a casca (para abrir sem sinal) e as fotos já vistas.
// Envios (chegada, fotos, conclusão) ficam na fila do IndexedDB, não aqui.
const CACHE = "e5-pages-v1";
const ESTATICOS = [
  "/e5-app-tecnico/offline.html",
  "/e5-app-tecnico/brand/logo-paisagem.png",
  "/e5-app-tecnico/icons/icon-192.png",
  "/e5-app-tecnico/icons/icon-512.png",
  "/e5-app-tecnico/icons/apple-touch-icon.png",
  "/e5-app-tecnico/manifest.webmanifest",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESTATICOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const estatico = url.pathname.startsWith("/e5-app-tecnico/_next/static/")
    || url.pathname.startsWith("/e5-app-tecnico/assets/")
    || url.pathname.startsWith("/e5-app-tecnico/icons/")
    || url.pathname.startsWith("/e5-app-tecnico/brand/");
  if (estatico) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }

  if (url.pathname.startsWith("/e5-app-tecnico/api/arquivos/")) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req);
      const rede = fetch(req).then((res) => {
        if (res.ok) c.put(req, res.clone());
        return res;
      }).catch(() => hit || caches.match("/e5-app-tecnico/offline.html"));
      return hit || rede;
    }));
    return;
  }

  if (url.pathname.startsWith("/e5-app-tecnico/api/")) return;

  // Não guardamos o HTML logado: a agenda muda e um cache antigo mostraria o dia errado.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("/e5-app-tecnico/offline.html")));
  }
});
