import { describe, expect, it } from "vitest";
import { buildWeekPreview, findScheduleConflicts, type ScheduleRuleLike } from "./scheduleConflicts";

const rule = (over: Partial<ScheduleRuleLike> & { id: number }): ScheduleRuleLike => ({
  modalityId: 1,
  weekdays: [1, 3, 5],
  startTime: "06:30",
  durationMinutes: 60,
  enabled: true,
  ...over,
});

describe("findScheduleConflicts", () => {
  it("acusa sobreposição no mesmo dia", () => {
    const conflicts = findScheduleConflicts([
      rule({ id: 1, weekdays: [3], startTime: "18:00" }),
      rule({ id: 2, weekdays: [3], startTime: "19:00", modalityId: 2 }),
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].weekday).toBe(3);
  });

  it("não acusa quando os dias não coincidem", () => {
    expect(findScheduleConflicts([
      rule({ id: 1, weekdays: [1], startTime: "18:00" }),
      rule({ id: 2, weekdays: [2], startTime: "18:00" }),
    ])).toHaveLength(0);
  });

  it("não acusa quando o intervalo é maior que a tolerância", () => {
    // 06:30 + 60min + 45min de tolerância acaba 08:15; a próxima às 09:00 cabe.
    expect(findScheduleConflicts([
      rule({ id: 1, weekdays: [3], startTime: "06:30" }),
      rule({ id: 2, weekdays: [3], startTime: "09:00" }),
    ])).toHaveLength(0);
  });

  it("ignora regras desabilitadas e regras sem horário", () => {
    expect(findScheduleConflicts([
      rule({ id: 1, weekdays: [3], startTime: "18:00" }),
      rule({ id: 2, weekdays: [3], startTime: "18:10", enabled: false }),
      rule({ id: 3, weekdays: [3], startTime: null }),
    ])).toHaveLength(0);
  });
});

describe("buildWeekPreview", () => {
  it("distribui por dia, ordena por horário e marca os conflitados", () => {
    const week = buildWeekPreview([
      rule({ id: 1, weekdays: [3], startTime: "19:00" }),
      rule({ id: 2, weekdays: [3], startTime: "18:00" }),
      rule({ id: 3, weekdays: [3], startTime: null }),
      rule({ id: 4, weekdays: [6], startTime: "09:00" }),
    ]);

    expect(week).toHaveLength(7);
    expect(week[3].map(slot => slot.rule.id)).toEqual([2, 1, 3]); // sem horário por último
    expect(week[3].map(slot => slot.conflicted)).toEqual([true, true, false]);
    expect(week[6].map(slot => slot.rule.id)).toEqual([4]);
    expect(week[0]).toEqual([]);
  });
});
