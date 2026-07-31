-- Domain invariants that Prisma's schema language cannot express directly.

ALTER TABLE "feedback"
  ADD CONSTRAINT "feedback_rating_range"
  CHECK ("rating" BETWEEN 1 AND 5);

ALTER TABLE "doubt_replies"
  ADD CONSTRAINT "doubt_replies_exactly_one_author"
  CHECK (num_nonnulls("mentor_id", "student_id") = 1);

ALTER TABLE "mentor_batch_assignments"
  ADD CONSTRAINT "mentor_batch_assignments_removal_after_assignment"
  CHECK ("removed_at" IS NULL OR "removed_at" >= "assigned_at");

ALTER TABLE "batch_tasks"
  ADD CONSTRAINT "batch_tasks_valid_schedule"
  CHECK ("end_datetime" > "start_datetime");

ALTER TABLE "live_sessions"
  ADD CONSTRAINT "live_sessions_valid_schedule"
  CHECK ("end_datetime" > "start_datetime");

ALTER TABLE "rc_tests"
  ADD CONSTRAINT "rc_tests_valid_schedule"
  CHECK ("end_datetime" > "start_datetime");

ALTER TABLE "dashboard_notices"
  ADD CONSTRAINT "dashboard_notices_valid_schedule"
  CHECK ("end_datetime" > "start_datetime");

ALTER TABLE "mentorship_batches"
  ADD CONSTRAINT "mentorship_batches_positive_capacity"
  CHECK ("maximum_students" > 0);

ALTER TABLE "plans"
  ADD CONSTRAINT "plans_valid_pricing_and_duration"
  CHECK ("original_price" >= 0 AND "selling_price" >= 0 AND "selling_price" <= "original_price" AND "duration_days" > 0);

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_non_negative_amount"
  CHECK ("amount" >= 0);

ALTER TABLE "purchases"
  ADD CONSTRAINT "purchases_non_negative_price"
  CHECK ("purchase_price" >= 0);

ALTER TABLE "mock_exams"
  ADD CONSTRAINT "mock_exams_valid_marks_and_duration"
  CHECK ("duration_minutes" > 0 AND "total_marks" >= 0 AND ("passing_marks" IS NULL OR ("passing_marks" >= 0 AND "passing_marks" <= "total_marks")));

ALTER TABLE "content_tests"
  ADD CONSTRAINT "content_tests_valid_marks_and_duration"
  CHECK ("duration_minutes" > 0 AND "total_marks" >= 0);

ALTER TABLE "batch_tests"
  ADD CONSTRAINT "batch_tests_valid_marks_and_duration"
  CHECK ("duration_minutes" > 0 AND "total_marks" >= 0);

ALTER TABLE "rc_tests"
  ADD CONSTRAINT "rc_tests_valid_marks_and_duration"
  CHECK (("duration_minutes" IS NULL OR "duration_minutes" > 0) AND "total_marks" >= 0);
