import path from "node:path";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { InsertUser, users, workoutDrafts, workouts, workoutExercises, workoutSections, workoutSessions } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

const DEFAULT_WORKOUTS = [
  { title: "Workout A - Double Under + Engine", focus: "Técnica de corda, coordenação e condicionamento", level: "intermediário", notes: "Escala do DU: tente primeiro os Double Unders. Se perder muito tempo, faça 30 DU ou 60 Single Unders.", sections: [
    { title: "Técnica - 12 min", format: "3 rounds", notes: "20 saltos sem corda mantendo o corpo reto; 20 pogo jumps; 30 Single Unders; 10 tentativas de Single-Single-Double; 10 tentativas de Single-Double-Single", exercises: [{ name: "Técnica de corda", prescription: "3 rounds", duration: "12 min", notes: "Coordenação e postura" }] },
    { title: "Depois - EMOM 5", format: "EMOM", exercises: [{ name: "Double Under", prescription: "20-30s tentando Double Under; descansar o restante do minuto", duration: "5 min" }] },
    { title: "WOD - AMRAP 15", format: "AMRAP 15", exercises: [{ name: "Burpees", reps: "10" }, { name: "Double Unders", reps: "30" }, { name: "Air Squats", reps: "20" }, { name: "Walking Lunges", reps: "10", load: "10 kg" }, { name: "Double Unders", reps: "30" }] },
    { title: "Finisher - Bike 8 min", format: "8 rounds", exercises: [{ name: "Bike", prescription: "20s muito forte / 40s leve", duration: "8 min" }] },
  ] },
  { title: "Workout B - Base para BMU / RMU", focus: "Hollow, arch, core, empurrada, dip e memória motora", level: "intermediário", notes: "Esta parte não é para carga. O objetivo é criar controle corporal e memorizar o padrão de transição do muscle-up.", sections: [
    { title: "Hollow / Arch - 4 rounds", format: "4 rounds", exercises: [{ name: "Hollow Hold", duration: "20s" }, { name: "Descanso", duration: "10s" }, { name: "Superman / Arch Hold", duration: "20s" }, { name: "Descanso", duration: "30s" }] },
    { title: "Hollow Rocks", exercises: [{ name: "Hollow Rocks", reps: "4 x 10-15" , notes: "Manter o tronco firme sem quebrar o quadril" }] },
    { title: "Push-up Strength", exercises: [{ name: "Push-ups", reps: "4 x 10-15" }, { name: "Push-ups explosivos", reps: "3 x 8-12" }] },
    { title: "Paralelas - 4 rounds", format: "4 rounds", exercises: [{ name: "Dips", reps: "8-12" }, { name: "L-Sit ou Tuck L-Sit", duration: "20s" }, { name: "Push-ups", reps: "10" }, { name: "Hollow Hold", duration: "20s" }] },
    { title: "Transição simulada com cano / PVC", exercises: [{ name: "Transição de muscle-up", reps: "5 x 8 repetições lentas", notes: "Hollow -> puxada -> cotovelos para trás -> peito sobre a barra -> press" }] },
  ] },
  { title: "Workout C - Engine / Base Aeróbica", focus: "Construir motor sem transformar tudo em WOD", level: "base", notes: "Você deve conseguir falar uma frase curta sem ficar completamente ofegante. Não transforme este treino em sprint ou WOD.", sections: [
    { title: "Cardio - 30 min", format: "steady", exercises: [{ name: "Cardio", prescription: "5 min leve; 20 min ritmo constante; 5 min leve", duration: "30 min", notes: "Use bicicleta estacionária ou corrida. Mantenha ritmo sustentável e controlado." }] },
    { title: "Core - 3 rounds", format: "3 rounds", exercises: [{ name: "Sit-ups", reps: "15" }, { name: "Russian Twists", reps: "20" }, { name: "Hollow Hold", duration: "20s" }, { name: "Dead Bug", reps: "10/10" }, { name: "Prancha", duration: "30s" }] },
  ] },
  { title: "Workout D - Skill sob fadiga", focus: "Manter coordenação e técnica com frequência cardíaca elevada", level: "intermediário", notes: "O objetivo é chegar cansado no DU, mas ainda capaz de praticar técnica. Se necessário, reduza repetições para preservar qualidade.", sections: [
    { title: "EMOM 20 - 5 movimentos x 4 rounds", format: "EMOM 20", exercises: [{ name: "Burpees", reps: "10", notes: "Minuto 1" }, { name: "Double Unders", reps: "30-40", notes: "Minuto 2" }, { name: "Goblet Squats", reps: "12", load: "10 kg", notes: "Minuto 3" }, { name: "Dips nas paralelas", reps: "8-12", notes: "Minuto 4" }, { name: "Bike", duration: "40s", notes: "Minuto 5" }] },
  ] },
] as const;

// Falha alto e cedo: a versão anterior devolvia null quando faltava
// DATABASE_URL, e as leituras degradavam para lista vazia — o app parecia
// funcionar, só que sem nenhum workout e sem erro visível.
export async function getDb() {
  if (!_db) {
    if (!ENV.databaseUrl) throw new Error("DATABASE_URL não configurada: o banco é obrigatório para rodar o app");
    _db = drizzle(ENV.databaseUrl);
  }
  return _db;
}

// Roda no boot: o Postgres da Railway só é alcançável pela rede interna, então
// não há como aplicar migrations da máquina local nem de um passo de build.
export async function runMigrations() {
  const db = await getDb();
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle", "migrations") });
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  // Só o dono passa pelo gate do OAuth, então todo usuário que chega aqui é admin.
  values.role = user.role ?? 'admin';
  updateSet.role = values.role;
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getWorkoutsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(workouts).where(eq(workouts.userId, userId)).orderBy(asc(workouts.orderIndex), asc(workouts.id));
  if (!rows.length) return [];
  const ids = rows.map(row => row.id);
  const sections = await db.select().from(workoutSections).where(inArray(workoutSections.workoutId, ids)).orderBy(asc(workoutSections.orderIndex));
  const sectionIds = sections.map(section => section.id);
  const exercises = sectionIds.length ? await db.select().from(workoutExercises).where(inArray(workoutExercises.sectionId, sectionIds)).orderBy(asc(workoutExercises.orderIndex)) : [];
  return rows.map(workout => ({
    ...workout,
    sections: sections.filter(section => section.workoutId === workout.id).map(section => ({
      ...section,
      exercises: exercises.filter(exercise => exercise.sectionId === section.id),
    })),
  }));
}

/**
 * Títulos de seção já usados pelo atleta, mais frequentes primeiro. Alimenta o
 * select do formulário: título livre em cada workout despadroniza a fila e
 * impede comparar sessões equivalentes ao longo do tempo.
 */
export async function getSectionTitles(userId: number) {
  const db = await getDb();
  const rows = await db
    .select({ title: workoutSections.title })
    .from(workoutSections)
    .innerJoin(workouts, eq(workoutSections.workoutId, workouts.id))
    .where(eq(workouts.userId, userId));

  const counts = new Map<string, number>();
  for (const row of rows) {
    const title = row.title.trim();
    if (title) counts.set(title, (counts.get(title) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
    .map(([title]) => title);
}

export async function getWorkoutForUser(userId: number, workoutId: number) {
  const all = await getWorkoutsForUser(userId);
  return all.find(workout => workout.id === workoutId);
}

export async function ensureDefaultWorkouts(userId: number) {
  const existing = await getWorkoutsForUser(userId);
  if (existing.length) return existing;
  for (let index = 0; index < DEFAULT_WORKOUTS.length; index++) {
    const workout = DEFAULT_WORKOUTS[index];
    await createWorkout({ ...workout, userId, orderIndex: index, sections: workout.sections.map(section => ({ ...section, exercises: [...section.exercises] })) });
  }
  return getWorkoutsForUser(userId);
}

export async function createWorkout(data: { userId: number; title: string; focus?: string; level?: string; suggestedDate?: Date; notes?: string; orderIndex: number; sourceFileKey?: string; sourceFileName?: string; sections: Array<{ title: string; format?: string; notes?: string; exercises: Array<{ name: string; prescription?: string; sets?: string; reps?: string; duration?: string; load?: string; notes?: string }> }> }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const inserted = await db.insert(workouts).values({ ...data, suggestedDate: data.suggestedDate ?? null, sourceFileKey: data.sourceFileKey ?? null, sourceFileName: data.sourceFileName ?? null }).returning({ id: workouts.id });
  const workoutId = inserted[0]?.id;
  if (!workoutId) throw new Error("Workout was not created");
  for (let sectionIndex = 0; sectionIndex < data.sections.length; sectionIndex++) {
    const section = data.sections[sectionIndex];
    const sectionInsert = await db.insert(workoutSections).values({ workoutId, title: section.title, format: section.format ?? null, notes: section.notes ?? null, orderIndex: sectionIndex }).returning({ id: workoutSections.id });
    const sectionId = sectionInsert[0]?.id;
    if (!sectionId) continue;
    if (section.exercises.length) await db.insert(workoutExercises).values(section.exercises.map((exercise, index) => ({ ...exercise, sectionId, orderIndex: index })));
  }
  return getWorkoutForUser(data.userId, workoutId);
}

export async function recordSession(userId: number, workoutId: number, action: "completed" | "skipped", snapshot: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(workoutSessions).values({ userId, workoutId, action, snapshot });
  return getSessionHistory(userId);
}

export async function getSessionHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ session: workoutSessions, workout: workouts }).from(workoutSessions).leftJoin(workouts, eq(workoutSessions.workoutId, workouts.id)).where(eq(workoutSessions.userId, userId)).orderBy(desc(workoutSessions.performedAt));
}

export async function updateWorkoutOrder(userId: number, orderedIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  for (let index = 0; index < orderedIds.length; index++) {
    await db.update(workouts).set({ orderIndex: index }).where(and(eq(workouts.id, orderedIds[index]), eq(workouts.userId, userId)));
  }
  return getWorkoutsForUser(userId);
}

/**
 * Um rascunho por usuário: gerar de novo substitui a proposta anterior em vez
 * de acumular uma pilha de sugestões esquecidas.
 */
export async function saveDraft(userId: number, payload: unknown, source = "generated") {
  const db = await getDb();
  await db.delete(workoutDrafts).where(eq(workoutDrafts.userId, userId));
  const inserted = await db
    .insert(workoutDrafts)
    .values({ userId, payload: JSON.stringify(payload), source })
    .returning();
  return inserted[0];
}

export async function getDraft(userId: number) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(workoutDrafts)
    .where(eq(workoutDrafts.userId, userId))
    .orderBy(desc(workoutDrafts.createdAt))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  try {
    return { id: row.id, source: row.source, createdAt: row.createdAt, workout: JSON.parse(row.payload) };
  } catch {
    // Payload corrompido não pode travar a tela inicial para sempre.
    await deleteDraft(userId);
    return null;
  }
}

export async function deleteDraft(userId: number) {
  const db = await getDb();
  await db.delete(workoutDrafts).where(eq(workoutDrafts.userId, userId));
  return true;
}

export async function deleteWorkout(userId: number, workoutId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const workout = await getWorkoutForUser(userId, workoutId);
  if (!workout) return false;
  const sectionIds = workout.sections.map(section => section.id);
  if (sectionIds.length) await db.delete(workoutExercises).where(inArray(workoutExercises.sectionId, sectionIds));
  await db.delete(workoutSections).where(eq(workoutSections.workoutId, workoutId));
  await db.delete(workouts).where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)));
  return true;
}
