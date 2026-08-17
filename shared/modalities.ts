/**
 * Modalidades de treino e sua gramática.
 *
 * A gramática é o que impede o app de virar um `if (modality === 'crossfit')`
 * espalhado: cada modalidade declara os tipos de bloco que aceita, as métricas
 * que registra e como chama as coisas na tela. Musculação não é "AMRAP", é
 * série/rep/carga/descanso — e isso é dado, não código.
 */

export const BLOCK_KINDS = [
  "warmup",
  "skill",
  "straight_sets",
  "superset",
  "circuit",
  "for_time",
  "amrap",
  "emom",
  "tabata",
  "intervals",
  "hold",
  "distance",
  "cooldown",
  "rest",
] as const;

export type BlockKind = (typeof BLOCK_KINDS)[number];

export const METRIC_KEYS = [
  "reps",
  "load",
  "time",
  "distance",
  "calories",
  "rpe",
  "holdSeconds",
  "rounds",
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

export type LoadUnit = "kg" | "lb" | "bodyweight" | "band" | "none";

export type ModalityGrammar = {
  allowedBlockKinds: BlockKind[];
  trackedMetrics: MetricKey[];
  defaultLoadUnit: LoadUnit;
  /** Descanso entre séries é conceito de primeira classe? Musculação: sim. */
  restIsFirstClass: boolean;
  /** O sequenciador avança sozinho ou espera confirmação? */
  defaultAdvance: "auto" | "manual";
  /** Vocabulário da tela, para a UI não dizer "WOD" em musculação. */
  labels: {
    workout: string;
    block: string;
    unitOfWork: string;
  };
};

export type ModalitySeed = {
  slug: string;
  name: string;
  color: string;
  icon: string;
  grammar: ModalityGrammar;
};

/**
 * Seed das modalidades embutidas. É dado, não código: o usuário pode criar
 * outras escolhendo exatamente os mesmos campos.
 */
export const BUILT_IN_MODALITIES: ModalitySeed[] = [
  {
    slug: "crossfit",
    name: "CrossFit",
    color: "#e06b3c",
    icon: "Dumbbell",
    grammar: {
      allowedBlockKinds: [
        "warmup", "skill", "straight_sets", "for_time", "amrap",
        "emom", "tabata", "intervals", "cooldown",
      ],
      trackedMetrics: ["reps", "load", "time", "rounds", "calories", "distance"],
      defaultLoadUnit: "kg",
      restIsFirstClass: false,
      defaultAdvance: "auto",
      labels: { workout: "WOD", block: "Parte", unitOfWork: "Round" },
    },
  },
  {
    slug: "strength",
    name: "Musculação",
    color: "#4a6fa5",
    icon: "Weight",
    grammar: {
      allowedBlockKinds: ["warmup", "straight_sets", "superset", "hold", "cooldown"],
      trackedMetrics: ["reps", "load", "rpe"],
      defaultLoadUnit: "kg",
      restIsFirstClass: true,
      defaultAdvance: "manual",
      labels: { workout: "Treino", block: "Exercício", unitOfWork: "Série" },
    },
  },
  {
    slug: "calisthenics",
    name: "Calistenia",
    color: "#6b8f71",
    icon: "PersonStanding",
    grammar: {
      allowedBlockKinds: ["warmup", "skill", "straight_sets", "hold", "circuit", "cooldown"],
      trackedMetrics: ["reps", "holdSeconds", "rpe"],
      defaultLoadUnit: "bodyweight",
      restIsFirstClass: true,
      defaultAdvance: "manual",
      labels: { workout: "Treino", block: "Bloco", unitOfWork: "Série" },
    },
  },
  {
    slug: "hiit",
    name: "HIIT / Funcional",
    color: "#c0563f",
    icon: "Flame",
    grammar: {
      allowedBlockKinds: ["warmup", "intervals", "tabata", "circuit", "cooldown"],
      trackedMetrics: ["time", "reps", "calories"],
      defaultLoadUnit: "none",
      restIsFirstClass: false,
      defaultAdvance: "auto",
      labels: { workout: "Sessão", block: "Bloco", unitOfWork: "Round" },
    },
  },
  {
    slug: "endurance",
    name: "Corrida / Endurance",
    color: "#3f7f8f",
    icon: "Footprints",
    grammar: {
      allowedBlockKinds: ["warmup", "distance", "intervals", "cooldown"],
      trackedMetrics: ["distance", "time"],
      defaultLoadUnit: "none",
      restIsFirstClass: false,
      defaultAdvance: "auto",
      labels: { workout: "Sessão", block: "Bloco", unitOfWork: "Tiro" },
    },
  },
  {
    slug: "mobility",
    name: "Mobilidade",
    color: "#8a7fa8",
    icon: "Sparkles",
    grammar: {
      allowedBlockKinds: ["hold", "skill"],
      trackedMetrics: ["holdSeconds"],
      defaultLoadUnit: "none",
      restIsFirstClass: false,
      defaultAdvance: "auto",
      labels: { workout: "Sessão", block: "Bloco", unitOfWork: "Posição" },
    },
  },
];

/** A modalidade dos dados que existiam antes desta funcionalidade. */
export const DEFAULT_MODALITY_SLUG = "crossfit";

export const CROSSFIT_GRAMMAR = BUILT_IN_MODALITIES[0].grammar;

const BLOCK_KIND_SET = new Set<string>(BLOCK_KINDS);
const METRIC_SET = new Set<string>(METRIC_KEYS);

export const isBlockKind = (value: string): value is BlockKind => BLOCK_KIND_SET.has(value);
export const isMetricKey = (value: string): value is MetricKey => METRIC_SET.has(value);

/**
 * Deriva o `BlockKind` do campo `format`, que hoje é texto livre ("AMRAP 15",
 * "EMOM 20", "4 rounds"). É o que permite migrar os workouts existentes sem
 * pedir nada ao usuário. Sem correspondência clara devolve null — chutar um
 * kind mudaria como o bloco é cronometrado.
 */
export function inferBlockKind(format?: string | null, title?: string | null): BlockKind | null {
  const text = `${format ?? ""} ${title ?? ""}`.toLowerCase();
  if (!text.trim()) return null;

  if (/\bamrap\b/.test(text)) return "amrap";
  if (/\bemom\b/.test(text)) return "emom";
  if (/\btabata\b/.test(text)) return "tabata";
  if (/for\s*time|\bft\b/.test(text)) return "for_time";
  if (/aquecimento|warm\s*-?\s*up/.test(text)) return "warmup";
  if (/alongamento|cool\s*-?\s*down|volta à calma/.test(text)) return "cooldown";
  if (/t[ée]cnica|skill|drill/.test(text)) return "skill";
  if (/descanso|rest\b/.test(text)) return "rest";
  if (/isometria|hold|prancha|hollow/.test(text)) return "hold";
  if (/intervalo|interval|sprint|tiro/.test(text)) return "intervals";
  if (/circuito|circuit/.test(text)) return "circuit";
  if (/super\s*-?\s*s[ée]rie|superset/.test(text)) return "superset";
  if (/\d+\s*x\s*\d+|s[ée]ries?\b/.test(text)) return "straight_sets";
  if (/\brounds?\b/.test(text)) return "circuit";
  return null;
}
