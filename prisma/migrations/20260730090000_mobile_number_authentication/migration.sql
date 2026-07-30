-- Preserve every existing user while making non-null mobile numbers unique.
-- The earliest account keeps a duplicated historical number; later duplicate
-- rows are cleared so they can be assigned real unique numbers safely.
WITH "rankedPhones" AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY phone
      ORDER BY "createdAt" ASC, id ASC
    ) AS "phoneRank"
  FROM "User"
  WHERE phone IS NOT NULL AND BTRIM(phone) <> ''
)
UPDATE "User"
SET phone = NULL
WHERE id IN (
  SELECT id FROM "rankedPhones" WHERE "phoneRank" > 1
);

ALTER TABLE "User" ALTER COLUMN email DROP NOT NULL;

CREATE UNIQUE INDEX "User_phone_key" ON "User"(phone);
