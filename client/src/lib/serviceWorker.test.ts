import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const raw = readFileSync(resolve(process.cwd(), "client/public/sw.js"), "utf8");
// Comentários fora: eles descrevem justamente o que não deve existir no código,
// e sem isso a asserção falharia por causa da própria documentação.
const sw = raw.replace(/^\s*\/\/.*$/gm, "");

/**
 * Contrato do service worker, verificado no texto-fonte porque não há ambiente
 * de SW nos testes. Existe por causa de um bug real: a versão anterior
 * pré-cacheava "/" e serviu a página de erro da Railway como se fosse o app,
 * de forma permanente. Estas asserções impedem a reintrodução.
 */
describe("service worker", () => {
  it("never precaches anything at install", () => {
    // addAll no install é o que permitia cachear uma resposta ruim.
    expect(sw).not.toMatch(/addAll/);
  });

  it("lets navigation always hit the network", () => {
    expect(sw).toMatch(/request\.mode === "navigate"/);
    // Nenhum fallback de navegação para o cache: é dali que vinha a tela errada.
    expect(sw).not.toMatch(/caches\.match\("\/"\)/);
  });

  it("only stores successful same-origin responses", () => {
    expect(sw).toMatch(/response\.ok && response\.type === "basic"/);
  });

  it("restricts caching to immutable, hash-named assets", () => {
    expect(sw).toMatch(/CACHEABLE_PREFIXES\s*=\s*\[[^\]]*"\/assets\/"/);
    expect(sw).not.toMatch(/"\/api\//);
  });

  it("purges caches from earlier versions on activate", () => {
    // É isto que cura um app já quebrado quando o novo SW assume.
    expect(sw).toMatch(/caches\.delete\(key\)/);
    expect(sw).toMatch(/skipWaiting/);
    expect(sw).toMatch(/clients\.claim/);
  });
});
