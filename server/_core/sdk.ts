import { COOKIE_NAME } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  name: string;
};

/**
 * Sessão própria assinada com JWT_SECRET. É deliberadamente independente do
 * provedor de identidade: trocar o GitHub OAuth por outro login só muda quem
 * chama `createSessionToken`, não o resto da aplicação.
 */
class SDKServer {
  private getSessionSecret() {
    if (!ENV.cookieSecret) throw new Error("JWT_SECRET não configurada");
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  /**
   * Emite o token sem claim `exp`: a sessão vale até o logout, por decisão de
   * produto (app pessoal, usado no celular durante o treino — reautenticar no
   * meio de um WOD é atrito puro). Para invalidar todas as sessões de uma vez,
   * troque JWT_SECRET no Railway.
   */
  async createSessionToken(
    openId: string,
    options: { name?: string } = {}
  ): Promise<string> {
    return new SignJWT({ openId, name: options.name || "" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt()
      .sign(this.getSessionSecret());
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<SessionPayload | null> {
    if (!cookieValue) return null;

    try {
      const { payload } = await jwtVerify(cookieValue, this.getSessionSecret(), {
        algorithms: ["HS256"],
      });
      const { openId, name } = payload as Record<string, unknown>;

      if (!isNonEmptyString(openId)) {
        console.warn("[Auth] Session payload missing openId");
        return null;
      }

      return { openId, name: typeof name === "string" ? name : "" };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) return new Map<string, string>();
    return new Map(Object.entries(parseCookieHeader(cookieHeader)));
  }

  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const session = await this.verifySession(cookies.get(COOKIE_NAME));

    if (!session) throw ForbiddenError("Invalid session cookie");

    const user = await db.getUserByOpenId(session.openId);
    if (!user) throw ForbiddenError("User not found");

    await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
    return user;
  }
}

export type AuthenticatedUser = User;

export const sdk = new SDKServer();
