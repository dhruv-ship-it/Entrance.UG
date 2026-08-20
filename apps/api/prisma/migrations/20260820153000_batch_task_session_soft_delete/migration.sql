ALTER TABLE "batch_tasks"
  ADD COLUMN "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deleted_at" TIMESTAMPTZ(3),
  ADD COLUMN "deleted_by" UUID;

ALTER TABLE "batch_tasks"
  ADD CONSTRAINT "batch_tasks_deleted_by_fkey"
  FOREIGN KEY ("deleted_by") REFERENCES "mentors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "batch_tasks_mentorship_batch_id_is_deleted_start_datetime_idx"
  ON "batch_tasks"("mentorship_batch_id", "is_deleted", "start_datetime");

ALTER TABLE "live_sessions"
  ADD COLUMN "updated_by" UUID,
  ADD COLUMN "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deleted_at" TIMESTAMPTZ(3),
  ADD COLUMN "deleted_by" UUID;

UPDATE "live_sessions" SET "updated_by" = "created_by" WHERE "updated_by" IS NULL;

ALTER TABLE "live_sessions"
  ADD CONSTRAINT "live_sessions_updated_by_fkey"
  FOREIGN KEY ("updated_by") REFERENCES "mentors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "live_sessions"
  ADD CONSTRAINT "live_sessions_deleted_by_fkey"
  FOREIGN KEY ("deleted_by") REFERENCES "mentors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "live_sessions_mentorship_batch_id_is_deleted_start_datetime_idx"
  ON "live_sessions"("mentorship_batch_id", "is_deleted", "start_datetime");
