/**
 * Agregação do histórico: volume semanal por modalidade e evolução de carga.
 *
 * Puro e sem SQL de propósito. As duas perguntas que importam — "estou
 * treinando quanto por semana, em cada modalidade?" e "esta carga está
 * subindo?" — dependem de parsing de texto (a carga é livre: "60 kg",
 * "corpo livre", "faixa vermelha"), e isso é código de aplicação, não de banco.
 */

export type SessionRow = {
  workoutId: number;
  modalityId: number | null;
  performedAt: string | Date;
  action: "completed" | "skipped";
  durationSeconds: number | null;
};

export type SetLogRow = {
  exerciseName: string;
  load: string | null;
  reps: number | null;
  completedAt: string | Date;
  modalityId: number | null;
};

const DAY_MS = 86_400_000;

const toDate = (value: string | Date) => (value instanceof Date ? value : new Date(value));

/**
 * Início da semana (segunda-feira) em horário LOCAL. Semana começando no
 * domingo jogaria o treino de domingo para a semana seguinte, que não é como
 * ninguém lê a própria rotina.
 */
export function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const shift = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - shift);
  return start;
}

export const weekKey = (date: Date) => {
  const start = startOfWeek(date);
  const month = String(start.getMonth() + 1).padStart(2, "0");
  return `${start.getFullYear()}-${month}-${String(start.getDate()).padStart(2, "0")}`;
};

export type WeeklyVolume = {
  weekStart: string;
  /** Sessões concluídas por modalidade. Chave = modalityId, 0 = sem modalidade. */
  byModality: Record<number, number>;
  total: number;
  totalSeconds: number;
};

/**
 * Volume semanal das últimas `weeks` semanas, incluindo semanas vazias — uma
 * semana sem treino é o dado mais importante do gráfico e some se a série
 * pular os buracos.
 */
export function buildWeeklyVolume(sessions: SessionRow[], now: Date, weeks = 8): WeeklyVolume[] {
  const buckets = new Map<string, WeeklyVolume>();
  const firstWeek = startOfWeek(new Date(now.getTime() - (weeks - 1) * 7 * DAY_MS));

  for (let index = 0; index < weeks; index++) {
    const start = new Date(firstWeek.getTime() + index * 7 * DAY_MS);
    buckets.set(weekKey(start), { weekStart: weekKey(start), byModality: {}, total: 0, totalSeconds: 0 });
  }

  for (const session of sessions) {
    if (session.action !== "completed") continue;
    const bucket = buckets.get(weekKey(toDate(session.performedAt)));
    if (!bucket) continue; // fora da janela
    const key = session.modalityId ?? 0;
    bucket.byModality[key] = (bucket.byModality[key] ?? 0) + 1;
    bucket.total += 1;
    bucket.totalSeconds += session.durationSeconds ?? 0;
  }

  return [...buckets.values()];
}

export type ModalitySummary = {
  modalityId: number;
  sessions: number;
  totalSeconds: number;
  lastPerformedAt: string | null;
};

export function summarizeByModality(sessions: SessionRow[]): ModalitySummary[] {
  const summaries = new Map<number, ModalitySummary>();

  for (const session of sessions) {
    if (session.action !== "completed") continue;
    const key = session.modalityId ?? 0;
    const summary = summaries.get(key) ?? { modalityId: key, sessions: 0, totalSeconds: 0, lastPerformedAt: null };
    summary.sessions += 1;
    summary.totalSeconds += session.durationSeconds ?? 0;
    const performed = toDate(session.performedAt).toISOString();
    if (!summary.lastPerformedAt || summary.lastPerformedAt < performed) summary.lastPerformedAt = performed;
    summaries.set(key, summary);
  }

  return [...summaries.values()].sort((a, b) => b.sessions - a.sessions);
}

/** Número em kg dentro de um texto de carga. "corpo livre" não tem — devolve null. */
export function parseLoadKg(load: string | null | undefined): number | null {
  if (!load) return null;
  const match = load.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

export type LoadPoint = { weekStart: string; maxKg: number; sets: number };
export type LoadProgression = {
  exerciseName: string;
  modalityId: number | null;
  points: LoadPoint[];
  firstKg: number;
  lastKg: number;
  deltaKg: number;
};

/**
 * Evolução de carga por exercício, tomando o pico de cada semana. Pico e não
 * média: a série pesada é o que indica progressão, e a média afunda quando o
 * atleta faz séries leves de técnica no mesmo dia.
 *
 * Exercícios com uma única semana registrada ficam de fora — um ponto não é
 * evolução, e mostrá-lo como tal seria inventar tendência.
 */
export function buildLoadProgression(logs: SetLogRow[], minWeeks = 2): LoadProgression[] {
  const byExercise = new Map<string, { modalityId: number | null; weeks: Map<string, LoadPoint> }>();

  for (const log of logs) {
    const kg = parseLoadKg(log.load);
    if (kg === null) continue; // "corpo livre", "faixa" — não é progressão de carga
    const name = log.exerciseName.trim();
    if (!name) continue;

    const entry = byExercise.get(name) ?? { modalityId: log.modalityId, weeks: new Map() };
    const key = weekKey(toDate(log.completedAt));
    const point = entry.weeks.get(key) ?? { weekStart: key, maxKg: kg, sets: 0 };
    point.maxKg = Math.max(point.maxKg, kg);
    point.sets += 1;
    entry.weeks.set(key, point);
    byExercise.set(name, entry);
  }

  return [...byExercise.entries()]
    .map(([exerciseName, entry]) => {
      const points = [...entry.weeks.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
      return {
        exerciseName,
        modalityId: entry.modalityId,
        points,
        firstKg: points[0].maxKg,
        lastKg: points[points.length - 1].maxKg,
        deltaKg: Number((points[points.length - 1].maxKg - points[0].maxKg).toFixed(2)),
      };
    })
    .filter(progression => progression.points.length >= minWeeks)
    .sort((a, b) => b.deltaKg - a.deltaKg || a.exerciseName.localeCompare(b.exerciseName, "pt-BR"));
}
