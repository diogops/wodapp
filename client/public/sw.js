// Service worker deliberadamente conservador.
//
// O app depende de dados por sessão (fila, histórico, rascunho), então cachear
// API seria pior que não ter cache: mostraria treino errado. Aqui só o shell
// estático é guardado, e navegação é network-first — o cache serve apenas para
// a tela abrir quando o celular está sem rede na academia.

const CACHE = "wodapp-shell-v1";
const SHELL = ["/", "/icons/icon-192.png", "/icons/apple-touch-icon.png", "/manifest.webmanifest"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // API e arquivos do usuário nunca entram em cache: sessão e dados pessoais.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/files/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/").then(hit => hit ?? Response.error())));
    return;
  }

  event.respondWith(
    caches.match(request).then(
      hit =>
        hit ??
        fetch(request).then(response => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});
