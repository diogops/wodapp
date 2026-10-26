// Núcleo do cronômetro de exercício: regras de interação, puras para serem
// testáveis sem DOM. O atleta marca início e fim; o app não impõe tempo.

export type TimerStatus = "running" | "paused" | "finished";

export type TimerExercise = { id: string; name: string };

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
