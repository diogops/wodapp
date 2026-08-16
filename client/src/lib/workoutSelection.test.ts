import { describe, expect, it } from "vitest";
import { chooseRandomWorkoutIndex } from "./workoutSelection";

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
