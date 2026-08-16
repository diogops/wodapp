import { describe, expect, it } from "vitest";
import {
  buildAndroidTimerIntent,
  formatTimerDisplay,
  getTimerClickAction,
  isAndroid,
  parseDurationToSeconds,
} from "./workoutTimer";

describe("parseDurationToSeconds", () => {
  it("reads the duration formats used by the seeded workouts", () => {
    expect(parseDurationToSeconds("12 min")).toBe(720);
    expect(parseDurationToSeconds("20s")).toBe(20);
    expect(parseDurationToSeconds("30 min")).toBe(1800);
    expect(parseDurationToSeconds("40s")).toBe(40);
    expect(parseDurationToSeconds("8 min")).toBe(480);
  });

  it("sums compound durations", () => {
    expect(parseDurationToSeconds("1h 30min")).toBe(5400);
    expect(parseDurationToSeconds("2 minutos 30 segundos")).toBe(150);
  });

  it("refuses text that has no explicit time unit", () => {
    // "3 rounds" e "4 x 10-15" sao volume, nao tempo. Chutar um valor aqui
    // daria um timer errado no meio do treino.
    expect(parseDurationToSeconds("3 rounds")).toBeNull();
    expect(parseDurationToSeconds("4 x 10-15")).toBeNull();
    expect(parseDurationToSeconds("10")).toBeNull();
    expect(parseDurationToSeconds("")).toBeNull();
    expect(parseDurationToSeconds(null, undefined)).toBeNull();
  });

  it("falls through the sources in order and takes the first with a duration", () => {
    expect(parseDurationToSeconds(null, "3 rounds", "5 min")).toBe(300);
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

describe("buildAndroidTimerIntent", () => {
  it("encodes length and label into a SET_TIMER intent", () => {
    const intent = buildAndroidTimerIntent(720, "Técnica de corda");
    expect(intent).toContain("action=android.intent.action.SET_TIMER");
    expect(intent).toContain("i.android.intent.extra.alarm.LENGTH=720");
    expect(intent).toContain("B.android.intent.extra.alarm.SKIP_UI=true");
    expect(intent.endsWith(";end")).toBe(true);
  });

  it("keeps a usable label when the name is entirely punctuation", () => {
    expect(buildAndroidTimerIntent(60, "///")).toContain("MESSAGE=Workout");
  });
});

describe("isAndroid", () => {
  it("detects Android and rejects iOS", () => {
    expect(isAndroid("Mozilla/5.0 (Linux; Android 14) Chrome/120")).toBe(true);
    expect(isAndroid("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari")).toBe(false);
  });
});
