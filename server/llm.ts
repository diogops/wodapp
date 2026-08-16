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

const GENERATOR_SYSTEM_PROMPT = [
  "Você é um treinador de CrossFit montando um workout para um atleta intermediário treinando sozinho.",
  "Monte uma sessão coerente e executável, com aquecimento/técnica quando fizer sentido, parte principal e finisher quando couber.",
  "Prescreva volume, tempo e carga concretos — nada de 'a critério'. Use kg para carga e escreva tudo em português.",
  "Respeite os pedidos do atleta: se ele listou exercícios, use-os como espinha dorsal; se listou o que quer trabalhar, o estímulo tem que refletir isso.",
  "Você pode acrescentar movimentos complementares para a sessão fazer sentido, mas não troque o foco pedido por outro.",
  // O app renderiza cada exercício como uma linha própria em tela de celular.
  // Um bloco descrito em parágrafo vira uma parede de texto ilegível no treino.
  "FORMATO — isto define se o treino fica legível no celular:",
  "Cada movimento é um item separado em `exercises`, com `name` contendo só o nome do movimento (ex.: 'Back Squat', 'Burpee').",
  "Nunca junte vários movimentos num único exercise, e nunca descreva um bloco inteiro em texto corrido.",
  "`prescription` é curta, no máximo cerca de 60 caracteres (ex.: '5x3 a 75%', '20s forte / 40s leve').",
  "Prefira preencher `sets`, `reps`, `duration` e `load` separadamente sempre que o dado existir; deixe vazio o que não se aplica.",
  "`notes` do exercício e da seção são para orientação técnica curta, não para descrever o treino.",
  "`notes` do workout tem no máximo duas frases.",
  "Use `format` da seção para o tipo de bloco (AMRAP 15, EMOM 20, 4 rounds, For Time...).",
].join(" ");

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

export type GenerateWorkoutInput = {
  exercises: string[];
  focusAreas: string[];
  notes?: string;
  avoidTitles?: string[];
  previousWorkout?: unknown;
  changeRequest?: string;
};

/**
 * Gera um workout novo. Sem seleção alguma o pedido vira "surpresa" — é o
 * caminho de quem só quer treinar sem decidir nada.
 */
export async function generateWorkout(input: GenerateWorkoutInput): Promise<unknown> {
  const brief: string[] = [];

  // Revisão: parte do workout anterior e muda só o que foi pedido. Sem o JSON
  // anterior no contexto, "troca os exercícios de ombro" viraria um workout
  // inteiramente novo e o atleta perderia o que já tinha aprovado.
  if (input.previousWorkout && input.changeRequest) {
    brief.push("Este é o workout que você já propôs ao atleta:");
    brief.push(JSON.stringify(input.previousWorkout));
    brief.push(`O atleta pediu este ajuste: ${input.changeRequest}`);
    brief.push(
      "Refaça o workout aplicando o ajuste e preservando tudo que ele não pediu para mudar — mesma estrutura, mesmo estímulo, mesmos blocos que continuam fazendo sentido."
    );
    if (input.avoidTitles?.length) {
      brief.push(`Ele já tem estes workouts na fila: ${input.avoidTitles.join("; ")}.`);
    }
    brief.push("Devolva o workout completo no schema solicitado.");
    return requestWorkout(brief.join("\n"));
  }

  brief.push(
    input.exercises.length
      ? `Exercícios que o atleta escolheu: ${input.exercises.join(", ")}.`
      : "O atleta não escolheu exercícios específicos."
  );
  brief.push(
    input.focusAreas.length
      ? `O que ele quer trabalhar: ${input.focusAreas.join(", ")}.`
      : "Ele não indicou um foco específico — escolha um estímulo coerente."
  );
  if (input.notes?.trim()) brief.push(`Observações do atleta: ${input.notes.trim()}`);
  if (input.avoidTitles?.length) {
    // Sem isto, "surpresa" tende a devolver variações do mesmo workout.
    brief.push(
      `Evite repetir o estímulo destes workouts que ele já tem na fila: ${input.avoidTitles.join("; ")}.`
    );
  }
  brief.push("Monte o workout no schema solicitado.");
  return requestWorkout(brief.join("\n"));
}

async function requestWorkout(prompt: string): Promise<unknown> {
  const response = await getClient().messages.create({
    model: ENV.anthropicModel,
    max_tokens: 16000,
    system: GENERATOR_SYSTEM_PROMPT,
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: WORKOUT_JSON_SCHEMA },
    },
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "refusal") throw new Error("O modelo recusou montar este workout");
  if (response.stop_reason === "max_tokens") throw new Error("O workout gerado ficou longo demais");

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map(block => block.text)
    .join("");

  if (!text.trim()) throw new Error("O modelo não retornou um workout");
  return JSON.parse(text);
}
