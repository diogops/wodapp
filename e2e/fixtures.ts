import type { Page } from "@playwright/test";

/**
 * Intercepta o tRPC para renderizar a interface logada sem sessão nem banco.
 *
 * Sem isto os testes só alcançariam a landing, que é justamente onde não houve
 * nenhum bug — os problemas todos vivem na tela de treino, atrás do login.
 */

const user = {
  id: 1,
  openId: "google:test",
  name: "Atleta Teste",
  email: "teste@example.com",
  loginMethod: "google",
  role: "admin",
  category: "Intermediário",
  // Datas como string: superjson sem `meta` repassa o valor cru, e o app só as
  // usa dentro de `new Date(...)`.
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  lastSignedIn: "2026-08-17T10:00:00.000Z",
};

function exercise(id: number, name: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    sectionId: 1,
    name,
    prescription: null,
    sets: null,
    reps: null,
    duration: null,
    load: null,
    notes: null,
    orderIndex: 0,
    ...extra,
  };
}

const workouts = [
  {
    id: 1,
    userId: 1,
    modalityId: 1,
    title: "Workout A - Double Under + Engine",
    focus: "Técnica de corda, coordenação e condicionamento",
    level: "intermediário",
    category: "Intermediário",
    suggestedDate: null,
    notes: "Escala do DU: tente primeiro os Double Unders.",
    orderIndex: 0,
    sourceFileKey: null,
    sourceFileName: null,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    sections: [
      {
        id: 1,
        workoutId: 1,
        title: "Técnica - 12 min",
        format: "3 rounds",
        notes: null,
        orderIndex: 0,
        exercises: [exercise(1, "Técnica de corda", { duration: "12 min", prescription: "3 rounds" })],
      },
      {
        id: 2,
        workoutId: 1,
        title: "WOD - AMRAP 15",
        format: "AMRAP 15",
        notes: null,
        orderIndex: 1,
        exercises: [
          exercise(2, "Burpees", { reps: "10" }),
          exercise(3, "Double Unders", { reps: "30" }),
          exercise(4, "Air Squats", { reps: "20" }),
          exercise(5, "Walking Lunges", { reps: "10", load: "10 kg" }),
        ],
      },
      {
        id: 3,
        workoutId: 1,
        title: "Finisher - Bike 8 min",
        format: "8 rounds",
        notes: null,
        orderIndex: 2,
        exercises: [exercise(6, "Bike", { duration: "8 min", prescription: "20s forte / 40s leve" })],
      },
    ],
  },
  {
    id: 2,
    userId: 1,
    modalityId: 1,
    title: "Workout C - Engine / Base Aeróbica",
    focus: "Construir motor sem transformar tudo em WOD",
    level: "base",
    category: "Intermediário",
    suggestedDate: null,
    notes: null,
    orderIndex: 1,
    sourceFileKey: null,
    sourceFileName: null,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    sections: [
      {
        id: 4,
        workoutId: 2,
        title: "Cardio - 30 min",
        format: "steady",
        notes: null,
        orderIndex: 0,
        exercises: [exercise(7, "Cardio", { duration: "30 min", prescription: "5 min leve; 20 min ritmo" })],
      },
    ],
  },
];

const modalities = [
  {
    id: 1,
    userId: 1,
    slug: "crossfit",
    name: "CrossFit",
    color: "#e06b3c",
    icon: "Dumbbell",
    grammar: "{}",
    builtIn: true,
    archived: false,
    orderIndex: 0,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
  },
];

const RESPONSES: Record<string, unknown> = {
  "auth.me": user,
  "workouts.list": workouts,
  "workouts.history": [],
  "workouts.draft": null,
  "workouts.modalities": modalities,
  "workouts.sectionTitles": ["Técnica - 12 min", "WOD - AMRAP 15", "Finisher - Bike 8 min"],
  "workouts.stats": { weekly: [], byModality: [], loadProgression: [] },
  // Agenda vazia com sinais zerados: é o estado de quem só faz CrossFit, que é
  // o padrão do app — e é nele que a tela de treino precisa continuar certa.
  "schedule.list": [],
  "schedule.signals": { lastPerformedAt: {}, recentUseByModality: {}, lastUsedModalityId: null },
};

export async function stubApi(page: Page) {
  await page.route("**/api/trpc/**", async route => {
    const url = new URL(route.request().url());
    // httpBatchLink junta procedures separadas por vírgula no caminho, e a
    // resposta precisa ser um array na mesma ordem.
    const names = decodeURIComponent(url.pathname.replace("/api/trpc/", "")).split(",");
    const body = names.map(name => ({
      result: { data: { json: RESPONSES[name] ?? null } },
    }));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

export const fixtures = { user, workouts };
