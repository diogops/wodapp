-- Fortalecimento deixa de registrar carga (shared/modalities.ts): o atleta
-- ajusta a carga por conforto, sem campo no treino. O seed só cria modalidades
-- que faltam, então a gramática já gravada precisa ser corrigida aqui.
UPDATE "modalities"
SET "grammar" = jsonb_set("grammar"::jsonb, '{trackedMetrics}', ("grammar"::jsonb -> 'trackedMetrics') - 'load')::text
WHERE "slug" = 'fortalecimento';
