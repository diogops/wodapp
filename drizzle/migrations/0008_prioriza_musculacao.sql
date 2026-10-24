-- Musculação passa a ser a modalidade prioritária: em dia com mais de uma regra
-- sem horário (ter/qui/sex com Fortalecimento), o app abre nela. Muda depois
-- pela agenda ("Dia com mais de um treino sem horário: abrir").
UPDATE "modalities" AS m
SET "orderIndex" = (SELECT MIN(x."orderIndex") - 1 FROM "modalities" AS x WHERE x."userId" = m."userId")
WHERE m."slug" = 'strength';
