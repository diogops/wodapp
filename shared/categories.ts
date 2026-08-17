/**
 * Categorias de nível. Lista fechada e compartilhada: o formulário oferece as
 * mesmas opções que o servidor aceita, e o filtro do dashboard compara valores
 * idênticos — texto livre aqui quebraria o filtro silenciosamente.
 */
export const WORKOUT_CATEGORIES = [
  "Iniciante",
  "Intermediário",
  "Avançado",
  "Pro",
  "Elite",
] as const;

export type WorkoutCategory = (typeof WORKOUT_CATEGORIES)[number];

const CATEGORY_SET = new Set<string>(WORKOUT_CATEGORIES);

export const isWorkoutCategory = (value: string): value is WorkoutCategory =>
  CATEGORY_SET.has(value);

export const DEFAULT_CATEGORY: WorkoutCategory = "Intermediário";
