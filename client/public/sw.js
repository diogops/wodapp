// Service worker mínimo e à prova de envenenamento.
//
// A versão anterior pré-cacheava "/" no install. Se o app fosse aberto durante
// uma janela de deploy, a página de erro da Railway entrava no cache no lugar
// do app — e passava a ser servida para sempre, sem forma óbvia de recuperar.
//
// Regra que evita a classe inteira do problema: HTML NUNCA é cacheado. Só
// entram assets com nome versionado por hash (/assets/*), que são imutáveis
// por construção, mais os ícones e o manifest. A tela sempre vem da rede.
//
// O custo é não abrir offline a frio. É o preço certo: um app que abre errado
// é pior que um app que não abre.

const CACHE = "wodapp-static-v2";
const CACHEABLE_PREFIXES = ["/assets/", "/icons/", "/demos/"];

function isCacheable(url) {
  if (url.pathname === "/manifest.webmanifest") return true;
  return CACHEABLE_PREFIXES.some(prefix => url.pathname.startsWith(prefix));
}

self.addEventListener("install", event => {
  // Sem addAll: nada é pré-cacheado, então nada pode ser pré-cacheado errado.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      // Apaga qualquer cache antigo, inclusive o v1 que podia conter a página
      // de erro — é isto que cura quem já está com o app quebrado.
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegação, API e arquivos do usuário sempre da rede, sem intermediário.
  if (request.mode === "navigate" || !isCacheable(url)) return;

  event.respondWith(
    caches.match(request).then(hit => {
      if (hit) return hit;
      return fetch(request).then(response => {
        // Só resposta boa entra no cache. Página de erro tem status de erro e
        // fica de fora — que foi exatamente o furo da versão anterior.
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
