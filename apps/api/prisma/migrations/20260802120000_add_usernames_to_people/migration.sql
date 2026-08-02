ALTER TABLE "students" ADD COLUMN "username" VARCHAR(50);
UPDATE "students"
SET "username" = LEFT(
  LOWER(REGEXP_REPLACE(SPLIT_PART("email", '@', 1), '[^a-zA-Z0-9_]', '_', 'g')) || '_' || SUBSTRING(REPLACE("id"::text, '-', ''), 1, 6),
  50
)
WHERE "username" IS NULL;
ALTER TABLE "students" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "students_username_key" ON "students"("username");

ALTER TABLE "mentors" ADD COLUMN "username" VARCHAR(50);
UPDATE "mentors"
SET "username" = LEFT(
  LOWER(REGEXP_REPLACE(SPLIT_PART("email", '@', 1), '[^a-zA-Z0-9_]', '_', 'g')) || '_' || SUBSTRING(REPLACE("id"::text, '-', ''), 1, 6),
  50
)
WHERE "username" IS NULL;
ALTER TABLE "mentors" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "mentors_username_key" ON "mentors"("username");

ALTER TABLE "parents" ADD COLUMN "username" VARCHAR(50);
UPDATE "parents"
SET "username" = LEFT(
  LOWER(REGEXP_REPLACE(SPLIT_PART("email", '@', 1), '[^a-zA-Z0-9_]', '_', 'g')) || '_' || SUBSTRING(REPLACE("id"::text, '-', ''), 1, 6),
  50
)
WHERE "username" IS NULL;
ALTER TABLE "parents" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "parents_username_key" ON "parents"("username");
