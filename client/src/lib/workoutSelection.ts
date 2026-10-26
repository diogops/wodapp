import { pickWorkoutForModality } from "@shared/resolveOpening";

export function chooseRandomWorkoutIndex<T extends { id: number }>(workouts: T[], completedIds: Set<number>, exclude = -1, random = Math.random) {
  const pending = workouts.map((workout, index) => ({ workout, index })).filter(item => !completedIds.has(item.workout.id) && item.index !== exclude);
  const pool = pending.length ? pending : workouts.map((workout, index) => ({ workout, index })).filter(item => item.index !== exclude);
  return pool.length ? pool[Math.floor(random() * pool.length)].index : -1;
}

/**
 * Depois de concluir ou pular: modalidade com agenda segue a rotação do motor
 * de abertura (execução mais antiga, nunca-feitos primeiro, por id), senão o
 * programa Dom → Ter → Qui pularia dias. Sem agenda, continua o sorteio.
 */
export function chooseNextWorkoutIndex<T extends { id: number; modalityId: number | null; title: string }>(
  workouts: T[],
  completedIds: Set<number>,
  doneIndex: number,
  scheduledModalityIds: Set<number>,
  lastPerformedAt: Record<number, string>,
  random = Math.random
) {
  const done = workouts[doneIndex];
  if (done?.modalityId != null && scheduledModalityIds.has(done.modalityId)) {
    const others = workouts.filter(w => w.id !== done.id).map(w => ({ ...w, lastPerformedAt: lastPerformedAt[w.id] ?? null }));
    const next = pickWorkoutForModality(others, done.modalityId);
    const index = next ? workouts.findIndex(w => w.id === next.id) : -1;
    if (index >= 0) return index;
  }
  return chooseRandomWorkoutIndex(workouts, completedIds, doneIndex, random);
}
