import type { Express } from "express";
import { resolveStoragePath } from "../storage";

/**
 * Serve os arquivos do volume persistente. Rota protegida por sessão: os PDFs
 * enviados são pessoais e a chave é adivinhável o bastante para não servir como
 * segredo.
 */
export function registerStorageProxy(app: Express) {
  app.get("/files/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    const { sdk } = await import("./sdk");
    try {
      await sdk.authenticateRequest(req);
    } catch {
      res.status(401).send("Unauthorized");
      return;
    }

    let filePath: string;
    try {
      filePath = resolveStoragePath(key);
    } catch {
      res.status(400).send("Invalid storage key");
      return;
    }

    res.set("Cache-Control", "private, no-store");
    res.sendFile(filePath, error => {
      if (error && !res.headersSent) res.status(404).send("Not found");
    });
  });
}
