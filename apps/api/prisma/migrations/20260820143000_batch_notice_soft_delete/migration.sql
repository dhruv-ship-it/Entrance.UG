ALTER TABLE "batch_notices"
  ADD COLUMN "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "deleted_at" TIMESTAMPTZ(3),
  ADD COLUMN "deleted_by" UUID,
  ADD COLUMN "deleted_by_admin" UUID;

ALTER TABLE "batch_notices"
  ADD CONSTRAINT "batch_notices_deleted_by_fkey"
  FOREIGN KEY ("deleted_by") REFERENCES "mentors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "batch_notices"
  ADD CONSTRAINT "batch_notices_deleted_by_admin_fkey"
  FOREIGN KEY ("deleted_by_admin") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "batch_notices_mentorship_batch_id_is_deleted_created_at_idx"
  ON "batch_notices"("mentorship_batch_id", "is_deleted", "created_at");
