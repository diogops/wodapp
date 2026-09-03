import type { SeedExercise, SeedProgram, SeedSection } from "./index";

/**
 * Transcrição de `doc/treinos_fortalecimento_crossfit.pdf` — quatro dias de
 * fortalecimento para CrossFit (olímpicos, ginástica, unilaterais). Cada linha
 * da tabela do PDF virou uma seção; a coluna "POR QUE ESTÁ AQUI" foi para as
 * notas do exercício e a coluna IMAGEM para `imageUrl`. O PDF reaproveita dez
 * ilustrações entre as linhas — o mapeamento abaixo é o dele, não uma escolha
 * por nome de exercício. Não reescreva as doses: são as do PDF.
 */

const IMG = {
  powerClean: "/demos/fortalecimento-power-clean.jpg",
  frontSquat: "/demos/fortalecimento-front-squat.jpg",
  powerSnatch: "/demos/fortalecimento-power-snatch.jpg",
  overheadSquat: "/demos/fortalecimento-overhead-squat.jpg",
  hangSquatSnatch: "/demos/fortalecimento-hang-squat-snatch.jpg",
  barMuscleUp: "/demos/fortalecimento-bar-muscle-up.jpg",
  ringMuscleUp: "/demos/fortalecimento-ring-muscle-up.jpg",
  doubleUnder: "/demos/fortalecimento-double-under.jpg",
  pistol: "/demos/fortalecimento-pistol.jpg",
  handstand: "/demos/fortalecimento-handstand.jpg",
} as const;

export const FORTALECIMENTO_IMAGE_URLS: string[] = Object.values(IMG);

/** Linha do PDF com vários movimentos e uma dose "cada": um exercício por movimento. */
const each = (names: string[], dose: Omit<SeedExercise, "name">): SeedExercise[] =>
  names.map(name => ({ name, ...dose }));

const section = (title: string, kind: SeedSection["kind"], format: string | undefined, exercises: SeedExercise[]): SeedSection =>
  ({ title, kind, format, exercises });

const FOOTNOTE = "Referência visual gerada para reconhecimento do movimento. Confirme execução e escala com o coach. RPE = percepção de esforço.";

export const FORTALECIMENTO_PROGRAM: SeedProgram = {
  modalitySlug: "fortalecimento",
  sourceFileName: "treinos_fortalecimento_crossfit.pdf",
  durationMinutes: 60,
  workouts: [
    {
      title: "Dia 1 — Clean e força de pernas",
      focus: "Power clean, front squat e transferência para o overhead",
      level: "intermediário",
      weekday: 1,
      notes: `Sequência: aquecer → mobilizar → ativar → técnica → força → transferência → desacelerar. ${FOOTNOTE}`,
      sections: [
        section("Aquecimento", "warmup", "6 min", [
          { name: "Bike ou remo leve", prescription: "6 min; ritmo conversável", duration: "6 min", notes: "Elevar temperatura sem fadigar antes da técnica.", imageUrl: IMG.powerClean },
        ]),
        section("Mobilidade", "warmup", "2 × 8", each(["Ankle rocks", "90/90", "Front-rack dinâmico"], {
          prescription: "2 × 8 cada", sets: "2", reps: "8", notes: "Preparar tornozelo, quadril e posição de recepção.", imageUrl: IMG.powerClean,
        })),
        section("Ativação", "warmup", "2 × 8", each(["Dead bug", "Glute bridge", "Scapular push-up"], {
          prescription: "2 × 8 cada", sets: "2", reps: "8", notes: "Criar tensão de tronco e conexão quadril–ombro.", imageUrl: IMG.frontSquat,
        })),
        section("Técnica", "skill", "5 × (2 + 2)", [
          { name: "Tall clean + high-hang clean", prescription: "5 × (2 + 2); PVC/barra", sets: "5", reps: "2 + 2", load: "PVC ou barra vazia", notes: "Treinar cotovelos rápidos e recepção alta.", imageUrl: IMG.powerClean },
        ]),
        section("Força", "straight_sets", "6 × 3", [
          { name: "Power clean", prescription: "6 × 3 @ 65–75% 1RM; RPE 6–7", sets: "6", reps: "3", load: "65–75% 1RM", notes: "Força e velocidade com barra próxima ao corpo.", imageUrl: IMG.powerClean },
        ]),
        section("Força", "straight_sets", "4 × 4", [
          { name: "Front squat com pausa de 2 s", prescription: "4 × 4; RPE 7", sets: "4", reps: "4", notes: "Fortalecer pernas e estabilidade no rack.", imageUrl: IMG.frontSquat },
        ]),
        section("Transferência", "straight_sets", "4 × 6", [
          { name: "Thruster com barra ou halteres", prescription: "4 × 6 moderado; sem falhar", sets: "4", reps: "6", notes: "Transferir força de pernas para o overhead.", imageUrl: IMG.frontSquat },
        ]),
        section("Final", "cooldown", "2 × 20–30 s", [
          { name: "Alongamento leve: quadríceps, dorsais e punhos", prescription: "2 × 20–30 s", notes: "Reduzir tensão e recuperar amplitude confortavelmente.", imageUrl: IMG.frontSquat },
        ]),
      ],
    },
    {
      title: "Dia 2 — Snatch e posição overhead",
      focus: "Power snatch, snatch do hang e overhead squat",
      level: "intermediário",
      weekday: 2,
      notes: `Sequência: aquecer → mobilizar → ativar → técnica → força → estabilidade → desacelerar. ${FOOTNOTE}`,
      sections: [
        section("Aquecimento", "warmup", "3 rounds · 8 min", each(["Remo ou bike", "Air squat", "Good morning", "Pass-through"], {
          prescription: "8 min; 3 rounds leves", notes: "Aumentar temperatura e ensaiar padrões do snatch.", imageUrl: IMG.powerSnatch,
        })),
        section("Mobilidade", "warmup", "2 × 6–8", each(["Overhead squat assistido", "Flexão de tornozelo"], {
          prescription: "2 × 6–8", sets: "2", reps: "6–8", notes: "Melhorar amplitude ativa para receber com segurança.", imageUrl: IMG.overheadSquat,
        })),
        section("Ativação", "warmup", "2 × 8", each(["Snatch-grip press", "Prone Y-T-W"], {
          prescription: "2 × 8 cada", sets: "2", reps: "8", notes: "Ativar escápulas, manguito e controle overhead.", imageUrl: IMG.overheadSquat,
        })),
        section("Técnica", "skill", "5 × (3 + 3)", [
          { name: "Muscle snatch + overhead squat com PVC", prescription: "5 × (3 + 3)", sets: "5", reps: "3 + 3", load: "PVC", notes: "Ensaiar trajetória próxima e ombros ativos.", imageUrl: IMG.powerSnatch },
        ]),
        section("Força", "straight_sets", "6 × 2", [
          { name: "Power snatch", prescription: "6 × 2 @ 60–70% 1RM; RPE 6–7", sets: "6", reps: "2", load: "60–70% 1RM", notes: "Desenvolver potência sem sacrificar velocidade.", imageUrl: IMG.powerSnatch },
        ]),
        section("Técnica", "skill", "5 × 2", [
          { name: "Squat snatch a partir do hang", prescription: "5 × 2 @ 55–65%", sets: "5", reps: "2", load: "55–65% 1RM", notes: "Praticar recepção baixa somente com controle.", imageUrl: IMG.hangSquatSnatch },
        ]),
        section("Força", "straight_sets", "4 × 4", [
          { name: "Overhead squat", prescription: "4 × 4; RPE 6–7", sets: "4", reps: "4", notes: "Estabilidade, mobilidade e força na posição final.", imageUrl: IMG.overheadSquat },
        ]),
        section("Final", "cooldown", "2 × 20–30 s", [
          { name: "Alongamento leve: dorsais, peitoral e tornozelo", prescription: "2 × 20–30 s", notes: "Relaxar sem forçar a articulação do ombro.", imageUrl: IMG.overheadSquat },
        ]),
      ],
    },
    {
      title: "Dia 3 — Ginástica: BMU e RMU",
      focus: "Base de puxada, transição e capacidade para bar e ring muscle-up",
      level: "intermediário",
      weekday: 4,
      notes: `Sequência: aquecer → mobilizar → ativar → força estrita → transição → capacidade → desacelerar. ${FOOTNOTE} BMU/RMU = bar/ring muscle-up.`,
      sections: [
        section("Aquecimento", "warmup", "3 rounds · 8 min", each(["Corda simples", "Ring row", "Hollow rocks"], {
          prescription: "3 rounds; 8 min", notes: "Aquecer puxada e reforçar formas hollow/arch.", imageUrl: IMG.barMuscleUp,
        })),
        section("Mobilidade", "warmup", "6 min", [
          { name: "Punhos + extensão torácica + abertura de ombro", prescription: "6 min; dinâmico", duration: "6 min", notes: "Preparar posições de apoio e transição.", imageUrl: IMG.ringMuscleUp },
        ]),
        section("Ativação", "warmup", "3 rounds", [
          { name: "Scap pull-up", prescription: "3 × 5", sets: "3", reps: "5", notes: "Fortalecer escápula, pegada e linha corporal.", imageUrl: IMG.ringMuscleUp },
          { name: "False-grip hang", prescription: "3 × 15 s", sets: "3", duration: "15 s", notes: "Fortalecer escápula, pegada e linha corporal.", imageUrl: IMG.ringMuscleUp },
          { name: "Hollow hold", prescription: "3 × 20 s", sets: "3", duration: "20 s", notes: "Fortalecer escápula, pegada e linha corporal.", imageUrl: IMG.ringMuscleUp },
        ]),
        section("Força", "straight_sets", "5 × 4–6", [
          { name: "Pull-up estrito ou puxada assistida", prescription: "5 × 4–6; parar antes da falha", sets: "5", reps: "4–6", notes: "Construir a base de força para os muscle-ups.", imageUrl: IMG.barMuscleUp },
        ]),
        section("BMU", "skill", "5 rounds", each(["Beat swing", "Chest-to-bar", "Transição em barra baixa"], {
          prescription: "5 rounds de 2–3 reps", reps: "2–3", notes: "Quebrar o movimento em partes e controlar o kip.", imageUrl: IMG.barMuscleUp,
        })),
        section("RMU", "skill", "4 × 3–5", each(["False-grip row", "Transição baixa", "Ring dip"], {
          prescription: "4 × 3–5 cada", sets: "4", reps: "3–5", notes: "Desenvolver puxada, transição e suporte nos anéis.", imageUrl: IMG.ringMuscleUp,
        })),
        section("Capacidade", "emom", "EMOM 8", [
          { name: "Progressão BMU/RMU", prescription: "2–5 reps por minuto; sem falha", duration: "8 min", notes: "Praticar consistência sem acumular fadiga técnica.", imageUrl: IMG.barMuscleUp },
        ]),
        section("Final", "cooldown", "2 × 20–30 s", [
          { name: "Alongamento leve: dorsais, bíceps e peitoral", prescription: "2 × 20–30 s", notes: "Reduzir tensão após volume de puxada.", imageUrl: IMG.ringMuscleUp },
        ]),
      ],
    },
    {
      title: "Dia 4 — Handstand, pistols e DU",
      focus: "Apoio invertido, força unilateral e corda",
      level: "intermediário",
      weekday: 5,
      notes: `Sequência: aquecer → mobilizar → ativar → handstand → pistol → força unilateral → corda → desacelerar. ${FOOTNOTE} DU = double-under.`,
      sections: [
        section("Aquecimento", "warmup", "3 rounds · 8 min", each(["Bike", "Single-unders", "Lunges", "Inchworms"], {
          prescription: "3 rounds; 8 min", notes: "Elevar temperatura e coordenar pés, quadril e ombros.", imageUrl: IMG.doubleUnder,
        })),
        section("Mobilidade", "warmup", "2 × 8", each(["Couch stretch dinâmico", "Ankle rocks", "Punhos"], {
          prescription: "2 × 8 cada", sets: "2", reps: "8", notes: "Preparar amplitude para pistol e apoio invertido.", imageUrl: IMG.pistol,
        })),
        section("Ativação", "warmup", "3 × 15–20 s", each(["Hollow hold", "Arch hold", "Wall shoulder taps"], {
          prescription: "3 × 15–20 s", sets: "3", duration: "15–20 s", notes: "Criar linha corporal e transferência de peso.", imageUrl: IMG.handstand,
        })),
        section("Handstand", "skill", "5 rounds", [
          { name: "Wall walk", prescription: "5 × 1", sets: "5", reps: "1", notes: "Fortalecer ombros e empilhamento corporal.", imageUrl: IMG.handstand },
          { name: "Chest-to-wall hold", prescription: "5 × 20–30 s", sets: "5", duration: "20–30 s", notes: "Fortalecer ombros e empilhamento corporal.", imageUrl: IMG.handstand },
        ]),
        section("Pistol", "straight_sets", "4 × 5", [
          { name: "Box pistol ou pistol assistido no rack", prescription: "4 × 5 cada perna", sets: "4", reps: "5 cada perna", notes: "Desenvolver controle unilateral e equilíbrio.", imageUrl: IMG.pistol },
        ]),
        section("Força", "straight_sets", "3 × 8", [
          { name: "Bulgarian split squat", prescription: "3 × 8 cada; RPE 7", sets: "3", reps: "8 cada", notes: "Aumentar força unilateral sem perder alinhamento.", imageUrl: IMG.pistol },
        ]),
        section("DU", "emom", "EMOM 10", [
          { name: "DU ou single-under alternado", prescription: "20–40 s por minuto", duration: "10 min", notes: "Treinar giro de punhos, salto baixo e coordenação.", imageUrl: IMG.doubleUnder },
        ]),
        section("Final", "cooldown", "2 × 20–30 s", [
          { name: "Alongamento leve: panturrilha, flexor do quadril e punhos", prescription: "2 × 20–30 s", notes: "Desacelerar e recuperar sem dor.", imageUrl: IMG.doubleUnder },
        ]),
      ],
    },
  ],
};
