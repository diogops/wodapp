/**
 * Conflitos e prévia da agenda semanal.
 *
 * Puro e compartilhado de propósito: a mesma função que desenha a semana na
 * tela é a que aponta o conflito, então o aviso nunca discorda do que o usuário
 * está vendo. Sobreposição aqui usa a MESMA janela do motor de abertura
 * (`resolveOpening`) — início até fim mais tolerância — porque conflito é
 * exatamente a situação em que aquele motor cai em `ambiguous_time`.
 */

export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

export type ScheduleRuleLike = {
  id: number;
  modalityId: number;
  weekdays: number[];
  startTime: string | null;
  durationMinutes: number;
  enabled: boolean;
};

export type ScheduleConflict = {
  weekday: number;
  a: ScheduleRuleLike;
  b: ScheduleRuleLike;
};

export function minutesOfDay(time: string): number | null {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Regras que se sobrepõem no mesmo dia. Regras sem horário não geram conflito
 * de horário — elas são "algum momento do dia", e marcá-las como conflito
 * transformaria o uso mais comum (um dia livre por modalidade) em aviso
 * permanente.
 */
export function findScheduleConflicts(
  rules: ScheduleRuleLike[],
  graceMinutes = 45
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const active = rules.filter(rule => rule.enabled && rule.startTime && minutesOfDay(rule.startTime) !== null);

  for (let weekday = 0; weekday < 7; weekday++) {
    const onDay = active.filter(rule => rule.weekdays.includes(weekday));
    for (let i = 0; i < onDay.length; i++) {
      for (let j = i + 1; j < onDay.length; j++) {
        const a = onDay[i];
        const b = onDay[j];
        const startA = minutesOfDay(a.startTime!)!;
        const startB = minutesOfDay(b.startTime!)!;
        const endA = startA + a.durationMinutes + graceMinutes;
        const endB = startB + b.durationMinutes + graceMinutes;
        if (startA < endB && startB < endA) conflicts.push({ weekday, a, b });
      }
    }
  }
  return conflicts;
}

export type WeekSlot = { rule: ScheduleRuleLike; conflicted: boolean };

/** Prévia da semana: sete listas ordenadas por horário, sem horário por último. */
export function buildWeekPreview(rules: ScheduleRuleLike[], graceMinutes = 45): WeekSlot[][] {
  const conflicts = findScheduleConflicts(rules, graceMinutes);
  const conflictedIds = new Set(conflicts.flatMap(conflict => [conflict.a.id, conflict.b.id]));

  return Array.from({ length: 7 }, (_, weekday) =>
    rules
      .filter(rule => rule.enabled && rule.weekdays.includes(weekday))
      .sort((a, b) => {
        const left = a.startTime ? minutesOfDay(a.startTime) : null;
        const right = b.startTime ? minutesOfDay(b.startTime) : null;
        if (left === null && right === null) return a.id - b.id;
        if (left === null) return 1;
        if (right === null) return -1;
        return left - right || a.id - b.id;
      })
      .map(rule => ({ rule, conflicted: conflictedIds.has(rule.id) }))
  );
}
