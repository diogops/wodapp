import { describe, expect, it } from "vitest";
import {
  buildLoadProgression,
  buildWeeklyVolume,
  parseLoadKg,
  startOfWeek,
  summarizeByModality,
  weekKey,
  type SessionRow,
  type SetLogRow,
} from "./historyStats";

const session = (over: Partial<SessionRow>): SessionRow => ({
  workoutId: 1,
  modalityId: 1,
  performedAt: "2026-08-12T07:00:00",
  action: "completed",
  durationSeconds: 1800,
  ...over,
});

describe("semana", () => {
  it("começa na segunda-feira", () => {
    // 2026-08-16 é domingo; a semana dele começa na segunda 2026-08-10.
    expect(weekKey(new Date("2026-08-16T22:00:00"))).toBe("2026-08-10");
    expect(weekKey(new Date("2026-08-10T00:30:00"))).toBe("2026-08-10");
    expect(weekKey(new Date("2026-08-17T00:30:00"))).toBe("2026-08-17");
  });

  it("zera a hora", () => {
    const start = startOfWeek(new Date("2026-08-16T22:00:00"));
    expect([start.getHours(), start.getMinutes()]).toEqual([0, 0]);
  });
});

describe("buildWeeklyVolume", () => {
  it("mantém as semanas vazias na série", () => {
    const weeks = buildWeeklyVolume([session({ performedAt: "2026-08-12T07:00:00" })], new Date("2026-08-16T12:00:00"), 4);
    expect(weeks).toHaveLength(4);
    expect(weeks.map(week => week.total)).toEqual([0, 0, 0, 1]);
  });

  it("separa por modalidade e soma o tempo", () => {
    const weeks = buildWeeklyVolume(
      [
        session({ modalityId: 1 }),
        session({ modalityId: 2, durationSeconds: 600 }),
        session({ modalityId: 1, durationSeconds: null }),
      ],
      new Date("2026-08-16T12:00:00"),
      2
    );
    const last = weeks[weeks.length - 1];
    expect(last.byModality).toEqual({ 1: 2, 2: 1 });
    expect(last.total).toBe(3);
    expect(last.totalSeconds).toBe(2400);
  });

  it("ignora sessões puladas e as de fora da janela", () => {
    const weeks = buildWeeklyVolume(
      [
        session({ action: "skipped" }),
        session({ performedAt: "2025-01-01T07:00:00" }),
      ],
      new Date("2026-08-16T12:00:00"),
      4
    );
    expect(weeks.every(week => week.total === 0)).toBe(true);
  });

  it("workout sem modalidade cai na chave 0 em vez de sumir", () => {
    const weeks = buildWeeklyVolume([session({ modalityId: null })], new Date("2026-08-16T12:00:00"), 2);
    expect(weeks[weeks.length - 1].byModality[0]).toBe(1);
  });
});

describe("summarizeByModality", () => {
  it("conta sessões, tempo e a última execução, mais frequente primeiro", () => {
    const summaries = summarizeByModality([
      session({ modalityId: 2, performedAt: "2026-08-14T07:00:00" }),
      session({ modalityId: 1, performedAt: "2026-08-10T07:00:00" }),
      session({ modalityId: 1, performedAt: "2026-08-15T07:00:00" }),
      session({ modalityId: 1, action: "skipped", performedAt: "2026-08-16T07:00:00" }),
    ]);
    expect(summaries[0]).toMatchObject({ modalityId: 1, sessions: 2 });
    expect(summaries[0].lastPerformedAt).toContain("2026-08-15");
    expect(summaries[1]).toMatchObject({ modalityId: 2, sessions: 1 });
  });
});

describe("parseLoadKg", () => {
  it("lê número de textos livres e devolve null quando não há", () => {
    expect(parseLoadKg("60 kg")).toBe(60);
    expect(parseLoadKg("62,5kg")).toBe(62.5);
    expect(parseLoadKg("corpo livre")).toBeNull();
    expect(parseLoadKg(null)).toBeNull();
  });
});

describe("buildLoadProgression", () => {
  const log = (over: Partial<SetLogRow>): SetLogRow => ({
    exerciseName: "Back Squat",
    load: "60 kg",
    reps: 8,
    completedAt: "2026-08-03T07:00:00",
    modalityId: 2,
    ...over,
  });

  it("toma o pico de cada semana e calcula a diferença", () => {
    const progression = buildLoadProgression([
      log({ completedAt: "2026-08-03T07:00:00", load: "60 kg" }),
      log({ completedAt: "2026-08-03T07:20:00", load: "50 kg" }),
      log({ completedAt: "2026-08-10T07:00:00", load: "65 kg" }),
    ]);
    expect(progression).toHaveLength(1);
    expect(progression[0].points.map(point => point.maxKg)).toEqual([60, 65]);
    expect(progression[0].points[0].sets).toBe(2);
    expect(progression[0].deltaKg).toBe(5);
  });

  it("exercício com uma semana só não vira tendência", () => {
    expect(buildLoadProgression([log({})])).toHaveLength(0);
  });

  it("ignora carga não numérica", () => {
    expect(buildLoadProgression([
      log({ exerciseName: "Pull-up", load: "corpo livre", completedAt: "2026-08-03T07:00:00" }),
      log({ exerciseName: "Pull-up", load: "corpo livre", completedAt: "2026-08-10T07:00:00" }),
    ])).toHaveLength(0);
  });

  it("ordena pela maior evolução", () => {
    const progression = buildLoadProgression([
      log({ exerciseName: "Deadlift", load: "100 kg", completedAt: "2026-08-03T07:00:00" }),
      log({ exerciseName: "Deadlift", load: "120 kg", completedAt: "2026-08-10T07:00:00" }),
      log({ exerciseName: "Back Squat", load: "60 kg", completedAt: "2026-08-03T07:00:00" }),
      log({ exerciseName: "Back Squat", load: "62.5 kg", completedAt: "2026-08-10T07:00:00" }),
    ]);
    expect(progression.map(item => item.exerciseName)).toEqual(["Deadlift", "Back Squat"]);
  });
});
