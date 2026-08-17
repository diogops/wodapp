/**
 * Motor de abertura: decide em que treino o app cai quando é aberto.
 *
 * Função pura por decisão de projeto — recebe `now` em vez de ler o relógio, e
 * recebe o estado inteiro em vez de consultar. É o que torna os oito ramos
 * testáveis sem UI, sem banco e sem viajar no tempo.
 *
 * Toda a aritmética de dia e hora usa o **horário local do dispositivo**. Usar
 * UTC quebraria a agenda de quem treina cedo ou tarde, e no horário de verão.
 */

export type OpeningModality = { id: number; name: string; archived?: boolean };

export type OpeningWorkout = {
  id: number;
  modalityId: number | null;
  title: string;
  archived?: boolean;
  /** ISO ou Date da última execução. Nulo = nunca feito. */
  lastPerformedAt?: string | Date | null;
};

export type OpeningRule = {
  id: number;
  modalityId: number;
  /** 0 = domingo … 6 = sábado. */
  weekdays: number[];
  /** "06:30" local, ou null para regra só de dia. */
  startTime: string | null;
  durationMinutes: number;
  preferredWorkoutId: number | null;
  enabled: boolean;
};

export type OpeningSession = {
  id: number;
  workoutId: number;
  modalityId: number | null;
  startedAt: string | Date;
  status: "in_progress" | "completed" | "abandoned";
};

export type OpeningPrefs = {
  autoStartEnabled: boolean;
  scheduleLeadMinutes: number;
  scheduleGraceMinutes: number;
  resumeWindowHours: number;
  defaultModalityId?: number | null;
};

export type ResolutionReason =
  | "no_modalities"
  | "session_in_progress"
  | "single_modality"
  | "single_scheduled_today"
  | "time_window_match"
  | "nearest_upcoming"
  | "ambiguous_time"
  | "multiple_today"
  | "nothing_scheduled"
  | "user_locked";

export type Candidate = { modality: OpeningModality; workout: OpeningWorkout | null; rule?: OpeningRule };

export type Resolution =
  | { kind: "onboarding" }
  | { kind: "resume"; session: OpeningSession; reason: ResolutionReason }
  | { kind: "auto"; modality: OpeningModality; workout: OpeningWorkout | null; reason: ResolutionReason }
  | { kind: "picker"; candidates: Candidate[]; reason: ResolutionReason };

export type OpeningState = {
  modalities: OpeningModality[];
  workouts: OpeningWorkout[];
  rules: OpeningRule[];
  activeSession?: OpeningSession | null;
  /** Contagem de execuções por modalidade nos últimos 30 dias, para desempate. */
  recentUseByModality?: Record<number, number>;
  lastUsedModalityId?: number | null;
};

function minutesOfDay(time: string): number | null {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function toMillis(value: string | Date) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/**
 * Rotação: o treino não arquivado da modalidade com execução mais antiga,
 * nunca-executados primeiro. Dá um ciclo A/B/C natural sem exigir configuração.
 */
export function pickWorkoutForModality(
  workouts: OpeningWorkout[],
  modalityId: number,
  rule?: OpeningRule
): OpeningWorkout | null {
  const pool = workouts.filter(w => !w.archived && w.modalityId === modalityId);
  if (!pool.length) return null;

  if (rule?.preferredWorkoutId) {
    const preferred = pool.find(w => w.id === rule.preferredWorkoutId);
    if (preferred) return preferred;
  }

  return [...pool].sort((a, b) => {
    const left = a.lastPerformedAt ? toMillis(a.lastPerformedAt) : -Infinity;
    const right = b.lastPerformedAt ? toMillis(b.lastPerformedAt) : -Infinity;
    return left - right || a.id - b.id;
  })[0];
}

function candidatesFrom(rules: OpeningRule[], state: OpeningState): Candidate[] {
  return rules
    .map((rule): Candidate | null => {
      const modality = state.modalities.find(m => m.id === rule.modalityId);
      if (!modality) return null;
      return { modality, workout: pickWorkoutForModality(state.workouts, modality.id, rule), rule };
    })
    .filter((candidate): candidate is Candidate => candidate !== null);
}

/** Ordena modalidades para o picker sem agenda: padrão, recência, frequência, alfabético. */
function orderModalities(state: OpeningState, prefs: OpeningPrefs): OpeningModality[] {
  const recent = state.recentUseByModality ?? {};
  return [...state.modalities].sort((a, b) => {
    if (prefs.defaultModalityId) {
      if (a.id === prefs.defaultModalityId) return -1;
      if (b.id === prefs.defaultModalityId) return 1;
    }
    if (state.lastUsedModalityId) {
      if (a.id === state.lastUsedModalityId) return -1;
      if (b.id === state.lastUsedModalityId) return 1;
    }
    const diff = (recent[b.id] ?? 0) - (recent[a.id] ?? 0);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

export function resolveOpening(now: Date, state: OpeningState, prefs: OpeningPrefs): Resolution {
  const active = state.modalities.filter(m => !m.archived);

  // 1. Nada cadastrado.
  if (!active.length) return { kind: "onboarding" };

  // 2. Sessão em andamento dentro da janela — retomar sempre ganha de escolher.
  const session = state.activeSession;
  if (session && session.status === "in_progress") {
    const ageHours = (now.getTime() - toMillis(session.startedAt)) / 3_600_000;
    if (ageHours >= 0 && ageHours < prefs.resumeWindowHours) {
      return { kind: "resume", session, reason: "session_in_progress" };
    }
  }

  const allCandidates = (): Candidate[] =>
    orderModalities({ ...state, modalities: active }, prefs).map(modality => ({
      modality,
      workout: pickWorkoutForModality(state.workouts, modality.id),
    }));

  // 3. Auto-start desligado: o usuário pediu para escolher sempre.
  if (!prefs.autoStartEnabled) {
    return { kind: "picker", candidates: allCandidates(), reason: "user_locked" };
  }

  // 4. Uma modalidade só.
  if (active.length === 1) {
    const modality = active[0];
    return {
      kind: "auto",
      modality,
      workout: pickWorkoutForModality(state.workouts, modality.id),
      reason: "single_modality",
    };
  }

  // 5. Regras de hoje, pelo dia local.
  const weekday = now.getDay();
  const activeIds = new Set(active.map(m => m.id));
  const todayRules = state.rules.filter(
    rule => rule.enabled && activeIds.has(rule.modalityId) && rule.weekdays.includes(weekday)
  );

  if (todayRules.length === 1) {
    const [rule] = todayRules;
    const modality = active.find(m => m.id === rule.modalityId)!;
    return {
      kind: "auto",
      modality,
      workout: pickWorkoutForModality(state.workouts, modality.id, rule),
      reason: "single_scheduled_today",
    };
  }

  if (todayRules.length > 1) {
    const timed = todayRules.filter(rule => rule.startTime && minutesOfDay(rule.startTime) !== null);

    // 7. Alguma sem horário: não há como desempatar, e chutar seria pior.
    if (timed.length !== todayRules.length) {
      return { kind: "picker", candidates: candidatesFrom(todayRules, state), reason: "multiple_today" };
    }

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    // A janela é o treino em si mais a tolerância de atraso. A antecedência
    // (`scheduleLeadMinutes`) fica FORA dela de propósito: se ela também
    // entrasse aqui, "está para começar" nunca seria distinguível de "já
    // começou", e o ramo `nearest_upcoming` seria inalcançável.
    const withWindow = timed.map(rule => {
      const start = minutesOfDay(rule.startTime!)!;
      return {
        rule,
        start,
        from: start,
        to: start + rule.durationMinutes + prefs.scheduleGraceMinutes,
      };
    });

    const inWindow = withWindow.filter(item => nowMinutes >= item.from && nowMinutes <= item.to);

    if (inWindow.length === 1) {
      const { rule } = inWindow[0];
      const modality = active.find(m => m.id === rule.modalityId)!;
      return {
        kind: "auto",
        modality,
        workout: pickWorkoutForModality(state.workouts, modality.id, rule),
        reason: "time_window_match",
      };
    }

    if (inWindow.length > 1) {
      const ordered = [...inWindow]
        .sort((a, b) => Math.abs(a.start - nowMinutes) - Math.abs(b.start - nowMinutes))
        .map(item => item.rule);
      return { kind: "picker", candidates: candidatesFrom(ordered, state), reason: "ambiguous_time" };
    }

    const upcoming = withWindow.filter(
      item => item.start > nowMinutes && item.start - nowMinutes <= prefs.scheduleLeadMinutes
    );
    if (upcoming.length === 1) {
      const { rule } = upcoming[0];
      const modality = active.find(m => m.id === rule.modalityId)!;
      return {
        kind: "auto",
        modality,
        workout: pickWorkoutForModality(state.workouts, modality.id, rule),
        reason: "nearest_upcoming",
      };
    }

    return { kind: "picker", candidates: candidatesFrom(todayRules, state), reason: "multiple_today" };
  }

  // 8. Nada agendado hoje.
  return { kind: "picker", candidates: allCandidates(), reason: "nothing_scheduled" };
}

/** Motivo em linguagem humana — o usuário precisa entender por que caiu aqui. */
export function describeReason(reason: ResolutionReason, modalityName: string, now: Date): string {
  const weekday = now.toLocaleDateString("pt-BR", { weekday: "long" });
  const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  switch (reason) {
    case "session_in_progress":
      return "Você tem um treino em andamento";
    case "single_modality":
      return `${modalityName} é sua única modalidade`;
    case "single_scheduled_today":
      return `${weekday} — seu dia de ${modalityName}`;
    case "time_window_match":
      return `${weekday}, ${time} — seu horário de ${modalityName}`;
    case "nearest_upcoming":
      return `${modalityName} começa daqui a pouco`;
    case "ambiguous_time":
      return "Mais de um treino neste horário";
    case "multiple_today":
      return "Você tem mais de um treino hoje";
    case "nothing_scheduled":
      return "Nada agendado para hoje";
    case "user_locked":
      return "Você prefere escolher toda vez";
    case "no_modalities":
      return "Nenhuma modalidade cadastrada";
  }
}
