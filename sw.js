// App do técnico: guarda a casca (para abrir sem sinal) e as fotos já vistas.
// Envios (chegada, fotos, conclusão) ficam na fila do IndexedDB, não aqui.
const CACHE = "e5-v9";
// O service worker pode estar em /sw.js ou em /e5-app-tecnico/sw.js.
const BASE = new URL("./", self.location).pathname.replace(/\/$/, "");
const abs = (p) => BASE + p;
const ESTATICOS = [
  abs("/offline.html"),
  abs("/brand/logo-paisagem.png"),
  abs("/icons/icon-192.png"),
  abs("/icons/icon-512.png"),
  abs("/icons/apple-touch-icon.png"),
  abs("/manifest.webmanifest"),
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

  const caminho = BASE && url.pathname.startsWith(BASE) ? url.pathname.slice(BASE.length) : url.pathname;
  const estatico = caminho.startsWith("/_next/static/")
    || caminho.startsWith("/assets/")
    || caminho.startsWith("/icons/")
    || caminho.startsWith("/brand/");
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

  if (caminho.startsWith("/api/arquivos/")) {
    e.respondWith(caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req);
      const rede = fetch(req).then((res) => {
        if (res.ok) c.put(req, res.clone());
        return res;
      }).catch(() => hit || caches.match(abs("/offline.html")));
      return hit || rede;
    }));
    return;
  }

  if (caminho.startsWith("/api/")) return;

  // Não guardamos o HTML logado: a agenda muda e um cache antigo mostraria o dia errado.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match(abs("/offline.html"))));
  }
});
