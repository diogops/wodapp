import { randomUUID } from "node:crypto";
import { COOKIE_NAME, SESSION_MAX_AGE_MS } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import {
  getOAuthStateCookieName,
  getOAuthStateCookieOptions,
  getSessionCookieOptions,
  isSecureRequest,
} from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

type GoogleUserInfo = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getRedirectUri(req: Request) {
  if (ENV.appUrl) return `${ENV.appUrl.replace(/\/+$/, "")}/api/oauth/google/callback`;
  const proto = isSecureRequest(req) ? "https" : "http";
  return `${proto}://${req.get("host")}/api/oauth/google/callback`;
}

export function registerGoogleOAuthRoutes(app: Express) {
  app.get("/api/oauth/google/login", (req: Request, res: Response) => {
    if (!ENV.googleClientId || !ENV.googleClientSecret) {
      res.status(500).send("GOOGLE_CLIENT_ID/SECRET não configurados");
      return;
    }

    const nonce = randomUUID();
    res.cookie(getOAuthStateCookieName(req), nonce, getOAuthStateCookieOptions(req));

    const url = new URL(GOOGLE_AUTHORIZE_URL);
    url.searchParams.set("client_id", ENV.googleClientId);
    url.searchParams.set("redirect_uri", getRedirectUri(req));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", nonce);
    // `select_account` evita entrar silenciosamente com a conta errada quando
    // há várias sessões Google no navegador.
    url.searchParams.set("prompt", "select_account");

    res.redirect(302, url.toString());
  });

  app.get("/api/oauth/google/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    const stateCookieName = getOAuthStateCookieName(req);
    const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[stateCookieName];
    if (!expectedNonce || state !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(stateCookieName, getOAuthStateCookieOptions(req));

    try {
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: getRedirectUri(req),
        }),
      });

      const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };
      if (!tokenData.access_token) {
        console.error("[GoogleOAuth] Token exchange failed:", tokenData.error);
        res.status(502).json({ error: "token exchange failed" });
        return;
      }

      const userResponse = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (!userResponse.ok) {
        res.status(502).json({ error: "failed to load Google user" });
        return;
      }

      const profile = (await userResponse.json()) as GoogleUserInfo;

      // `email_verified` é obrigatório: sem ele o endereço é só um texto que o
      // dono da conta digitou, e a allowlist deixaria de significar qualquer coisa.
      if (!profile.email || profile.email_verified !== true) {
        res.status(403).send("É necessário um e-mail verificado no Google.");
        return;
      }

      if (!ENV.allowedEmails.includes(profile.email.toLowerCase())) {
        console.warn("[GoogleOAuth] Acesso negado para", profile.email);
        res.status(403).send("Este aplicativo é pessoal e está restrito aos e-mails autorizados.");
        return;
      }

      // openId prefixado por provedor: o mesmo e-mail entrando por Google e por
      // GitHub são contas distintas aqui, cada uma com sua fila.
      const openId = `google:${profile.sub}`;
      await db.upsertUser({
        openId,
        name: profile.name || profile.email,
        email: profile.email,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: profile.name || profile.email,
      });

      res.cookie(COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: SESSION_MAX_AGE_MS,
      });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[GoogleOAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
