export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// O servidor monta o redirect do GitHub (`/api/oauth/login`): ele cria o nonce
// anti-CSRF no mesmo lugar que o valida e mantém o client secret fora do
// browser. Chame a partir de um evento, nunca durante a render.
export const startLogin = () => {
  window.location.href = "/api/oauth/login";
};

export const startGoogleLogin = () => {
  window.location.href = "/api/oauth/google/login";
};
