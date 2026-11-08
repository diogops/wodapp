ALTER TABLE "workoutExercises" ADD COLUMN "videoUrl" varchar(512);--> statement-breakpoint
ALTER TABLE "workoutSessions" ADD COLUMN "rpe" integer;--> statement-breakpoint
ALTER TABLE "workoutSessions" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "workouts" ADD COLUMN "archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- O programa Power Clean e Mobilidade (server/programs/power-clean.ts) vira o
-- padrão de Fortalecimento. Os Dias 1–4 continuam na Sequência, no fim e fora da
-- rotação; sem as regras que os prendiam a seg/ter/qui/sex, o seed cria a nova
-- regra seg/qua/sáb no próximo workouts.list.
DELETE FROM "scheduleRules" WHERE "preferredWorkoutId" IN (
  SELECT "id" FROM "workouts" WHERE "sourceFileName" = 'treinos_fortalecimento_crossfit.pdf'
);--> statement-breakpoint
UPDATE "workouts" SET "archived" = true, "orderIndex" = "orderIndex" + 100000
WHERE "sourceFileName" = 'treinos_fortalecimento_crossfit.pdf';--> statement-breakpoint
-- O seed só cria modalidades que faltam, então a gramática gravada muda aqui:
-- a correção do Power Clean registra carga, RPE e observações.
UPDATE "modalities"
SET "grammar" = (
  jsonb_set("grammar"::jsonb, '{trackedMetrics}', ("grammar"::jsonb -> 'trackedMetrics') || '["load"]'::jsonb)
  || '{"sessionReviewHint":"Recepção com os pés paralelos? Perdeu o equilíbrio? Dor ou dificuldade técnica?"}'::jsonb
)::text
WHERE "slug" = 'fortalecimento';
