import { describe, expect, it } from "vitest";
import { findNextExercise, formatTimerDisplay, getTimerClickAction } from "./workoutTimer";

describe("findNextExercise", () => {
  const list = [
    { id: "a", name: "Burpees" },
    { id: "b", name: "Double Unders" },
    { id: "c", name: "Bike" },
  ];

  it("returns the following exercise", () => {
    expect(findNextExercise(list, "a")?.id).toBe("b");
  });

  it("skips the ones already done", () => {
    expect(findNextExercise(list, "a", new Set(["b"]))?.id).toBe("c");
  });

  it("returns null at the end and for an unknown id", () => {
    expect(findNextExercise(list, "c")).toBeNull();
    expect(findNextExercise(list, "a", new Set(["b", "c"]))).toBeNull();
    expect(findNextExercise(list, "inexistente")).toBeNull();
  });
});

describe("formatTimerDisplay", () => {
  it("shows mm:ss under an hour and h:mm:ss above it", () => {
    expect(formatTimerDisplay(720)).toBe("12:00");
    expect(formatTimerDisplay(59)).toBe("00:59");
    expect(formatTimerDisplay(3661)).toBe("1:01:01");
  });

  it("never renders a negative countdown", () => {
    expect(formatTimerDisplay(-5)).toBe("00:00");
  });
});

describe("getTimerClickAction", () => {
  it("pauses before closing while time is left, and just closes when finished", () => {
    expect(getTimerClickAction("running")).toBe("pause-and-close");
    expect(getTimerClickAction("paused")).toBe("pause-and-close");
    expect(getTimerClickAction("finished")).toBe("close");
  });
});
