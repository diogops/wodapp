import type { SeedExercise, SeedProgram, SeedSection, SeedWorkout } from "./index";

/**
 * Correção do Power Clean e mobilidade de front rack: 8 semanas complementares
 * ao CrossFit, três sessões por semana (A, mobilidade, B). Os treinos não ficam
 * presos a dias: uma regra de agenda só, e o motor entrega o próximo da fila.
 * São 24 treinos, e não 3 repetidos, porque treino concluído sai da fila.
 *
 * As cargas são dicas, nunca metas por semana: a evolução depende da técnica.
 * Os nomes não mudam entre semanas, é por eles que a carga anterior é sugerida.
 */

const youtube = (query: string) => `https://www.youtube.com/results?search_query=${query}`;
const demo = (name: string) => `/demos/${name}-fases.jpg`;

type Catalog = Pick<SeedExercise, "name" | "notes" | "imageUrl" | "videoUrl">;

const FRONT_RACK: Catalog = {
  name: "Front Rack Mobility",
  notes: "Cotovelos, ombros, punhos e torácica para a posição de recepção. Alongamento controlado; não force articulação dolorida.",
  imageUrl: demo("musculacao-front-rack-stretch"),
  videoUrl: "https://www.youtube.com/watch?v=RknkVzeNYfs", // Catalyst Athletics: Clean Rack Position Stretch
};
const THORACIC_ROTATION: Catalog = {
  name: "Rotação torácica no banco",
  notes: "ROTAÇÃO da coluna superior, lenta e controlada. Quadril parado, sem compensar com a lombar.",
  imageUrl: demo("lpo-bench-thoracic-rotation"),
  videoUrl: youtube("bench+thoracic+rotation+mobility"),
};
const THORACIC_EXTENSION: Catalog = {
  name: "Mobilidade torácica no banco (cotovelos apoiados)",
  notes: "EXTENSÃO torácica, sem girar: cotovelos no banco, peito desce entre os braços, costelas baixas.",
  imageUrl: demo("lpo-bench-thoracic-extension"),
  videoUrl: "https://www.youtube.com/shorts/U-47MQF_TAs",
};
const MUSCLE_CLEAN: Catalog = {
  name: "Muscle Clean",
  notes: "Barra próxima e cotovelos girando rápido. As pernas não voltam a flexionar.",
  imageUrl: demo("lpo-muscle-clean"),
  videoUrl: youtube("muscle+clean+catalyst+athletics"),
};
const TALL_POWER_CLEAN: Catalog = {
  name: "Tall Power Clean",
  notes: "Entrada rápida sob a barra e recepção simétrica: os dois pés alinhados, sem avançar uma perna.",
  imageUrl: demo("lpo-tall-power-clean"),
  videoUrl: youtube("tall+power+clean+drill"),
};
const HANG_POWER_CLEAN: Catalog = {
  name: "Hang Power Clean acima do joelho",
  notes: "Coordena extensão, puxada e recepção. Pés paralelos na recepção, cotovelos à frente.",
  imageUrl: demo("lpo-hang-power-clean"),
  videoUrl: youtube("hang+power+clean+catalyst+athletics"),
};
const POWER_CLEAN: Catalog = {
  name: "Power Clean do chão",
  notes: "Integra a técnica partindo do chão. Se a recepção abrir em split, reduza a carga.",
  imageUrl: demo("lpo-power-clean"),
  videoUrl: youtube("power+clean+catalyst+athletics"),
};
const CLEAN_PULL: Catalog = {
  name: "Clean Pull",
  notes: "Extensão coordenada, equilíbrio e trajetória vertical da barra, sem perder a postura.",
  imageUrl: demo("musculacao-clean-pull"),
  videoUrl: youtube("clean+pull+catalyst+athletics"),
};
const PAUSED_FRONT_SQUAT: Catalog = {
  name: "Front Squat com pausa",
  notes: "Fortalece a recepção e estabiliza o tronco com a barra sobre os ombros. Carga sem comprometer a postura.",
  imageUrl: demo("musculacao-pause-front-squat"),
  videoUrl: youtube("paused+front+squat+catalyst+athletics"),
};
const SPLIT_HOLD: Catalog = {
  name: "Split Stance Front Rack Hold",
  notes: "Acessório de estabilidade unilateral. Use quando houver indicação técnica; não reforça nem substitui a recepção do Power Clean, que é bilateral.",
  imageUrl: demo("lpo-split-stance-front-rack-hold"),
  videoUrl: youtube("split+clean+receiving+position+drill"),
};
const WRIST: Catalog = {
  name: "Mobilidade de punhos",
  notes: "Punhos para sustentar a barra com os dedos no front rack.",
  imageUrl: demo("musculacao-wrist-extension-mobility"),
  videoUrl: youtube("wrist+mobility+front+rack"),
};
const TRICEPS_LAT: Catalog = {
  name: "Alongamento de tríceps e dorsais",
  notes: "Libera o cotovelo alto do front rack.",
  imageUrl: demo("lpo-triceps-lat-stretch"),
  videoUrl: youtube("triceps+lat+stretch+front+rack"),
};
const ANKLE: Catalog = {
  name: "Mobilidade de tornozelos",
  notes: "Dorsiflexão para receber com os calcanhares no chão.",
  imageUrl: demo("musculacao-knee-to-wall-ankle-mobility"),
  videoUrl: youtube("ankle+mobility+knee+to+wall"),
};

type Dose = { sets: number; reps?: string; duration?: string; rest?: number; load?: string; cue?: string };

// O descanso vem antes do "cue": `parseRestSeconds` lê o primeiro "descanso/pausa"
// do texto, e "pausa de 2–3 s" do agachamento não pode virar 2 s de descanso.
const dose = (exercise: Catalog, { sets, reps, duration, rest, load, cue }: Dose): SeedExercise => ({
  ...exercise,
  sets: String(sets),
  reps,
  duration,
  load,
  prescription: [`${sets} × ${reps ?? duration}`, rest && `descanso ${rest} s`, cue].filter(Boolean).join(" · "),
});

const section = (title: string, kind: SeedSection["kind"], format: string, exercises: SeedExercise[]): SeedSection =>
  ({ title, kind, format, exercises });

const CRITERIA = "Só suba a carga com: pés paralelos e base estável, sem avançar uma perna, barra apoiada nos ombros, cotovelos à frente, tronco estável, equilíbrio e repetições consistentes. Recepção dividida ou perda de equilíbrio: reduza a carga e volte aos corretivos. Com fadiga, ou se já houve clean, snatch ou jerk pesado ontem, corte uma série por exercício e fique leve. Dor articular: pare e troque o exercício pela alternativa do coach.";

type Phase = {
  weeks: number[];
  name: string;
  guidance: string;
  muscleLoad: string;
  tallLoad: string;
  hangLoad: string;
  hangCue?: string;
  floor: boolean;
  squat: Pick<Dose, "sets" | "reps">;
};

const PHASES: Phase[] = [
  {
    weeks: [1, 2], name: "Coordenação", floor: false,
    guidance: "Coordenação: cargas leves, simetria da recepção em primeiro lugar. Grave as execuções de frente e de lado para comparar depois.",
    muscleLoad: "Barra vazia", tallLoad: "PVC/barra", hangLoad: "Leve", squat: { sets: 3, reps: "5" },
  },
  {
    weeks: [3, 4], name: "Consolidação", floor: false,
    guidance: "Consolidação: carga moderada somente com execução consistente. Trabalhe a recepção em alturas diferentes.",
    muscleLoad: "Leve", tallLoad: "Barra vazia", hangLoad: "Moderada", hangCue: "receba ora mais alto, ora mais baixo", squat: { sets: 4, reps: "4" },
  },
  {
    weeks: [5, 6], name: "Integração", floor: true,
    guidance: "Integração: Hang Power Clean e Power Clean do chão. Observe se a técnica se mantém quando a carga sobe; estabilidade e velocidade.",
    muscleLoad: "Leve", tallLoad: "Barra vazia", hangLoad: "Moderada", squat: { sets: 4, reps: "4" },
  },
  {
    weeks: [7, 8], name: "Avaliação", floor: true,
    guidance: "Avaliação: grave e compare com os vídeos iniciais: simetria dos pés, equilíbrio, cotovelos, consistência. Depois, defina a nova progressão.",
    muscleLoad: "Leve", tallLoad: "Barra vazia", hangLoad: "Moderada", squat: { sets: 3, reps: "5" },
  },
];

const treinoA = (week: number, phase: Phase): SeedWorkout => ({
  title: `Power Clean S${week} · A — Técnica e recepção`,
  focus: `${phase.name}: receber a barra com os dois pés alinhados, equilíbrio e cotovelos elevados`,
  level: "intermediário/avançado",
  weekday: null,
  notes: `${phase.guidance} ${CRITERIA}`,
  sections: [
    section("Mobilidade", "warmup", "Preparo", [
      dose(FRONT_RACK, { sets: 3, duration: "30 s" }),
      dose(THORACIC_ROTATION, { sets: 3, reps: "8/lado" }),
    ]),
    section("Técnica", "straight_sets", "Power Clean", phase.floor
      ? [
          dose(MUSCLE_CLEAN, { sets: 3, reps: "5", rest: 60, load: phase.muscleLoad }),
          dose(TALL_POWER_CLEAN, { sets: 3, reps: "3", rest: 60, load: phase.tallLoad }),
          dose(HANG_POWER_CLEAN, { sets: 3, reps: "3", rest: 90, load: phase.hangLoad }),
          dose(POWER_CLEAN, { sets: 4, reps: "3", rest: 120, load: "Técnica" }),
        ]
      : [
          dose(MUSCLE_CLEAN, { sets: 3, reps: "5", rest: 60, load: phase.muscleLoad }),
          dose(TALL_POWER_CLEAN, { sets: 5, reps: "3", rest: 60, load: phase.tallLoad }),
          dose(HANG_POWER_CLEAN, { sets: 5, reps: "3", rest: 90, load: phase.hangLoad, cue: phase.hangCue }),
        ]),
  ],
});

const treinoB = (week: number, phase: Phase): SeedWorkout => ({
  title: `Power Clean S${week} · B — Estabilidade e controle`,
  focus: `${phase.name}: puxada coordenada, recepção forte e tronco estável`,
  level: "intermediário/avançado",
  weekday: null,
  notes: `${phase.guidance} ${CRITERIA}`,
  sections: [
    section("Mobilidade", "warmup", "Preparo", [
      dose(THORACIC_ROTATION, { sets: 3, reps: "8/lado" }),
      dose(FRONT_RACK, { sets: 3, duration: "40 s" }),
    ]),
    section("Técnica", "straight_sets", "Puxada", [
      dose(CLEAN_PULL, { sets: 4, reps: "3", rest: 90, load: "Técnica" }),
    ]),
    section("Força", "straight_sets", "Recepção", [
      dose(PAUSED_FRONT_SQUAT, { ...phase.squat, rest: 120, load: "Moderada", cue: "pausa de 2–3 s no fundo" }),
    ]),
    section("Técnica", "straight_sets", "Power Clean", [
      dose(HANG_POWER_CLEAN, { sets: 4, reps: "3", rest: 90, load: "Leve" }),
    ]),
    section("Estabilidade", "hold", "Opcional", [
      dose(SPLIT_HOLD, { sets: 3, duration: "20 s/lado", load: "Leve", cue: "opcional" }),
    ]),
  ],
});

const mobilidade = (week: number, phase: Phase): SeedWorkout => ({
  title: `Power Clean S${week} · Mobilidade complementar`,
  focus: "Front rack, torácica, punhos e tornozelos em 8–12 minutos, para recuperar entre as sessões técnicas",
  level: "todos",
  weekday: null,
  notes: `${phase.name}: sessão leve; se o tempo apertar, priorize o front rack e a torácica.`,
  sections: [
    section("Mobilidade", "hold", "8–12 min", [
      // shortcut: um link por exercício; a sequência do Jason and Lauren fica nesta sessão e o stretch da Catalyst em A e B. Lista de vídeos por exercício se precisar de mais.
      dose({ ...FRONT_RACK, videoUrl: "https://www.youtube.com/shorts/vxlrrQRa8OA" }, { sets: 2, duration: "40 s" }),
      dose(THORACIC_ROTATION, { sets: 2, reps: "8/lado" }),
      dose(THORACIC_EXTENSION, { sets: 2, reps: "8" }),
      dose(WRIST, { sets: 2, duration: "30 s" }),
      dose(TRICEPS_LAT, { sets: 2, duration: "30 s/lado" }),
      dose(ANKLE, { sets: 2, reps: "10/lado" }),
    ]),
  ],
});

export const POWER_CLEAN_PROGRAM: SeedProgram = {
  modalitySlug: "fortalecimento",
  sourceFileName: "power-clean-mobilidade-v1",
  durationMinutes: 35,
  // Seg/qua/sáb: dias alternados e livres da musculação (ter/qui/sex/dom).
  scheduleWeekdays: [1, 3, 6],
  // A e B separados pela mobilidade: nada de LPO pesado em dias consecutivos.
  workouts: PHASES.flatMap(phase =>
    phase.weeks.flatMap(week => [treinoA(week, phase), mobilidade(week, phase), treinoB(week, phase)])
  ),
};
