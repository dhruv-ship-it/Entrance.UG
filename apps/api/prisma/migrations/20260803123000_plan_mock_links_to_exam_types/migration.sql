DELETE FROM "plan_mock_exams";

ALTER TABLE "plan_mock_exams" DROP CONSTRAINT IF EXISTS "plan_mock_exams_mock_exam_id_fkey";
DROP INDEX IF EXISTS "plan_mock_exams_plan_id_mock_exam_id_key";

ALTER TABLE "plan_mock_exams" RENAME COLUMN "mock_exam_id" TO "exam_type_id";

CREATE UNIQUE INDEX "plan_mock_exams_plan_id_exam_type_id_key"
  ON "plan_mock_exams"("plan_id", "exam_type_id");

ALTER TABLE "plan_mock_exams"
  ADD CONSTRAINT "plan_mock_exams_exam_type_id_fkey"
  FOREIGN KEY ("exam_type_id") REFERENCES "exam_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
