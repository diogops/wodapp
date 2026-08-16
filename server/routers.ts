import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createWorkout, deleteWorkout, ensureDefaultWorkouts, getSessionHistory, getWorkoutForUser, getWorkoutsForUser, recordSession, updateWorkoutOrder } from "./db";
import { storagePut } from "./storage";
import { extractWorkoutFromPdf } from "./llm";
import { buildWorkoutPdf } from "./workoutPdf";

const exerciseSchema = z.object({ name: z.string(), prescription: z.string().optional(), sets: z.string().optional(), reps: z.string().optional(), duration: z.string().optional(), load: z.string().optional(), notes: z.string().optional() });
const sectionSchema = z.object({ title: z.string(), format: z.string().optional(), notes: z.string().optional(), exercises: z.array(exerciseSchema).default([]) });
export const workoutSchema = z.object({ title: z.string().min(1), focus: z.string().optional(), level: z.string().optional(), suggestedDate: z.coerce.date().optional(), notes: z.string().optional(), sections: z.array(sectionSchema).default([]), sourceFileKey: z.string().optional(), sourceFileName: z.string().optional() });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  workouts: router({
    list: protectedProcedure.query(({ ctx }) => ensureDefaultWorkouts(ctx.user.id)),
    history: protectedProcedure.query(({ ctx }) => getSessionHistory(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) => getWorkoutForUser(ctx.user.id, input.id)),
    create: protectedProcedure.input(workoutSchema).mutation(({ ctx, input }) => createWorkout({ ...input, userId: ctx.user.id, orderIndex: 9999 })),
    update: protectedProcedure.input(z.object({ id: z.number(), data: workoutSchema })).mutation(async ({ ctx, input }) => {
      const existing = await getWorkoutForUser(ctx.user.id, input.id);
      if (!existing) throw new Error("Workout não encontrado");
      const created = await createWorkout({ ...input.data, userId: ctx.user.id, orderIndex: existing.orderIndex });
      await deleteWorkout(ctx.user.id, input.id);
      return created;
    }),
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
    session: protectedProcedure.input(z.object({ id: z.number(), action: z.enum(["completed", "skipped"]) })).mutation(async ({ ctx, input }) => {
      const workout = await getWorkoutForUser(ctx.user.id, input.id);
      if (!workout) throw new Error("Workout não encontrado");
      return recordSession(ctx.user.id, input.id, input.action, JSON.stringify(workout));
    }),
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
