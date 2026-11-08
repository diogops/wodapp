import { describe, expect, it } from "vitest";
import { chooseNextWorkoutIndex, chooseRandomWorkoutIndex, rotationIndex } from "./workoutSelection";

describe("chooseRandomWorkoutIndex", () => {
  const workouts = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

  it("chooses a pending workout for the initial dashboard", () => {
    expect(chooseRandomWorkoutIndex(workouts, new Set([1]), -1, () => 0.5)).toBe(2);
  });

  it("chooses another workout when Próximo excludes the current one", () => {
    expect(chooseRandomWorkoutIndex(workouts, new Set(), 2, () => 0)).toBe(0);
    expect(chooseRandomWorkoutIndex(workouts, new Set(), 2, () => 0.99)).toBe(3);
  });
});

describe("treino arquivado", () => {
  const workouts = [
    { id: 1, modalityId: 7, title: "Dia 1", archived: true },
    { id: 2, modalityId: 7, title: "S1 · A", archived: false },
    { id: 3, modalityId: 7, title: "S1 · B", archived: false },
  ];

  it("não entra na rotação, mesmo nunca feito e com id menor", () => {
    expect(rotationIndex(workouts, 7, new Set([7]), {})).toBe(1);
    expect(chooseNextWorkoutIndex(workouts, new Set(), 1, new Set([7]), {})).toBe(2);
  });

  it("não entra no sorteio", () => {
    expect(chooseRandomWorkoutIndex(workouts, new Set(), -1, () => 0)).toBe(1);
  });

  it("rotação sem agenda não decide", () => {
    expect(rotationIndex(workouts, 7, new Set(), {})).toBe(-1);
    expect(rotationIndex(workouts, null, new Set([7]), {})).toBe(-1);
  });
});

describe("chooseNextWorkoutIndex", () => {
  const program = [
    { id: 10, modalityId: 2, title: "S1 · Dom" },
    { id: 11, modalityId: 2, title: "S1 · Ter" },
    { id: 12, modalityId: 2, title: "S1 · Qui" },
    { id: 13, modalityId: 2, title: "S1 · Sex" },
  ];

  it("follows the program order for a scheduled modality", () => {
    expect(chooseNextWorkoutIndex(program, new Set([10]), 0, new Set([2]), {}, () => 0.99)).toBe(1);
    expect(chooseNextWorkoutIndex(program, new Set(), 1, new Set([2]), { 10: "2026-10-25T10:00:00Z" }, () => 0.99)).toBe(2);
  });

  it("still draws at random without a schedule", () => {
    expect(chooseNextWorkoutIndex(program, new Set([10]), 0, new Set(), {}, () => 0.99)).toBe(3);
  });
});
