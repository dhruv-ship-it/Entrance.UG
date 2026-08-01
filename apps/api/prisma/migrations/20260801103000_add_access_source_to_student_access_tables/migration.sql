-- Support purchase-backed as well as manually granted student access.
CREATE TYPE "AccessSource" AS ENUM ('PURCHASE', 'ADMIN', 'TRIAL', 'PROMOTION');

ALTER TABLE "student_mock_access"
  DROP CONSTRAINT "student_mock_access_purchase_id_fkey",
  ALTER COLUMN "purchase_id" DROP NOT NULL,
  ADD COLUMN "access_source" "AccessSource" NOT NULL DEFAULT 'PURCHASE';

ALTER TABLE "student_content_access"
  DROP CONSTRAINT "student_content_access_purchase_id_fkey",
  ALTER COLUMN "purchase_id" DROP NOT NULL,
  ADD COLUMN "access_source" "AccessSource" NOT NULL DEFAULT 'PURCHASE';

ALTER TABLE "student_batch_access"
  DROP CONSTRAINT "student_batch_access_purchase_id_fkey",
  ALTER COLUMN "purchase_id" DROP NOT NULL,
  ADD COLUMN "access_source" "AccessSource" NOT NULL DEFAULT 'PURCHASE';
