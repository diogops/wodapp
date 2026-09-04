import { describe, expect, it } from "vitest";
import {
  getWorkoutDemoState,
  getWorkoutShellClass,
  isWorkoutLocked,
  WORKOUT_DEMO_MODAL_CLASS,
  WORKOUT_MODE_CLASS,
} from "./workoutMode";

describe("workout mode shell", () => {
  it("locks the viewport only on Hoje", () => {
    expect(getWorkoutShellClass("today")).toBe(WORKOUT_MODE_CLASS);
    expect(getWorkoutShellClass("library")).toBe("");
    expect(getWorkoutShellClass("history")).toBe("");
  });

  it("waits for the page to settle at the top before locking", () => {
    expect(getWorkoutShellClass("today", false)).toBe("");
    expect(isWorkoutLocked("today", false)).toBe(false);
    expect(isWorkoutLocked("today", true)).toBe(true);
    expect(isWorkoutLocked("library", true)).toBe(false);
  });

  it("opens the controlled demonstration layer without changing global scroll state", () => {
    expect(getWorkoutDemoState(false)).toEqual({ open: false, modalClass: "hidden", globalScroll: "locked" });
    expect(getWorkoutDemoState(true)).toEqual({ open: true, modalClass: WORKOUT_DEMO_MODAL_CLASS, globalScroll: "locked" });
  });
});
