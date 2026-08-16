// Armazenamento de arquivos em disco, sobre o volume persistente da Railway
// (montado em STORAGE_DIR). Substituiu o storage da Manus, que dependia de
// credenciais da plataforma. Só metadados vão para o banco; o binário fica aqui.

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { ENV } from "./_core/env";

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

/**
 * Resolve a chave dentro de STORAGE_DIR e recusa qualquer caminho que escape
 * dele. A chave chega de nome de arquivo enviado pelo usuário, então `..` e
 * caminho absoluto precisam morrer aqui, não no `fs`.
 */
export function resolveStoragePath(relKey: string): string {
  const root = path.resolve(ENV.storageDir);
  const target = path.resolve(root, normalizeKey(relKey));
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (target !== root && !target.startsWith(rootWithSep)) {
    throw new Error("Chave de storage inválida");
  }
  return target;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const target = resolveStoragePath(key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, typeof data === "string" ? Buffer.from(data) : Buffer.from(data));
  return { key, url: `/files/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/files/${key}` };
}

export async function storageReadFile(relKey: string): Promise<Buffer> {
  return fs.readFile(resolveStoragePath(relKey));
}
