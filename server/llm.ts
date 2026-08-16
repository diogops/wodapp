// Extração de workouts a partir de PDF, direto na API da Anthropic.
// Substituiu o cliente Forge da Manus, que dependia de credenciais da
// plataforma. O PDF vai como documento base64 e a resposta é forçada ao
// schema abaixo — mesmo assim o resultado ainda passa pelo `workoutSchema`
// do Zod antes de virar workout: JSON válido não é o mesmo que dado correto.

import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./_core/env";
import { ocrPdfToMarkdown } from "./ocr";

const exerciseProperties = {
  name: { type: "string" },
  prescription: { type: "string" },
  sets: { type: "string" },
  reps: { type: "string" },
  duration: { type: "string" },
  load: { type: "string" },
  notes: { type: "string" },
} as const;

const WORKOUT_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    focus: { type: "string" },
    level: { type: "string" },
    notes: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          format: { type: "string" },
          notes: { type: "string" },
          exercises: {
            type: "array",
            items: {
              type: "object",
              properties: exerciseProperties,
              required: ["name", "prescription", "sets", "reps", "duration", "load", "notes"],
              additionalProperties: false,
            },
          },
        },
        required: ["title", "format", "notes", "exercises"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "focus", "level", "notes", "sections"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = [
  "Você é um treinador e parser de workouts.",
  "Extraia o conteúdo do PDF para JSON estrito em português, sem inventar dados.",
  "Preserve nomes, números, séries, repetições, tempos, cargas e observações exatamente como aparecem.",
  "Quando um campo não estiver identificável no PDF, devolva string vazia em vez de estimar.",
].join(" ");

let _client: Anthropic | null = null;

function getClient() {
  if (!_client) {
    if (!ENV.anthropicApiKey) throw new Error("ANTHROPIC_API_KEY não configurada: a importação de PDF depende dela");
    _client = new Anthropic({ apiKey: ENV.anthropicApiKey });
  }
  return _client;
}

/**
 * Dois estágios quando o OCR está disponível: o Mistral transcreve o PDF em
 * markdown e a Anthropic estrutura esse texto no schema. Sem OCR, o PDF vai
 * inteiro para a Anthropic, que o lê nativamente. O segundo caminho continua
 * correto — o primeiro é mais barato e lida melhor com página escaneada.
 */
export async function extractWorkoutFromPdf(pdfBase64: string): Promise<unknown> {
  const markdown = await ocrPdfToMarkdown(pdfBase64);

  const userContent: Anthropic.ContentBlockParam[] = markdown
    ? [
        {
          type: "text",
          text: `Conteúdo do PDF transcrito por OCR:\n\n${markdown}\n\nConverta para o schema solicitado.`,
        },
      ]
    : [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
        { type: "text", text: "Converta este PDF para o schema solicitado." },
      ];

  const response = await getClient().messages.create({
    model: ENV.anthropicModel,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: WORKOUT_JSON_SCHEMA },
    },
    messages: [{ role: "user", content: userContent }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("O modelo recusou processar este PDF");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("O PDF é longo demais para uma extração completa");
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map(block => block.text)
    .join("");

  if (!text.trim()) throw new Error("O modelo não retornou conteúdo para este PDF");
  return JSON.parse(text);
}
