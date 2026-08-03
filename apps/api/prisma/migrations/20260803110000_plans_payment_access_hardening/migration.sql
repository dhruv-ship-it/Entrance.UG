DROP INDEX IF EXISTS "student_mock_access_student_id_exam_type_id_purchase_id_key";
DROP INDEX IF EXISTS "student_content_access_student_id_purchase_id_key";
DROP INDEX IF EXISTS "student_batch_access_student_id_mentorship_batch_id_purchase_id_key";

CREATE UNIQUE INDEX IF NOT EXISTS "student_mock_access_student_id_exam_type_id_key"
  ON "student_mock_access"("student_id", "exam_type_id");

CREATE UNIQUE INDEX IF NOT EXISTS "student_content_access_student_id_key"
  ON "student_content_access"("student_id");

CREATE UNIQUE INDEX IF NOT EXISTS "student_batch_access_student_id_mentorship_batch_id_key"
  ON "student_batch_access"("student_id", "mentorship_batch_id");

CREATE TABLE "payment_webhook_events" (
  "id" UUID NOT NULL,
  "gateway_event_id" VARCHAR(255) NOT NULL,
  "event_type" VARCHAR(100) NOT NULL,
  "payment_id" UUID,
  "payload" JSONB NOT NULL,
  "processed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_webhook_events_gateway_event_id_key"
  ON "payment_webhook_events"("gateway_event_id");

CREATE INDEX "payment_webhook_events_event_type_processed_at_idx"
  ON "payment_webhook_events"("event_type", "processed_at");

ALTER TABLE "payment_webhook_events"
  ADD CONSTRAINT "payment_webhook_events_payment_id_fkey"
  FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
