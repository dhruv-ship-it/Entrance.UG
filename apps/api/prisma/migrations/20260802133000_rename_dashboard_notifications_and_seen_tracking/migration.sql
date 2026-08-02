ALTER TABLE "dashboard_notices" RENAME TO "dashboard_notifications";

ALTER INDEX IF EXISTS "dashboard_notices_is_active_start_datetime_end_datetime_idx"
  RENAME TO "dashboard_notifications_is_active_start_datetime_end_datetime_idx";

ALTER TABLE "dashboard_notifications"
  RENAME CONSTRAINT "dashboard_notices_pkey" TO "dashboard_notifications_pkey";

ALTER TABLE "dashboard_notifications"
  RENAME CONSTRAINT "dashboard_notices_created_by_fkey" TO "dashboard_notifications_created_by_fkey";

ALTER TABLE "dashboard_notifications"
  RENAME CONSTRAINT "dashboard_notices_updated_by_fkey" TO "dashboard_notifications_updated_by_fkey";

ALTER TABLE "dashboard_notifications"
  RENAME CONSTRAINT "dashboard_notices_valid_schedule" TO "dashboard_notifications_valid_schedule";

CREATE TABLE "student_dashboard_notification_seen" (
  "id" UUID NOT NULL,
  "student_id" UUID NOT NULL,
  "dashboard_notification_id" UUID NOT NULL,
  "seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "student_dashboard_notification_seen_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_dashboard_notification_seen_student_id_dashboard_notification_id_key"
  ON "student_dashboard_notification_seen"("student_id", "dashboard_notification_id");

CREATE INDEX "student_dashboard_notification_seen_student_id_seen_at_idx"
  ON "student_dashboard_notification_seen"("student_id", "seen_at");

ALTER TABLE "student_dashboard_notification_seen"
  ADD CONSTRAINT "student_dashboard_notification_seen_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_dashboard_notification_seen"
  ADD CONSTRAINT "student_dashboard_notification_seen_dashboard_notification_id_fkey"
  FOREIGN KEY ("dashboard_notification_id") REFERENCES "dashboard_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
