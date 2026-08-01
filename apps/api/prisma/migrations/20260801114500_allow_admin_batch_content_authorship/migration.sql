ALTER TABLE "batch_notices"
  ADD COLUMN "created_by_admin" UUID,
  ADD COLUMN "updated_by" UUID,
  ADD COLUMN "updated_by_admin" UUID,
  ALTER COLUMN "created_by" DROP NOT NULL;
UPDATE "batch_notices" SET "updated_by" = "created_by" WHERE "updated_by" IS NULL;

ALTER TABLE "batch_sections"
  ADD COLUMN "created_by_admin" UUID,
  ADD COLUMN "updated_by_admin" UUID,
  ALTER COLUMN "created_by" DROP NOT NULL,
  ALTER COLUMN "updated_by" DROP NOT NULL;

ALTER TABLE "batch_comprehensions"
  ADD COLUMN "created_by_admin" UUID,
  ADD COLUMN "updated_by_admin" UUID,
  ALTER COLUMN "created_by" DROP NOT NULL,
  ALTER COLUMN "updated_by" DROP NOT NULL;

ALTER TABLE "batch_questions"
  ADD COLUMN "created_by_admin" UUID,
  ADD COLUMN "updated_by_admin" UUID,
  ALTER COLUMN "created_by" DROP NOT NULL,
  ALTER COLUMN "updated_by" DROP NOT NULL;

ALTER TABLE "batch_notices"
  ADD CONSTRAINT "batch_notices_created_by_admin_fkey" FOREIGN KEY ("created_by_admin") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "batch_notices_updated_by_admin_fkey" FOREIGN KEY ("updated_by_admin") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "batch_notices_creator_required" CHECK (("created_by" IS NOT NULL)::int + ("created_by_admin" IS NOT NULL)::int = 1),
  ADD CONSTRAINT "batch_notices_updater_required" CHECK (("updated_by" IS NOT NULL)::int + ("updated_by_admin" IS NOT NULL)::int = 1);

ALTER TABLE "batch_sections"
  ADD CONSTRAINT "batch_sections_created_by_admin_fkey" FOREIGN KEY ("created_by_admin") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "batch_sections_updated_by_admin_fkey" FOREIGN KEY ("updated_by_admin") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "batch_sections_creator_required" CHECK (("created_by" IS NOT NULL)::int + ("created_by_admin" IS NOT NULL)::int = 1),
  ADD CONSTRAINT "batch_sections_updater_required" CHECK (("updated_by" IS NOT NULL)::int + ("updated_by_admin" IS NOT NULL)::int = 1);

ALTER TABLE "batch_comprehensions"
  ADD CONSTRAINT "batch_comprehensions_created_by_admin_fkey" FOREIGN KEY ("created_by_admin") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "batch_comprehensions_updated_by_admin_fkey" FOREIGN KEY ("updated_by_admin") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "batch_comprehensions_creator_required" CHECK (("created_by" IS NOT NULL)::int + ("created_by_admin" IS NOT NULL)::int = 1),
  ADD CONSTRAINT "batch_comprehensions_updater_required" CHECK (("updated_by" IS NOT NULL)::int + ("updated_by_admin" IS NOT NULL)::int = 1);

ALTER TABLE "batch_questions"
  ADD CONSTRAINT "batch_questions_created_by_admin_fkey" FOREIGN KEY ("created_by_admin") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "batch_questions_updated_by_admin_fkey" FOREIGN KEY ("updated_by_admin") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "batch_questions_creator_required" CHECK (("created_by" IS NOT NULL)::int + ("created_by_admin" IS NOT NULL)::int = 1),
  ADD CONSTRAINT "batch_questions_updater_required" CHECK (("updated_by" IS NOT NULL)::int + ("updated_by_admin" IS NOT NULL)::int = 1);
