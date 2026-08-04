CREATE UNIQUE INDEX "content_attempts_student_id_content_test_id_key"
  ON "content_attempts"("student_id", "content_test_id");

CREATE UNIQUE INDEX "batch_attempts_student_id_batch_test_id_key"
  ON "batch_attempts"("student_id", "batch_test_id");

CREATE UNIQUE INDEX "rc_attempts_student_id_rc_test_id_key"
  ON "rc_attempts"("student_id", "rc_test_id");
