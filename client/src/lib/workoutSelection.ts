import { pickWorkoutForModality } from "@shared/resolveOpening";

export function chooseRandomWorkoutIndex<T extends { id: number; archived?: boolean }>(workouts: T[], completedIds: Set<number>, exclude = -1, random = Math.random) {
  const eligible = workouts.map((workout, index) => ({ workout, index })).filter(item => !item.workout.archived && item.index !== exclude);
  const pending = eligible.filter(item => !completedIds.has(item.workout.id));
  const pool = pending.length ? pending : eligible;
  return pool.length ? pool[Math.floor(random() * pool.length)].index : -1;
}

/**
 * Próximo da rotação do motor de abertura (execução mais antiga, nunca-feitos
 * primeiro, por id) numa modalidade com agenda; -1 sem agenda.
 */
export function rotationIndex<T extends { id: number; modalityId: number | null; title: string; archived?: boolean }>(
  workouts: T[],
  modalityId: number | null | undefined,
  scheduledModalityIds: Set<number>,
  lastPerformedAt: Record<number, string>,
  exclude = -1
) {
  if (modalityId == null || !scheduledModalityIds.has(modalityId)) return -1;
  const pool = workouts.filter((_, index) => index !== exclude).map(w => ({ ...w, lastPerformedAt: lastPerformedAt[w.id] ?? null }));
  const next = pickWorkoutForModality(pool, modalityId);
  return next ? workouts.findIndex(w => w.id === next.id) : -1;
}

/**
 * Depois de concluir ou pular: modalidade com agenda segue a rotação, senão o
 * programa Dom → Ter → Qui pularia dias. Sem agenda, continua o sorteio.
 */
export function chooseNextWorkoutIndex<T extends { id: number; modalityId: number | null; title: string; archived?: boolean }>(
  workouts: T[],
  completedIds: Set<number>,
  doneIndex: number,
  scheduledModalityIds: Set<number>,
  lastPerformedAt: Record<number, string>,
  random = Math.random
) {
  const index = rotationIndex(workouts, workouts[doneIndex]?.modalityId, scheduledModalityIds, lastPerformedAt, doneIndex);
  return index >= 0 ? index : chooseRandomWorkoutIndex(workouts, completedIds, doneIndex, random);
}
