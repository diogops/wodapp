import { describe, expect, it } from "vitest";
import {
  pickWorkoutForModality,
  resolveOpening,
  type OpeningPrefs,
  type OpeningState,
} from "./resolveOpening";

const prefs: OpeningPrefs = {
  autoStartEnabled: true,
  scheduleLeadMinutes: 60,
  scheduleGraceMinutes: 45,
  resumeWindowHours: 6,
};

const crossfit = { id: 1, name: "CrossFit" };
const strength = { id: 2, name: "Musculação" };

const wodA = { id: 10, modalityId: 1, title: "WOD A", lastPerformedAt: "2026-08-01T10:00:00" };
const wodB = { id: 11, modalityId: 1, title: "WOD B", lastPerformedAt: null };
const pushA = { id: 20, modalityId: 2, title: "Push A", lastPerformedAt: "2026-08-10T19:00:00" };

/** Constrói uma data LOCAL — a resolução é toda em horário do dispositivo. */
const at = (iso: string) => new Date(iso);

function state(over: Partial<OpeningState> = {}): OpeningState {
  return {
    modalities: [crossfit, strength],
    workouts: [wodA, wodB, pushA],
    rules: [],
    ...over,
  };
}

describe("resolveOpening — um caso por ResolutionReason", () => {
  it("no_modalities → onboarding", () => {
    const result = resolveOpening(at("2026-08-19T06:00:00"), state({ modalities: [] }), prefs);
    expect(result.kind).toBe("onboarding");
  });

  it("session_in_progress → resume, e retomar ganha de qualquer agenda", () => {
    const session = {
      id: 1, workoutId: 10, modalityId: 1,
      startedAt: "2026-08-19T05:30:00", status: "in_progress" as const,
    };
    const result = resolveOpening(at("2026-08-19T06:00:00"), state({ activeSession: session }), prefs);
    expect(result).toMatchObject({ kind: "resume", reason: "session_in_progress" });
  });

  it("sessão fora da janela de retomada não conta", () => {
    const session = {
      id: 1, workoutId: 10, modalityId: 1,
      startedAt: "2026-08-18T20:00:00", status: "in_progress" as const,
    };
    // 10h depois, com resumeWindowHours = 6.
    const result = resolveOpening(at("2026-08-19T06:00:00"), state({ activeSession: session }), prefs);
    expect(result.kind).not.toBe("resume");
  });

  it("user_locked → picker quando o auto-start está desligado", () => {
    const result = resolveOpening(
      at("2026-08-19T06:00:00"),
      state(),
      { ...prefs, autoStartEnabled: false }
    );
    expect(result).toMatchObject({ kind: "picker", reason: "user_locked" });
  });

  it("single_modality → auto", () => {
    const result = resolveOpening(at("2026-08-19T06:00:00"), state({ modalities: [crossfit] }), prefs);
    expect(result).toMatchObject({ kind: "auto", reason: "single_modality" });
  });

  it("single_scheduled_today → auto", () => {
    // 2026-08-19 é uma quarta-feira.
    const rules = [
      { id: 1, modalityId: 1, weekdays: [3], startTime: "06:30", durationMinutes: 60, preferredWorkoutId: null, enabled: true },
    ];
    const result = resolveOpening(at("2026-08-19T15:00:00"), state({ rules }), prefs);
    expect(result).toMatchObject({ kind: "auto", reason: "single_scheduled_today" });
    expect((result as any).modality.id).toBe(1);
  });

  it("time_window_match → auto na janela certa", () => {
    const rules = [
      { id: 1, modalityId: 1, weekdays: [3], startTime: "06:30", durationMinutes: 60, preferredWorkoutId: null, enabled: true },
      { id: 2, modalityId: 2, weekdays: [3], startTime: "19:00", durationMinutes: 60, preferredWorkoutId: null, enabled: true },
    ];
    // 06:45 está dentro de [06:30, 08:15] só do CrossFit.
    const result = resolveOpening(at("2026-08-19T06:45:00"), state({ rules }), prefs);
    expect(result).toMatchObject({ kind: "auto", reason: "time_window_match" });
    expect((result as any).modality.id).toBe(1);
  });

  it("nearest_upcoming → auto quando só uma regra futura está próxima", () => {
    const rules = [
      { id: 1, modalityId: 1, weekdays: [3], startTime: "06:30", durationMinutes: 60, preferredWorkoutId: null, enabled: true },
      { id: 2, modalityId: 2, weekdays: [3], startTime: "23:00", durationMinutes: 60, preferredWorkoutId: null, enabled: true },
    ];
    // 22:10: a janela das 06:30 acabou há muito, e 23:00 está dentro dos 60min
    // de antecedência sem ter começado.
    const result = resolveOpening(at("2026-08-19T22:10:00"), state({ rules }), prefs);
    expect(result).toMatchObject({ kind: "auto", reason: "nearest_upcoming" });
    expect((result as any).modality.id).toBe(2);
  });

  it("ambiguous_time → picker só com as que se sobrepõem, mais próxima primeiro", () => {
    const rules = [
      { id: 1, modalityId: 1, weekdays: [3], startTime: "18:00", durationMinutes: 60, preferredWorkoutId: null, enabled: true },
      { id: 2, modalityId: 2, weekdays: [3], startTime: "19:00", durationMinutes: 60, preferredWorkoutId: null, enabled: true },
    ];
    // 19:10 cai nas duas janelas: [18:00, 19:45] e [19:00, 20:45].
    const result = resolveOpening(at("2026-08-19T19:10:00"), state({ rules }), prefs);
    expect(result).toMatchObject({ kind: "picker", reason: "ambiguous_time" });
    const candidates = (result as any).candidates;
    expect(candidates).toHaveLength(2);
    // 18:00 começou há 70min; 19:00 há 10min — a mais próxima vem primeiro.
    expect(candidates[0].modality.id).toBe(2);
  });

  it("multiple_today → picker apenas com as regras de hoje", () => {
    const rules = [
      { id: 1, modalityId: 1, weekdays: [3], startTime: "06:00", durationMinutes: 60, preferredWorkoutId: null, enabled: true },
      { id: 2, modalityId: 2, weekdays: [3], startTime: "20:00", durationMinutes: 60, preferredWorkoutId: null, enabled: true },
    ];
    // 13:00: fora de todas as janelas e longe da próxima.
    const result = resolveOpening(at("2026-08-19T13:00:00"), state({ rules }), prefs);
    expect(result).toMatchObject({ kind: "picker", reason: "multiple_today" });
    expect((result as any).candidates).toHaveLength(2);
  });

  it("multiple_today quando alguma regra não tem horário — sem chute", () => {
    const rules = [
      { id: 1, modalityId: 1, weekdays: [3], startTime: null, durationMinutes: 60, preferredWorkoutId: null, enabled: true },
      { id: 2, modalityId: 2, weekdays: [3], startTime: "19:00", durationMinutes: 60, preferredWorkoutId: null, enabled: true },
    ];
    const result = resolveOpening(at("2026-08-19T18:50:00"), state({ rules }), prefs);
    expect(result).toMatchObject({ kind: "picker", reason: "multiple_today" });
  });

  it("nothing_scheduled → picker com todas, ordenadas", () => {
    const rules = [
      // Regra de segunda, e hoje é quarta.
      { id: 1, modalityId: 1, weekdays: [1], startTime: "06:30", durationMinutes: 60, preferredWorkoutId: null, enabled: true },
    ];
    const result = resolveOpening(
      at("2026-08-19T10:00:00"),
      state({ rules, recentUseByModality: { 2: 5, 1: 1 } }),
      prefs
    );
    expect(result).toMatchObject({ kind: "picker", reason: "nothing_scheduled" });
    // Musculação foi mais usada nos últimos 30 dias.
    expect((result as any).candidates[0].modality.id).toBe(2);
  });

  it("regra desabilitada não conta", () => {
    const rules = [
      { id: 1, modalityId: 1, weekdays: [3], startTime: "06:30", durationMinutes: 60, preferredWorkoutId: null, enabled: false },
    ];
    const result = resolveOpening(at("2026-08-19T06:20:00"), state({ rules }), prefs);
    expect((result as any).reason).toBe("nothing_scheduled");
  });
});

describe("rotação de treino", () => {
  it("escolhe o nunca executado antes do mais antigo", () => {
    expect(pickWorkoutForModality([wodA, wodB], 1)!.id).toBe(wodB.id);
  });

  it("respeita preferredWorkoutId da regra", () => {
    const rule = { id: 1, modalityId: 1, weekdays: [3], startTime: null, durationMinutes: 60, preferredWorkoutId: 10, enabled: true };
    expect(pickWorkoutForModality([wodA, wodB], 1, rule)!.id).toBe(10);
  });

  it("ignora arquivados e devolve null sem treino", () => {
    expect(pickWorkoutForModality([{ ...wodA, archived: true }], 1)).toBeNull();
    expect(pickWorkoutForModality([], 1)).toBeNull();
  });

  it("modalidade sem treinos resolve para auto com workout nulo", () => {
    // A tela usa isto para levar à criação já com a modalidade escolhida.
    const result = resolveOpening(
      at("2026-08-19T06:00:00"),
      state({ modalities: [crossfit], workouts: [] }),
      prefs
    );
    expect(result).toMatchObject({ kind: "auto", workout: null });
  });
});

describe("armadilhas de horário", () => {
  it("usa o dia LOCAL, não UTC", () => {
    // 23:30 local de quarta. Em UTC já seria quinta em vários fusos; a regra de
    // quarta precisa continuar valendo.
    const rules = [
      { id: 1, modalityId: 1, weekdays: [3], startTime: null, durationMinutes: 60, preferredWorkoutId: null, enabled: true },
    ];
    const result = resolveOpening(at("2026-08-19T23:30:00"), state({ rules }), prefs);
    expect(result).toMatchObject({ kind: "auto", reason: "single_scheduled_today" });
  });

  it("janela que cruza a meia-noite não estica para o dia seguinte", () => {
    const rules = [
      { id: 1, modalityId: 1, weekdays: [3], startTime: "23:00", durationMinutes: 90, preferredWorkoutId: null, enabled: true },
      { id: 2, modalityId: 2, weekdays: [3], startTime: "06:00", durationMinutes: 60, preferredWorkoutId: null, enabled: true },
    ];
    // 00:30 de QUINTA: nenhuma regra de quarta se aplica mais.
    const result = resolveOpening(at("2026-08-20T00:30:00"), state({ rules }), prefs);
    expect((result as any).reason).toBe("nothing_scheduled");
  });

  it("antecedência não conta como janela já iniciada", () => {
    // Regressão: com a antecedência dentro da janela, `nearest_upcoming` era
    // inalcançável — tudo que estava para começar virava `time_window_match`.
    const rules = [
      { id: 1, modalityId: 1, weekdays: [3], startTime: "06:30", durationMinutes: 60, preferredWorkoutId: null, enabled: true },
      { id: 2, modalityId: 2, weekdays: [3], startTime: "19:00", durationMinutes: 60, preferredWorkoutId: null, enabled: true },
    ];
    const result = resolveOpening(at("2026-08-19T06:20:00"), state({ rules }), prefs);
    expect((result as any).reason).toBe("nearest_upcoming");
  });

  it("horário malformado não derruba a resolução", () => {
    const rules = [
      { id: 1, modalityId: 1, weekdays: [3], startTime: "25:99", durationMinutes: 60, preferredWorkoutId: null, enabled: true },
      { id: 2, modalityId: 2, weekdays: [3], startTime: "19:00", durationMinutes: 60, preferredWorkoutId: null, enabled: true },
    ];
    const result = resolveOpening(at("2026-08-19T19:10:00"), state({ rules }), prefs);
    // Trata como "sem horário": cai no picker em vez de quebrar.
    expect(result.kind).toBe("picker");
  });
});
