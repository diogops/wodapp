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

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getRedirectUri(req: Request) {
  if (ENV.appUrl) return `${ENV.appUrl.replace(/\/+$/, "")}/api/oauth/callback`;
  const proto = isSecureRequest(req) ? "https" : "http";
  return `${proto}://${req.get("host")}/api/oauth/callback`;
}

type GitHubUser = { id: number; login: string; name: string | null; email: string | null };

export function registerOAuthRoutes(app: Express) {
  // O redirect sai do servidor para que GITHUB_CLIENT_SECRET nunca chegue ao
  // browser, e para que o nonce anti-CSRF seja criado no mesmo lugar que o valida.
  app.get("/api/oauth/login", (req: Request, res: Response) => {
    const missing = [
      !ENV.githubClientId && "GITHUB_CLIENT_ID",
      !ENV.githubClientSecret && "GITHUB_CLIENT_SECRET",
      !ENV.ownerGithubLogin && "OWNER_GITHUB_LOGIN",
    ].filter(Boolean);

    if (missing.length) {
      res.status(500).type("html").send(
        `<!doctype html><meta charset="utf-8"><title>Login indisponível</title>` +
          `<body style="font-family:system-ui;max-width:34rem;margin:12vh auto;padding:0 1.5rem;line-height:1.6;color:#20231f">` +
          `<h1 style="font-size:1.3rem">Login ainda não configurado</h1>` +
          `<p>Falta definir no serviço: <code>${missing.join("</code>, <code>")}</code>.</p>` +
          `<p>Crie um OAuth App em <b>github.com/settings/developers</b> com o callback ` +
          `<code>${getRedirectUri(req)}</code> e grave essas variáveis no Railway.</p></body>`
      );
      return;
    }

    const nonce = randomUUID();
    res.cookie(getOAuthStateCookieName(req), nonce, getOAuthStateCookieOptions(req));

    const url = new URL(GITHUB_AUTHORIZE_URL);
    url.searchParams.set("client_id", ENV.githubClientId);
    url.searchParams.set("redirect_uri", getRedirectUri(req));
    url.searchParams.set("scope", "read:user user:email");
    url.searchParams.set("state", nonce);

    res.redirect(302, url.toString());
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    // Guarda CSRF: o nonce em `state` precisa bater com o cookie one-time
    // gravado no browser que iniciou o login. O atacante forja o `state`,
    // mas não consegue plantar esse cookie.
    const stateCookieName = getOAuthStateCookieName(req);
    const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[stateCookieName];
    if (!expectedNonce || state !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(stateCookieName, getOAuthStateCookieOptions(req));

    try {
      const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: ENV.githubClientId,
          client_secret: ENV.githubClientSecret,
          code,
          redirect_uri: getRedirectUri(req),
        }),
      });

      const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };
      if (!tokenData.access_token) {
        console.error("[OAuth] Token exchange failed:", tokenData.error);
        res.status(502).json({ error: "token exchange failed" });
        return;
      }

      const userResponse = await fetch(GITHUB_USER_URL, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "workout-sequencer",
        },
      });

      if (!userResponse.ok) {
        res.status(502).json({ error: "failed to load GitHub user" });
        return;
      }

      const githubUser = (await userResponse.json()) as GitHubUser;

      // App pessoal: só o dono entra. Sem essa checagem, qualquer conta do
      // GitHub conseguiria criar um usuário e uma fila de workouts aqui.
      if (
        ENV.ownerGithubLogin &&
        githubUser.login.toLowerCase() !== ENV.ownerGithubLogin.toLowerCase()
      ) {
        res.status(403).send("Este aplicativo é pessoal e está restrito ao proprietário.");
        return;
      }

      const openId = `github:${githubUser.id}`;
      await db.upsertUser({
        openId,
        name: githubUser.name || githubUser.login,
        email: githubUser.email ?? null,
        loginMethod: "github",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: githubUser.name || githubUser.login,
      });

      res.cookie(COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: SESSION_MAX_AGE_MS,
      });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
