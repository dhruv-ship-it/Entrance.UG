CREATE TYPE "VerificationAccountRole" AS ENUM ('STUDENT', 'PARENT', 'MENTOR', 'ADMIN');

ALTER TABLE "email_verifications"
ADD COLUMN "account_id" UUID,
ADD COLUMN "account_role" "VerificationAccountRole";

CREATE INDEX "email_verifications_account_role_account_id_purpose_expires_at_idx"
ON "email_verifications"("account_role", "account_id", "purpose", "expires_at");
