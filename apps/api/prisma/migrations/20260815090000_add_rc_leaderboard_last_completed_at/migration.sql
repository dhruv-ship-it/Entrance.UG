ALTER TABLE "rc_leaderboard"
ADD COLUMN "last_completed_at" TIMESTAMPTZ(3);

UPDATE "rc_leaderboard" leaderboard
SET "last_completed_at" = latest."submitted_at"
FROM (
  SELECT "student_id", MAX("submitted_at") AS "submitted_at"
  FROM "rc_attempts"
  WHERE "submitted_at" IS NOT NULL
  GROUP BY "student_id"
) latest
WHERE leaderboard."student_id" = latest."student_id";
