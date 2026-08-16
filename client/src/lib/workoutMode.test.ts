import { describe, expect, it } from "vitest";
import {
  getWorkoutDemoState,
  getWorkoutShellClass,
  WORKOUT_DEMO_MODAL_CLASS,
  WORKOUT_MODE_CLASS,
} from "./workoutMode";

describe("workout mode shell", () => {
  it("locks the viewport only on Hoje", () => {
    expect(getWorkoutShellClass("today")).toBe(WORKOUT_MODE_CLASS);
    expect(getWorkoutShellClass("library")).toBe("");
    expect(getWorkoutShellClass("history")).toBe("");
  });

  it("opens the controlled demonstration layer without changing global scroll state", () => {
    expect(getWorkoutDemoState(false)).toEqual({ open: false, modalClass: "hidden", globalScroll: "locked" });
    expect(getWorkoutDemoState(true)).toEqual({ open: true, modalClass: WORKOUT_DEMO_MODAL_CLASS, globalScroll: "locked" });
  });
});
