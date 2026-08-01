ALTER TABLE "doubts"
ADD COLUMN "is_pinned" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "doubt_replies"
ADD COLUMN "admin_id" UUID,
ADD COLUMN "is_pinned" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "doubt_replies"
ADD CONSTRAINT "doubt_replies_admin_id_fkey"
FOREIGN KEY ("admin_id") REFERENCES "admins"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "doubts_mentorship_batch_id_visibility_status_is_pinned_idx"
ON "doubts"("mentorship_batch_id", "visibility", "status", "is_pinned");

CREATE INDEX "doubt_replies_doubt_id_parent_reply_id_is_pinned_created_at_idx"
ON "doubt_replies"("doubt_id", "parent_reply_id", "is_pinned", "created_at");
