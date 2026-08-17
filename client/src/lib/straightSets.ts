/**
 * Núcleo de `straight_sets` — o bloco de musculação.
 *
 * Aqui o eixo não é o cronômetro global do CrossFit, e sim: fazer a série,
 * registrar a carga, descansar, repetir. Estas funções ficam puras para que a
 * contagem de séries e o incremento de carga sejam testáveis sem tela.
 */

/** Incremento padrão em kg: o menor par de anilhas que se usa na prática. */
export const LOAD_STEP_KG = 2.5;

export type SetPlan = {
  /** Quantas séries o bloco prescreve. */
  total: number;
  /** Repetições alvo, como texto — pode ser faixa ("8-12"). */
  reps: string | null;
  /** Descanso entre séries, em segundos. */
  restSeconds: number;
};

/**
 * Lê a prescrição de séries do exercício. Aceita as formas que aparecem na
 * prática: `sets`/`reps` separados, "4x10" no texto, ou "4 séries de 8-12".
 * Sem número de séries devolve null — inventar um faria o app cobrar séries
 * que o treino não pediu.
 */
export function parseSetPlan(exercise: {
  sets?: string | null;
  reps?: string | null;
  prescription?: string | null;
}, defaultRestSeconds = 90): SetPlan | null {
  const explicitSets = firstInteger(exercise.sets);
  const text = exercise.prescription ?? "";

  // "4x10", "4 x 10-12", "4 séries de 8"
  const compact = text.match(/(\d+)\s*[x×]\s*([\d\-–a-zA-Z]+)/);
  const written = text.match(/(\d+)\s*s[ée]ries?\s*(?:de\s*)?([\d\-–]+)?/i);

  const total = explicitSets ?? firstInteger(compact?.[1]) ?? firstInteger(written?.[1]);
  if (!total || total < 1) return null;

  const reps =
    (exercise.reps && exercise.reps.trim()) ||
    compact?.[2]?.trim() ||
    written?.[2]?.trim() ||
    null;

  return { total, reps, restSeconds: parseRestSeconds(text) ?? defaultRestSeconds };
}

function firstInteger(value?: string | null) {
  if (!value) return null;
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
}

/** Lê "descanso 2min", "rest 90s", "desc. 120s" da prescrição. */
export function parseRestSeconds(text?: string | null): number | null {
  if (!text) return null;
  const match = text
    .toLowerCase()
    .match(/(?:descanso|desc\.?|rest|pausa)\D{0,6}(\d+(?:[.,]\d+)?)\s*(min|m|s|seg)?/);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  const unit = match[2] ?? "s";
  return Math.round(unit.startsWith("m") ? value * 60 : value);
}

/**
 * Ajusta a carga preservando o formato que o usuário usa. "60 kg" continua
 * "62.5 kg"; "corpo livre" não vira número. Nunca desce abaixo de zero.
 */
export function adjustLoad(current: string | null | undefined, deltaKg: number): string {
  const text = (current ?? "").trim();
  if (!text) return `${formatKg(Math.max(0, deltaKg))} kg`;

  const match = text.match(/(-?\d+(?:[.,]\d+)?)/);
  if (!match) return text; // "corpo livre", "faixa" — não é numérico, não mexe

  const value = Number(match[1].replace(",", "."));
  const next = Math.max(0, value + deltaKg);
  return text.replace(match[1], formatKg(next));
}

function formatKg(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

/**
 * Avanço após concluir uma série. Devolve o próximo índice e se o bloco acabou —
 * é isso que decide entre iniciar o descanso ou passar ao próximo exercício.
 */
export function advanceSet(completedIndex: number, plan: SetPlan) {
  const next = completedIndex + 1;
  return { nextIndex: next, finished: next >= plan.total };
}
