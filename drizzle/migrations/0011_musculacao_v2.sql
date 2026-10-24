-- Musculação v2 (server/programs/musculacao.ts, sourceFileName 'musculacao-v2')
-- substitui a transcrição de workouts-crossfit-ilustrados.pdf. O seed só cria
-- treinos que ainda não existem, então a v1 precisa sair daqui; a v2 é semeada
-- no próximo workouts.list. Sessões e cargas registradas ficam: guardam o
-- snapshot e o nome do exercício, não dependem do treino existir.
DELETE FROM "workoutExercises" WHERE "sectionId" IN (
  SELECT s."id" FROM "workoutSections" s JOIN "workouts" w ON w."id" = s."workoutId"
  WHERE w."sourceFileName" = 'workouts-crossfit-ilustrados.pdf'
);
--> statement-breakpoint
DELETE FROM "workoutSections" WHERE "workoutId" IN (
  SELECT "id" FROM "workouts" WHERE "sourceFileName" = 'workouts-crossfit-ilustrados.pdf'
);
--> statement-breakpoint
UPDATE "scheduleRules" SET "preferredWorkoutId" = NULL WHERE "preferredWorkoutId" IN (
  SELECT "id" FROM "workouts" WHERE "sourceFileName" = 'workouts-crossfit-ilustrados.pdf'
);
--> statement-breakpoint
DELETE FROM "workouts" WHERE "sourceFileName" = 'workouts-crossfit-ilustrados.pdf';
