import { boolean, integer, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const sessionActionEnum = pgEnum("sessionAction", ["completed", "skipped"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  // Categoria do atleta. Define o filtro padrão do dashboard e a categoria
  // herdada por workouts que ele cria.
  category: varchar("category", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * Modalidade de treino. `grammar` é JSON porque é configuração declarativa —
 * normalizá-la em tabelas custaria joins em toda leitura para um dado que é
 * sempre lido inteiro e nunca consultado por campo.
 */
export const modalities = pgTable("modalities", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  slug: varchar("slug", { length: 64 }).notNull(),
  name: varchar("name", { length: 64 }).notNull(),
  color: varchar("color", { length: 16 }).notNull(),
  icon: varchar("icon", { length: 32 }).notNull(),
  grammar: text("grammar").notNull(),
  builtIn: boolean("builtIn").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  orderIndex: integer("orderIndex").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  focus: text("focus"),
  level: varchar("level", { length: 64 }),
  category: varchar("category", { length: 32 }),
  modalityId: integer("modalityId"),
  suggestedDate: timestamp("suggestedDate"),
  notes: text("notes"),
  orderIndex: integer("orderIndex").notNull().default(0),
  sourceFileKey: varchar("sourceFileKey", { length: 512 }),
  sourceFileName: varchar("sourceFileName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const workoutSections = pgTable("workoutSections", {
  id: serial("id").primaryKey(),
  workoutId: integer("workoutId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  format: varchar("format", { length: 64 }),
  // Semântica do bloco, derivada de `format` na migração. Guia como o
  // sequenciador cronometra a seção.
  kind: varchar("kind", { length: 32 }),
  notes: text("notes"),
  orderIndex: integer("orderIndex").notNull().default(0),
});

export const workoutExercises = pgTable("workoutExercises", {
  id: serial("id").primaryKey(),
  sectionId: integer("sectionId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  prescription: text("prescription"),
  sets: varchar("sets", { length: 64 }),
  reps: varchar("reps", { length: 64 }),
  duration: varchar("duration", { length: 64 }),
  load: varchar("load", { length: 128 }),
  notes: text("notes"),
  orderIndex: integer("orderIndex").notNull().default(0),
});

/**
 * Workout proposto pela IA e ainda não aceito. Fica fora de `workouts` de
 * propósito: um rascunho não pertence à fila e não pode aparecer no sorteio do
 * treino do dia. Persistido — e não mantido no estado do cliente — para que
 * fechar a aba não descarte a proposta.
 */
export const workoutDrafts = pgTable("workoutDrafts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  payload: text("payload").notNull(),
  source: varchar("source", { length: 32 }).notNull().default("generated"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const workoutSessions = pgTable("workoutSessions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  workoutId: integer("workoutId").notNull(),
  action: sessionActionEnum("action").notNull(),
  performedAt: timestamp("performedAt").defaultNow().notNull(),
  // Tempo cronometrado do WOD, quando o atleta usou o timer. Nulo quando ele
  // apenas marcou como concluído sem cronometrar.
  durationSeconds: integer("durationSeconds"),
  snapshot: text("snapshot"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Workout = typeof workouts.$inferSelect;
export type InsertWorkout = typeof workouts.$inferInsert;
export type WorkoutSection = typeof workoutSections.$inferSelect;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type WorkoutDraft = typeof workoutDrafts.$inferSelect;
export type Modality = typeof modalities.$inferSelect;
