import type { CookieOptions, Request } from "express";

export function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

/**
 * `sameSite: "lax"` porque o app é servido no mesmo domínio da API e não roda
 * mais dentro de iframe (o `none` existia para o preview da Manus, e exigia
 * Secure — o que quebra o desenvolvimento local em http).
 */
export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isSecureRequest(req),
  };
}

/**
 * O prefixo `__Host-` força o cookie a ser host-only, impedindo que um vizinho
 * em *.up.railway.app plante um valor no navegador da vítima. Ele exige Secure,
 * então em http local caímos no nome sem prefixo.
 */
export function getOAuthStateCookieName(req: Request) {
  return isSecureRequest(req) ? "__Host-oauth_state" : "oauth_state";
}

export function getOAuthStateCookieOptions(req: Request): CookieOptions {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isSecureRequest(req),
    maxAge: 10 * 60 * 1000,
  };
}
