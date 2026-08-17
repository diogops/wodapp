/**
 * Prompt do gerador, derivado da gramática da modalidade.
 *
 * Antes o prompt dizia "você é um treinador de CrossFit" em texto fixo, o que
 * fazia toda modalidade nova sair com AMRAP e EMOM. Aqui o papel, o vocabulário,
 * os tipos de bloco permitidos e as métricas vêm da gramática — criar uma
 * modalidade passa a bastar para o gerador acertar o estilo dela.
 *
 * As regras de FORMATO continuam fixas: elas não descrevem treino, descrevem
 * como o app renderiza um exercício numa tela de celular.
 */

import { CROSSFIT_GRAMMAR, type BlockKind, type LoadUnit, type MetricKey, type ModalityGrammar } from "./modalities";

const BLOCK_KIND_DESCRIPTIONS: Record<BlockKind, string> = {
  warmup: "aquecimento",
  skill: "técnica/skill",
  straight_sets: "séries retas (ex.: 4x8 com descanso)",
  superset: "super-série (dois movimentos alternados)",
  circuit: "circuito por rounds",
  for_time: "For Time",
  amrap: "AMRAP",
  emom: "EMOM",
  tabata: "Tabata",
  intervals: "intervalados/tiros",
  hold: "isometria",
  distance: "distância contínua",
  cooldown: "volta à calma",
  rest: "descanso",
};

const METRIC_FIELDS: Record<MetricKey, string> = {
  reps: "`reps`",
  load: "`load`",
  time: "`duration`",
  distance: "`duration` com a distância (ex.: '5 km')",
  calories: "`reps` em calorias (ex.: '15 cal')",
  rpe: "`prescription` com o RPE alvo",
  holdSeconds: "`duration` do tempo de sustentação",
  rounds: "`sets` com o número de rounds",
};

const LOAD_UNIT_RULES: Record<LoadUnit, string> = {
  kg: "Use kg para carga.",
  lb: "Use lb para carga.",
  bodyweight: "O trabalho é com peso corporal: use progressão/variação do movimento no lugar de carga externa.",
  band: "Use faixa elástica como resistência, indicando a cor ou a força da faixa.",
  none: "Este treino não tem carga externa: deixe `load` vazio.",
};

export type GeneratorModality = { name: string; grammar: ModalityGrammar };

export const DEFAULT_GENERATOR_MODALITY: GeneratorModality = { name: "CrossFit", grammar: CROSSFIT_GRAMMAR };

/** Regras de renderização — valem para toda modalidade, então não são derivadas. */
const FORMAT_RULES = [
  "FORMATO — isto define se o treino fica legível no celular:",
  "Cada movimento é um item separado em `exercises`, com `name` contendo só o nome do movimento (ex.: 'Back Squat', 'Burpee').",
  "Nunca junte vários movimentos num único exercise, e nunca descreva um bloco inteiro em texto corrido.",
  "`prescription` é curta, no máximo cerca de 60 caracteres (ex.: '5x3 a 75%', '20s forte / 40s leve').",
  "Prefira preencher `sets`, `reps`, `duration` e `load` separadamente sempre que o dado existir; deixe vazio o que não se aplica.",
  "`notes` do exercício e da seção são para orientação técnica curta, não para descrever o treino.",
  "`notes` do workout tem no máximo duas frases.",
];

export function buildGeneratorSystemPrompt(modality: GeneratorModality = DEFAULT_GENERATOR_MODALITY): string {
  const { grammar } = modality;
  const { labels } = grammar;

  const lines = [
    `Você é um treinador de ${modality.name} montando um ${inSentence(labels.workout)} para um atleta intermediário treinando sozinho.`,
    `Monte uma sessão coerente e executável. Chame cada bloco de "${labels.block}" e a unidade de trabalho de "${labels.unitOfWork}".`,
    "Prescreva volume, tempo e carga concretos — nada de 'a critério'. Escreva tudo em português.",
    LOAD_UNIT_RULES[grammar.defaultLoadUnit],
    // Restringir os blocos é o que impede musculação de sair como AMRAP.
    `Use apenas estes tipos de bloco: ${grammar.allowedBlockKinds.map(kind => BLOCK_KIND_DESCRIPTIONS[kind]).join("; ")}.`,
    `Registre estas métricas quando existirem: ${grammar.trackedMetrics.map(metric => METRIC_FIELDS[metric]).join(", ")}.`,
    "Respeite os pedidos do atleta: se ele listou exercícios, use-os como espinha dorsal; se listou o que quer trabalhar, o estímulo tem que refletir isso.",
    "Você pode acrescentar movimentos complementares para a sessão fazer sentido, mas não troque o foco pedido por outro.",
  ];

  if (grammar.restIsFirstClass) {
    // Em musculação e calistenia o descanso é parte da prescrição: sem ele o
    // atleta não sabe se são 60s ou 3min entre séries, e o estímulo muda.
    lines.push("O descanso entre séries é parte da prescrição: escreva-o em `prescription` (ex.: '4x8, descanso 2min').");
  }

  lines.push(...FORMAT_RULES);
  lines.push(
    `Use \`format\` da seção para o tipo de bloco, no vocabulário de ${modality.name} (ex.: ${exampleFormats(grammar.allowedBlockKinds)}).`
  );

  return lines.join(" ");
}

/** "Treino" vira minúscula no meio da frase; "WOD" é sigla e continua igual. */
function inSentence(label: string): string {
  return label === label.toUpperCase() ? label : label.toLowerCase();
}

function exampleFormats(kinds: BlockKind[]): string {
  const examples: Partial<Record<BlockKind, string>> = {
    amrap: "AMRAP 15",
    emom: "EMOM 20",
    for_time: "For Time",
    tabata: "Tabata",
    straight_sets: "4x8",
    superset: "Super-série",
    circuit: "4 rounds",
    intervals: "6x400m",
    distance: "5 km contínuos",
    hold: "Isometria 3x30s",
    warmup: "Aquecimento",
    cooldown: "Volta à calma",
    skill: "Técnica",
    rest: "Descanso",
  };
  return kinds
    .map(kind => examples[kind])
    .filter((value): value is string => Boolean(value))
    .slice(0, 4)
    .join(", ");
}
