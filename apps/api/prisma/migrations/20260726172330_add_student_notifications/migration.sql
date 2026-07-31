-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'MOCK', 'CONTENT', 'MENTORSHIP', 'RC', 'PURCHASE');

-- CreateTable
CREATE TABLE "student_notifications" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "action_url" VARCHAR(2048),
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_notifications_student_id_is_read_created_at_idx" ON "student_notifications"("student_id", "is_read", "created_at");

-- AddForeignKey
ALTER TABLE "student_notifications" ADD CONSTRAINT "student_notifications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
