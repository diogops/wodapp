-- As demonstrações da musculação passaram de musculacao-*.png (desenho vetorial)
-- para musculacao-*.jpg (geradas). O seed grava imageUrl em cada exercício e não
-- reescreve treinos já semeados, então os existentes ainda apontam para o PNG,
-- que não existe mais — e o service worker seguia servindo o PNG antigo do cache.
UPDATE "workoutExercises"
SET "imageUrl" = regexp_replace("imageUrl", '\.png$', '.jpg')
WHERE "imageUrl" LIKE '/demos/musculacao-%.png';
