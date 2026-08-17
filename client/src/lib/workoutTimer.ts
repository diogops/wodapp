// Núcleo do timer de exercício: parsing de duração e regras de interação.
// Mantido puro para ser testável sem DOM — o efeito colateral (intent do
// Android, áudio, vibração) fica no componente.

export type TimerStatus = "running" | "paused" | "finished";

/**
 * Contagem regressiva quando o exercício tem tempo prescrito; cronômetro
 * crescente quando é por quantidade. Todo exercício ganha timer — num treino
 * por repetições ele serve como marcador de tempo, não como limite.
 */
export type TimerMode = "countdown" | "stopwatch";

export function getTimerMode(seconds: number | null): TimerMode {
  return seconds && seconds > 0 ? "countdown" : "stopwatch";
}

export type TimerExercise = { id: string; name: string; seconds: number | null };

/**
 * Próximo exercício da sequência achatada do workout, ignorando os já
 * concluídos — depois de terminar um, oferecer de novo algo já feito seria
 * mandar o atleta repetir trabalho.
 */
export function findNextExercise(
  exercises: TimerExercise[],
  currentId: string,
  doneIds: Set<string> = new Set()
): TimerExercise | null {
  const currentIndex = exercises.findIndex(exercise => exercise.id === currentId);
  if (currentIndex < 0) return null;
  for (let index = currentIndex + 1; index < exercises.length; index++) {
    const candidate = exercises[index];
    if (!doneIds.has(candidate.id)) return candidate;
  }
  return null;
}

const UNIT_SECONDS: Record<string, number> = {
  h: 3600,
  hr: 3600,
  hora: 3600,
  horas: 3600,
  min: 60,
  mins: 60,
  m: 60,
  minuto: 60,
  minutos: 60,
  s: 1,
  seg: 1,
  segs: 1,
  segundo: 1,
  segundos: 1,
};

/**
 * Extrai uma duração em segundos de textos como "12 min", "20s", "1h 30min",
 * "8 minutos". Devolve null quando não há duração reconhecível — é o sinal
 * para não oferecer o botão de iniciar.
 *
 * Só aceita unidade explícita: "3 rounds" ou "4 x 10-15" não são tempo, e
 * chutar um valor aqui daria um timer errado no meio do treino.
 */
export function parseDurationToSeconds(...sources: Array<string | null | undefined>): number | null {
  for (const source of sources) {
    if (!source) continue;
    const normalized = source.toLowerCase().replace(/,/g, ".");
    const matches = [...normalized.matchAll(/(\d+(?:\.\d+)?)\s*([a-zà-ú]+)/g)];

    let total = 0;
    for (const [, rawValue, rawUnit] of matches) {
      const unit = UNIT_SECONDS[rawUnit];
      if (!unit) continue;
      total += Math.round(Number(rawValue) * unit);
    }

    if (total > 0) return total;
  }
  return null;
}

export function formatTimerDisplay(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Um toque no timer fecha. Se ainda estiver correndo, pausa antes de fechar —
 * assim um toque acidental durante o treino não perde a contagem.
 */
export function getTimerClickAction(status: TimerStatus): "close" | "pause-and-close" {
  return status === "finished" ? "close" : "pause-and-close";
}

/**
 * URL de intent do Android para criar um timer no app de relógio. Nenhum outro
 * sistema expõe isso para a web: no iOS não há esquema público e no desktop
 * não existe equivalente, então lá o fallback in-app é o caminho normal.
 */
export function buildAndroidTimerIntent(seconds: number, label: string): string {
  const safeLabel = label.replace(/[^\p{L}\p{N} ]/gu, "").slice(0, 60) || "Workout";
  return [
    "intent://timer/#Intent",
    "action=android.intent.action.SET_TIMER",
    `i.android.intent.extra.alarm.LENGTH=${Math.max(1, Math.floor(seconds))}`,
    `S.android.intent.extra.alarm.MESSAGE=${encodeURIComponent(safeLabel)}`,
    "B.android.intent.extra.alarm.SKIP_UI=true",
    "end",
  ].join(";");
}

export function isAndroid(userAgent: string): boolean {
  return /android/i.test(userAgent);
}
