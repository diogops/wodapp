export function chooseRandomWorkoutIndex<T extends { id: number }>(workouts: T[], completedIds: Set<number>, exclude = -1, random = Math.random) {
  const pending = workouts.map((workout, index) => ({ workout, index })).filter(item => !completedIds.has(item.workout.id) && item.index !== exclude);
  const pool = pending.length ? pending : workouts.map((workout, index) => ({ workout, index })).filter(item => item.index !== exclude);
  return pool.length ? pool[Math.floor(random() * pool.length)].index : -1;
}
