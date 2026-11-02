// Base de exercícios para o "workout do dia": free-exercise-db
// (github.com/yuhonas/free-exercise-db, The Unlicense — domínio público).
// Estática e só de leitura, por isso fica no repositório e não no banco.

import fs from "node:fs/promises";
import path from "node:path";
import type { Express } from "express";
import type { Equipment } from "@shared/exerciseCatalog";
import { ENV } from "./_core/env";
import { resolveStoragePath } from "./storage";
import exercises from "./data/exercises.json";

export type LibraryExercise = (typeof exercises)[number];

const BY_ID = new Map(exercises.map(exercise => [exercise.id, exercise]));

export const findLibraryExercise = (id: string) => BY_ID.get(id);
export const demoUrlFor = (id: string) => `/exercise-demos/${id}`;

/** Exercícios feitos só com o que o atleta tem. Peso corporal sempre entra. */
export function exercisesForEquipment(equipment: Equipment[]) {
  const available = new Set<string>(["body only", ...equipment]);
  return exercises.filter(exercise => available.has(exercise.equipment));
}

// Mesmo estilo das demonstrações da musculação (doc/prompts-imagens-musculacao.md),
// num quadro só: são centenas de exercícios gerados sem revisão manual.
const STYLE = [
  "Flat vector sticker illustration with clean bold dark outlines and soft cel shading.",
  "One athlete: a fit man in his late 20s with short dark-brown hair, orange-red tank top, black athletic shorts, white crew socks and orange-red training shoes.",
  "The athlete and all equipment together are wrapped in one thick white sticker outline, on a full-bleed dark teal background (#1F373B) with a subtle vertical gradient and a soft oval shadow under the scene.",
  "No frame, no gym background, no extra people, no extra equipment beyond what is described.",
  "LAYOUT: one tall portrait image (9:16) split into THREE stacked panels of equal height, read top to bottom as the START, MIDDLE and END of the movement; same athlete, equipment, camera angle and scale in all three.",
  "Anatomically correct proportions and correct, safe exercise technique. No text, letters, numbers, logos, watermark or arrows.",
].join(" ");

const inFlight = new Map<string, Promise<string>>();

async function generateDemo(exercise: LibraryExercise): Promise<string> {
  const key = resolveStoragePath(`exercise-demos/${exercise.id}.png`);
  try {
    await fs.access(key);
    return key;
  } catch {}
  if (!ENV.geminiApiKey) throw new Error("GEMINI_API_KEY não configurada");
  const prompt = `${STYLE}\n\nEXERCISE: ${exercise.name} (equipment: ${exercise.equipment}).\nHow it is performed: ${exercise.instructions}`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${ENV.geminiImageModel}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": ENV.geminiApiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "9:16" } },
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error(`Gemini HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const data = await response.json();
  const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
  const blob = parts.map(part => part.inlineData ?? part.inline_data).find(Boolean);
  if (!blob?.data) throw new Error(`Gemini sem imagem: ${JSON.stringify(data).slice(0, 300)}`);
  await fs.mkdir(path.dirname(key), { recursive: true });
  await fs.writeFile(key, Buffer.from(blob.data, "base64"));
  return key;
}

/**
 * Demonstração gerada no primeiro acesso e guardada no volume: custo
 * proporcional ao que o atleta realmente abre. Exige sessão — cada imagem nova
 * custa dinheiro no Gemini.
 */
export function registerExerciseDemos(app: Express) {
  app.get("/exercise-demos/:id", async (req, res) => {
    const exercise = findLibraryExercise(req.params.id);
    if (!exercise) {
      res.status(404).send("Not found");
      return;
    }
    const { sdk } = await import("./_core/sdk");
    try {
      await sdk.authenticateRequest(req);
    } catch {
      res.status(401).send("Unauthorized");
      return;
    }
    // Dois pedidos simultâneos da mesma imagem não podem pagar duas gerações.
    let pending = inFlight.get(exercise.id);
    if (!pending) {
      pending = generateDemo(exercise).finally(() => inFlight.delete(exercise.id));
      inFlight.set(exercise.id, pending);
    }
    try {
      const file = await pending;
      res.set("Cache-Control", "private, max-age=2592000");
      res.type("png").sendFile(file);
    } catch (error) {
      console.error("[exercise-demos]", exercise.id, String(error));
      res.set("Cache-Control", "no-store");
      res.status(502).send("Falha ao gerar a demonstração");
    }
  });
}

/**
 * Troca o `catalogId` que o modelo devolveu pela URL da demonstração. Id fora
 * da lista enviada é ignorado: a resposta do modelo não é confiável.
 */
export function attachLibraryDemos(workout: unknown, library: LibraryExercise[]) {
  const allowed = new Set(library.map(exercise => exercise.id));
  for (const section of (workout as { sections?: { exercises?: Record<string, unknown>[] }[] })?.sections ?? []) {
    for (const exercise of section.exercises ?? []) {
      const id = exercise.catalogId;
      delete exercise.catalogId;
      if (typeof id === "string" && allowed.has(id)) exercise.imageUrl = demoUrlFor(id);
    }
  }
}
