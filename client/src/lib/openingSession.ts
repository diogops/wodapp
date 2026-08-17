/**
 * Treino em andamento, no dispositivo.
 *
 * Fica em localStorage e não no servidor de propósito: "estou no meio deste
 * treino agora" é estado do aparelho na mão, não da conta — retomar no celular
 * um treino aberto no desktop seria errado. O servidor só recebe a sessão
 * quando ela termina.
 */

const STARTED_PREFIX = "wodapp:started:";

export function markWorkoutStarted(workoutId: number, at = Date.now()) {
  try {
    // `?? at` preserva o início original: cada exercício iniciado chamaria aqui.
    if (!readWorkoutStart(workoutId)) localStorage.setItem(`${STARTED_PREFIX}${workoutId}`, String(at));
  } catch {}
}

export function readWorkoutStart(workoutId: number): number | null {
  try {
    const raw = localStorage.getItem(`${STARTED_PREFIX}${workoutId}`);
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearWorkoutStart(workoutId: number) {
  try {
    localStorage.removeItem(`${STARTED_PREFIX}${workoutId}`);
  } catch {}
}

/** Treino aberto mais recentemente, se houver, entre os workouts conhecidos. */
export function findOpenWorkout(workoutIds: number[]): { workoutId: number; startedAt: number } | null {
  let best: { workoutId: number; startedAt: number } | null = null;
  for (const workoutId of workoutIds) {
    const startedAt = readWorkoutStart(workoutId);
    if (startedAt !== null && (!best || startedAt > best.startedAt)) best = { workoutId, startedAt };
  }
  return best;
}
