import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { isWorkoutCategory } from "@shared/categories";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createWorkout, deleteDraft, deleteWorkout, ensureDefaultWorkouts, getDraft, getSectionTitles, getSessionHistory, getWorkoutForUser, getWorkoutsForUser, ensureModalities, backfillSectionKinds, getModalities, recordSession, renameWorkout, saveDraft, setUserCategory, updateWorkoutOrder } from "./db";
import { storagePut } from "./storage";
import { isCatalogExercise, isFocusArea } from "@shared/exerciseCatalog";
import { extractWorkoutFromPdf, generateWorkout } from "./llm";
import { buildWorkoutPdf } from "./workoutPdf";

const exerciseSchema = z.object({ name: z.string(), prescription: z.string().optional(), sets: z.string().optional(), reps: z.string().optional(), duration: z.string().optional(), load: z.string().optional(), notes: z.string().optional() });
const categorySchema = z.string().refine(isWorkoutCategory, "categoria inválida");
const sectionSchema = z.object({ title: z.string(), format: z.string().optional(), notes: z.string().optional(), exercises: z.array(exerciseSchema).default([]) });
export const workoutSchema = z.object({ title: z.string().min(1), modalityId: z.number().int().positive().optional(), focus: z.string().optional(), level: z.string().optional(), category: categorySchema.optional(), suggestedDate: z.coerce.date().optional(), notes: z.string().optional(), sections: z.array(sectionSchema).default([]), sourceFileKey: z.string().optional(), sourceFileName: z.string().optional() });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  workouts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Migração oportunista: garante modalidades e deriva os kinds antes de
      // devolver a fila. Idempotente, então roda sem custo quando já está feito.
      await ensureModalities(ctx.user.id);
      await backfillSectionKinds(ctx.user.id);
      return ensureDefaultWorkouts(ctx.user.id);
    }),
    modalities: protectedProcedure.query(({ ctx }) => getModalities(ctx.user.id)),
    history: protectedProcedure.query(({ ctx }) => getSessionHistory(ctx.user.id)),
    sectionTitles: protectedProcedure.query(({ ctx }) => getSectionTitles(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) => getWorkoutForUser(ctx.user.id, input.id)),
    create: protectedProcedure.input(workoutSchema).mutation(({ ctx, input }) =>
      // Sem categoria explícita, o workout nasce na categoria do atleta — é o
      // que faz ele aparecer no dashboard dele por padrão.
      createWorkout({ ...input, category: input.category ?? ctx.user.category ?? undefined, userId: ctx.user.id, orderIndex: 9999 })
    ),
    setCategory: protectedProcedure
      .input(z.object({ category: categorySchema }))
      .mutation(({ ctx, input }) => setUserCategory(ctx.user.id, input.category)),
    update: protectedProcedure.input(z.object({ id: z.number(), data: workoutSchema })).mutation(async ({ ctx, input }) => {
      const existing = await getWorkoutForUser(ctx.user.id, input.id);
      if (!existing) throw new Error("Workout não encontrado");
      const created = await createWorkout({ ...input.data, userId: ctx.user.id, orderIndex: existing.orderIndex });
      await deleteWorkout(ctx.user.id, input.id);
      return created;
    }),
    rename: protectedProcedure
      .input(z.object({ id: z.number(), title: z.string().min(1).max(255) }))
      .mutation(({ ctx, input }) => renameWorkout(ctx.user.id, input.id, input.title.trim())),
    remove: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => deleteWorkout(ctx.user.id, input.id)),
    exportPdf: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const workout = await getWorkoutForUser(ctx.user.id, input.id);
      if (!workout) throw new Error("Workout não encontrado");
      const pdf = await buildWorkoutPdf(workout);
      // Acentos viram ASCII antes de virar nome de arquivo: "Força" -> "forca".
      const slug = workout.title
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
      const filename = `${slug || "workout"}.pdf`;
      return { filename, base64: pdf.toString("base64") };
    }),
    reorder: protectedProcedure.input(z.object({ ids: z.array(z.number()) })).mutation(({ ctx, input }) => updateWorkoutOrder(ctx.user.id, input.ids)),
    session: protectedProcedure
      .input(z.object({
        id: z.number(),
        action: z.enum(["completed", "skipped"]),
        // Teto de 24h: um cronômetro esquecido aberto não pode virar um
        // registro absurdo no histórico.
        durationSeconds: z.number().int().min(0).max(86_400).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const workout = await getWorkoutForUser(ctx.user.id, input.id);
        if (!workout) throw new Error("Workout não encontrado");
        return recordSession(ctx.user.id, input.id, input.action, JSON.stringify(workout), input.durationSeconds);
      }),
    generate: protectedProcedure
      .input(z.object({
        // Só nomes do catálogo: aceitar texto livre aqui deixaria o usuário
        // dirigir o prompt do gerador.
        exercises: z.array(z.string()).max(30).default([]).transform(list => list.filter(isCatalogExercise)),
        focusAreas: z.array(z.string()).max(14).default([]).transform(list => list.filter(isFocusArea)),
        notes: z.string().max(500).optional(),
        // Texto livre: o app é de um usuário só, então dirigir o próprio prompt
        // é uso legítimo. O limite existe só para não estourar o contexto.
        wishlist: z.string().max(1500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getWorkoutsForUser(ctx.user.id);
        const generated = await generateWorkout({
          exercises: input.exercises,
          focusAreas: input.focusAreas,
          notes: input.notes,
          wishlist: input.wishlist,
          avoidTitles: existing.map(workout => workout.title).slice(0, 12),
        });
        // Persistido como rascunho: fechar a aba não pode descartar a proposta.
        const workout = workoutSchema.parse(generated);
        await saveDraft(ctx.user.id, workout);
        return { workout };
      }),
    draft: protectedProcedure.query(({ ctx }) => getDraft(ctx.user.id)),
    reviseDraft: protectedProcedure
      .input(z.object({ changeRequest: z.string().min(1).max(500) }))
      .mutation(async ({ ctx, input }) => {
        const draft = await getDraft(ctx.user.id);
        if (!draft) throw new Error("Nenhum workout proposto para ajustar");
        const existing = await getWorkoutsForUser(ctx.user.id);
        const revised = await generateWorkout({
          exercises: [],
          focusAreas: [],
          previousWorkout: draft.workout,
          changeRequest: input.changeRequest,
          avoidTitles: existing.map(workout => workout.title).slice(0, 12),
        });
        const workout = workoutSchema.parse(revised);
        await saveDraft(ctx.user.id, workout);
        return { workout };
      }),
    acceptDraft: protectedProcedure
      .input(z.object({ startNow: z.boolean().default(false) }))
      .mutation(async ({ ctx, input }) => {
        const draft = await getDraft(ctx.user.id);
        if (!draft) throw new Error("Nenhum workout proposto para salvar");
        const data = workoutSchema.parse(draft.workout);
        // Aceito "para treinar" entra no topo da fila; aceito "na grade" vai ao fim.
        const created = await createWorkout({ ...data, category: data.category ?? ctx.user.category ?? undefined, userId: ctx.user.id, orderIndex: input.startNow ? -1 : 9999 });
        await deleteDraft(ctx.user.id);
        return created;
      }),
    discardDraft: protectedProcedure.mutation(({ ctx }) => deleteDraft(ctx.user.id)),
    importPdf: protectedProcedure.input(z.object({ filename: z.string(), mimeType: z.string().default("application/pdf"), base64: z.string() })).mutation(async ({ ctx, input }) => {
      const bytes = Buffer.from(input.base64, "base64");
      const uploaded = await storagePut(`${ctx.user.id}-workouts/${Date.now()}-${input.filename.replace(/[^a-zA-Z0-9._-]/g, "-")}`, bytes, input.mimeType);
      const parsed = await extractWorkoutFromPdf(input.base64);
      const validated = workoutSchema.parse(parsed);
      return { workout: { ...validated, sourceFileKey: uploaded.key, sourceFileName: input.filename }, sourceFileKey: uploaded.key, sourceFileName: input.filename };
    }),
  }),
});

export type AppRouter = typeof appRouter;
