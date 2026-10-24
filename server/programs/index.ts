import type { BlockKind } from "@shared/modalities";
import { FORTALECIMENTO_PROGRAM } from "./fortalecimento";
import { MUSCULACAO_PROGRAM } from "./musculacao";

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
  /**
   * Uma regra só, sem treino preferido, para todos estes dias: o motor de
   * abertura entrega o próximo da fila. Para séries em que a ordem importa
   * mais que o dia; nesse caso os treinos têm `weekday` nulo.
   */
  scheduleWeekdays?: number[];
  workouts: SeedWorkout[];
};

export const SEED_PROGRAMS: SeedProgram[] = [FORTALECIMENTO_PROGRAM, MUSCULACAO_PROGRAM];
