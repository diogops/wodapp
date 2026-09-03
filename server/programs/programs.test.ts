import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BUILT_IN_MODALITIES } from "@shared/modalities";
import { workoutSchema } from "../routers";
import { SEED_PROGRAMS } from "./index";
import { FORTALECIMENTO_IMAGE_URLS, FORTALECIMENTO_PROGRAM } from "./fortalecimento";

const PUBLIC_DIR = path.resolve(__dirname, "../../client/public");

describe("programas semeados", () => {
  it("apontam para uma modalidade embutida", () => {
    const slugs = new Set(BUILT_IN_MODALITIES.map(m => m.slug));
    for (const program of SEED_PROGRAMS) {
      expect(slugs.has(program.modalitySlug), program.sourceFileName).toBe(true);
    }
  });

  it("passam pelo mesmo schema que um workout criado pela UI", () => {
    // O seed entra por `createWorkout`, não pelo router — então nada o validaria
    // se este teste não existisse.
    for (const program of SEED_PROGRAMS) {
      for (const { weekday: _weekday, ...workout } of program.workouts) {
        expect(() => workoutSchema.parse(workout), workout.title).not.toThrow();
      }
    }
  });

  it("usam só os tipos de bloco que a gramática da modalidade permite", () => {
    for (const program of SEED_PROGRAMS) {
      const grammar = BUILT_IN_MODALITIES.find(m => m.slug === program.modalitySlug)!.grammar;
      for (const workout of program.workouts) {
        for (const section of workout.sections) {
          expect(grammar.allowedBlockKinds, `${workout.title} / ${section.title}`).toContain(section.kind);
        }
      }
    }
  });

  it("referenciam imagens que existem em client/public", () => {
    for (const program of SEED_PROGRAMS) {
      for (const workout of program.workouts) {
        for (const section of workout.sections) {
          for (const exercise of section.exercises) {
            if (!exercise.imageUrl) continue;
            expect(exercise.imageUrl.startsWith("/demos/"), exercise.name).toBe(true);
            expect(existsSync(path.join(PUBLIC_DIR, exercise.imageUrl)), exercise.imageUrl).toBe(true);
          }
        }
      }
    }
  });
});

describe("programa de fortalecimento", () => {
  it("tem os quatro dias do PDF, cada um com oito blocos e uma imagem por exercício", () => {
    expect(FORTALECIMENTO_PROGRAM.workouts.map(w => w.title)).toEqual([
      "Dia 1 — Clean e força de pernas",
      "Dia 2 — Snatch e posição overhead",
      "Dia 3 — Ginástica: BMU e RMU",
      "Dia 4 — Handstand, pistols e DU",
    ]);
    for (const workout of FORTALECIMENTO_PROGRAM.workouts) {
      expect(workout.sections, workout.title).toHaveLength(8);
      for (const section of workout.sections) {
        expect(section.exercises.length, section.title).toBeGreaterThan(0);
        for (const exercise of section.exercises) expect(exercise.imageUrl, exercise.name).toBeTruthy();
      }
    }
  });

  it("distribui os dias na semana sem repetir dia", () => {
    const weekdays = FORTALECIMENTO_PROGRAM.workouts.map(w => w.weekday);
    expect(weekdays.every(day => day !== null)).toBe(true);
    expect(new Set(weekdays).size).toBe(weekdays.length);
  });

  it("usa as dez ilustrações do PDF, todas presentes", () => {
    expect(FORTALECIMENTO_IMAGE_URLS).toHaveLength(10);
    const used = new Set(
      FORTALECIMENTO_PROGRAM.workouts.flatMap(w => w.sections.flatMap(s => s.exercises.map(e => e.imageUrl)))
    );
    expect([...used].sort()).toEqual([...FORTALECIMENTO_IMAGE_URLS].sort());
  });

  it("dá séries e reps aos blocos de força para o SetTracker cobrar cada série", () => {
    for (const workout of FORTALECIMENTO_PROGRAM.workouts) {
      for (const section of workout.sections.filter(s => s.kind === "straight_sets")) {
        for (const exercise of section.exercises) {
          expect(Number(exercise.sets), `${workout.title} / ${exercise.name}`).toBeGreaterThan(0);
          expect(exercise.reps, exercise.name).toBeTruthy();
        }
      }
    }
  });
});
