-- Demonstrações da musculação com início, meio e fim empilhados:
-- musculacao-<x>.jpg vira musculacao-<x>-fases.jpg. Nome novo de propósito: o
-- service worker serve /demos/ cache-first e nunca atualizaria o mesmo nome.
UPDATE "workoutExercises"
SET "imageUrl" = regexp_replace("imageUrl", '\.jpg$', '-fases.jpg')
WHERE "imageUrl" LIKE '/demos/musculacao-%.jpg' AND "imageUrl" NOT LIKE '%-fases.jpg';
