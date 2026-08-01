ALTER TABLE "batch_tests"
  ADD COLUMN "start_datetime" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "end_datetime" TIMESTAMPTZ(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 minute'),
  ADD COLUMN "created_by_admin" UUID,
  ADD COLUMN "updated_by_admin" UUID,
  ALTER COLUMN "created_by" DROP NOT NULL,
  ALTER COLUMN "updated_by" DROP NOT NULL;

ALTER TABLE "batch_tests"
  ALTER COLUMN "start_datetime" DROP DEFAULT,
  ALTER COLUMN "end_datetime" DROP DEFAULT,
  ADD CONSTRAINT "batch_tests_created_by_admin_fkey" FOREIGN KEY ("created_by_admin") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "batch_tests_updated_by_admin_fkey" FOREIGN KEY ("updated_by_admin") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "batch_tests_creator_required" CHECK (("created_by" IS NOT NULL)::int + ("created_by_admin" IS NOT NULL)::int = 1),
  ADD CONSTRAINT "batch_tests_updater_required" CHECK (("updated_by" IS NOT NULL)::int + ("updated_by_admin" IS NOT NULL)::int = 1),
  ADD CONSTRAINT "batch_tests_schedule_valid" CHECK ("end_datetime" > "start_datetime");

CREATE INDEX "batch_tests_mentorship_batch_id_start_datetime_idx" ON "batch_tests"("mentorship_batch_id", "start_datetime");
