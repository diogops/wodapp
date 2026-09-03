import type { BlockKind } from "@shared/modalities";
import { FORTALECIMENTO_PROGRAM } from "./fortalecimento";

/**
 * Programa transcrito de um PDF e semeado por `ensureProgramWorkouts`. É dado,
 * como `DEFAULT_WORKOUTS`: cada treino vira um workout da modalidade indicada
 * e, quando `weekday` está preenchido, uma regra de agenda só de dia.
 */
export type SeedExercise = {
  name: string;
  prescription?: string;
  sets?: string;
  reps?: string;
  duration?: string;
  load?: string;
  notes?: string;
  /** Caminho estático em `client/public` (ex.: `/demos/x.jpg`). */
  imageUrl?: string;
};

export type SeedSection = {
  title: string;
  format?: string;
  kind: BlockKind;
  notes?: string;
  exercises: SeedExercise[];
};

export type SeedWorkout = {
  title: string;
  focus: string;
  level: string;
  notes?: string;
  /** Dia da semana sugerido, 0=domingo. Nulo = sem regra de agenda. */
  weekday: number | null;
  sections: SeedSection[];
};

export type SeedProgram = {
  modalitySlug: string;
  /** Identidade do seed: um workout do usuário com este nome já conta como semeado. */
  sourceFileName: string;
  durationMinutes: number;
  workouts: SeedWorkout[];
};

export const SEED_PROGRAMS: SeedProgram[] = [FORTALECIMENTO_PROGRAM];
