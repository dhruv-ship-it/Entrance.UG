-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'SUB_ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "ParentRelationship" AS ENUM ('FATHER', 'MOTHER', 'GUARDIAN');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'MULTIPLE_CORRECT', 'INTEGER', 'TRUE_FALSE');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED');

-- CreateEnum
CREATE TYPE "AnswerStatus" AS ENUM ('CORRECT', 'INCORRECT', 'PARTIALLY_CORRECT', 'UNATTEMPTED');

-- CreateEnum
CREATE TYPE "EmailVerificationPurpose" AS ENUM ('REGISTER', 'FORGOT_PASSWORD', 'CHANGE_EMAIL');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DoubtVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "DoubtStatus" AS ENUM ('OPEN', 'ANSWERED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PaymentGateway" AS ENUM ('RAZORPAY', 'STRIPE', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NoticePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('YOUTUBE', 'PDF', 'DOCUMENT', 'WEBSITE');

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMPTZ(3),
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'SUB_ADMIN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(3),
    "can_manage_students" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_parents" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_mentors" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_mock_tests" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_content" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_rc_tests" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_mentorship" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_plans" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_analytics" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_feedback" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_dashboard_notices" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_website_settings" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_admins" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentors" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMPTZ(3),
    "phone_number" VARCHAR(20) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "qualification" VARCHAR(255) NOT NULL,
    "experience_years" INTEGER NOT NULL DEFAULT 0,
    "bio" TEXT,
    "profile_image" VARCHAR(2048),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(3),
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mentors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMPTZ(3),
    "phone_number" VARCHAR(20) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "gender" "Gender" NOT NULL,
    "profile_image" VARCHAR(2048),
    "school_name" VARCHAR(255),
    "class_name" VARCHAR(100),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(3),
    "last_seen_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parents" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMPTZ(3),
    "phone_number" VARCHAR(20) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "occupation" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parent_student" (
    "parent_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "relationship" "ParentRelationship" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_student_pkey" PRIMARY KEY ("parent_id","student_id")
);

-- CreateTable
CREATE TABLE "subjects" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subtopics" (
    "id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subtopics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "difficulty_levels" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "difficulty_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_types" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "exam_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_exam_types" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mock_exam_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_section_types" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mock_section_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_exams" (
    "id" UUID NOT NULL,
    "exam_type_id" UUID NOT NULL,
    "mock_exam_type_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "difficulty_id" UUID NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "total_marks" DECIMAL(10,2) NOT NULL,
    "passing_marks" DECIMAL(10,2),
    "can_go_back_between_sections" BOOLEAN NOT NULL DEFAULT false,
    "is_free" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mock_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_sections" (
    "id" UUID NOT NULL,
    "mock_exam_id" UUID NOT NULL,
    "mock_section_type_id" UUID NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "instructions" TEXT NOT NULL,
    "duration_minutes" INTEGER,
    "total_marks" DECIMAL(10,2) NOT NULL,
    "can_go_back_to_previous_question" BOOLEAN NOT NULL DEFAULT false,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mock_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_comprehensions" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255),
    "passage" TEXT NOT NULL,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mock_comprehensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_questions" (
    "id" UUID NOT NULL,
    "mock_section_id" UUID NOT NULL,
    "mock_comprehension_id" UUID,
    "topic_id" UUID NOT NULL,
    "subtopic_id" UUID NOT NULL,
    "difficulty_id" UUID NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "question_type" "QuestionType" NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB,
    "correct_answers" JSONB NOT NULL,
    "positive_marks" DECIMAL(10,2) NOT NULL,
    "negative_marks" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "explanation" TEXT NOT NULL,
    "image_url" VARCHAR(2048),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mock_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_attempts" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "mock_exam_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "submitted_at" TIMESTAMPTZ(3),
    "status" "AttemptStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "time_taken_seconds" INTEGER NOT NULL DEFAULT 0,
    "total_marks" DECIMAL(10,2) NOT NULL,
    "marks_scored" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "correct_answers" INTEGER NOT NULL DEFAULT 0,
    "incorrect_answers" INTEGER NOT NULL DEFAULT 0,
    "unattempted_answers" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "percentile" DECIMAL(5,2),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mock_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_attempt_sections" (
    "id" UUID NOT NULL,
    "mock_attempt_id" UUID NOT NULL,
    "mock_section_id" UUID NOT NULL,
    "time_taken_seconds" INTEGER NOT NULL DEFAULT 0,
    "marks_scored" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "correct_answers" INTEGER NOT NULL DEFAULT 0,
    "incorrect_answers" INTEGER NOT NULL DEFAULT 0,
    "unattempted_answers" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mock_attempt_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_attempt_answers" (
    "id" UUID NOT NULL,
    "mock_attempt_id" UUID NOT NULL,
    "mock_question_id" UUID NOT NULL,
    "mock_section_id" UUID NOT NULL,
    "selected_answers" JSONB NOT NULL,
    "correct_answers" JSONB NOT NULL,
    "status" "AnswerStatus" NOT NULL DEFAULT 'UNATTEMPTED',
    "marks_awarded" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "time_taken_seconds" INTEGER NOT NULL DEFAULT 0,
    "visited" BOOLEAN NOT NULL DEFAULT false,
    "bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "marked_for_review" BOOLEAN NOT NULL DEFAULT false,
    "answer_order" INTEGER NOT NULL,
    "answered_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mock_attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_attempt_analytics" (
    "id" UUID NOT NULL,
    "mock_exam_id" UUID NOT NULL,
    "total_attempts" INTEGER NOT NULL DEFAULT 0,
    "average_score" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "average_accuracy" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "average_time_taken" INTEGER NOT NULL DEFAULT 0,
    "average_rank" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "average_percentile" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "total_correct_answers" INTEGER NOT NULL DEFAULT 0,
    "total_incorrect_answers" INTEGER NOT NULL DEFAULT 0,
    "total_unattempted_answers" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mock_attempt_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mock_section_analytics" (
    "id" UUID NOT NULL,
    "mock_section_id" UUID NOT NULL,
    "total_attempts" INTEGER NOT NULL DEFAULT 0,
    "average_score" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "average_accuracy" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "average_time_taken" INTEGER NOT NULL DEFAULT 0,
    "total_correct_answers" INTEGER NOT NULL DEFAULT 0,
    "total_incorrect_answers" INTEGER NOT NULL DEFAULT 0,
    "total_unattempted_answers" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mock_section_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_mock_access" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "exam_type_id" UUID NOT NULL,
    "purchase_id" UUID NOT NULL,
    "expiry_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "student_mock_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contents" (
    "id" UUID NOT NULL,
    "subtopic_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "content_type" "ContentType" NOT NULL,
    "content_url" VARCHAR(2048) NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "is_free" BOOLEAN NOT NULL DEFAULT false,
    "estimated_duration_minutes" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_content_access" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "purchase_id" UUID NOT NULL,
    "expiry_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "student_content_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_tests" (
    "id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "difficulty_id" UUID NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "total_marks" DECIMAL(10,2) NOT NULL,
    "can_go_back_between_sections" BOOLEAN NOT NULL DEFAULT false,
    "is_free" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "content_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_sections" (
    "id" UUID NOT NULL,
    "content_test_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "instructions" TEXT NOT NULL,
    "duration_minutes" INTEGER,
    "total_marks" DECIMAL(10,2) NOT NULL,
    "can_go_back_to_previous_question" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "content_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_comprehensions" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255),
    "passage" TEXT NOT NULL,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "content_comprehensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_questions" (
    "id" UUID NOT NULL,
    "content_section_id" UUID NOT NULL,
    "content_comprehension_id" UUID,
    "topic_id" UUID NOT NULL,
    "subtopic_id" UUID NOT NULL,
    "difficulty_id" UUID NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "question_type" "QuestionType" NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB,
    "correct_answers" JSONB NOT NULL,
    "positive_marks" DECIMAL(10,2) NOT NULL,
    "negative_marks" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "explanation" TEXT NOT NULL,
    "image_url" VARCHAR(2048),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "content_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_content_completion" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "content_id" UUID NOT NULL,
    "completed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_content_completion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_notes" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "content_id" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "content_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_attempts" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "content_test_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "submitted_at" TIMESTAMPTZ(3),
    "status" "AttemptStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "time_taken_seconds" INTEGER NOT NULL DEFAULT 0,
    "total_marks" DECIMAL(10,2) NOT NULL,
    "marks_scored" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "correct_answers" INTEGER NOT NULL DEFAULT 0,
    "incorrect_answers" INTEGER NOT NULL DEFAULT 0,
    "unattempted_answers" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "content_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_attempt_sections" (
    "id" UUID NOT NULL,
    "content_attempt_id" UUID NOT NULL,
    "content_section_id" UUID NOT NULL,
    "time_taken_seconds" INTEGER NOT NULL DEFAULT 0,
    "marks_scored" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "correct_answers" INTEGER NOT NULL DEFAULT 0,
    "incorrect_answers" INTEGER NOT NULL DEFAULT 0,
    "unattempted_answers" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "content_attempt_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_attempt_answers" (
    "id" UUID NOT NULL,
    "content_attempt_id" UUID NOT NULL,
    "content_question_id" UUID NOT NULL,
    "content_section_id" UUID NOT NULL,
    "selected_answers" JSONB NOT NULL,
    "correct_answers" JSONB NOT NULL,
    "status" "AnswerStatus" NOT NULL DEFAULT 'UNATTEMPTED',
    "marks_awarded" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "time_taken_seconds" INTEGER NOT NULL DEFAULT 0,
    "visited" BOOLEAN NOT NULL DEFAULT false,
    "bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "marked_for_review" BOOLEAN NOT NULL DEFAULT false,
    "answered_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "content_attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentorship_programs" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mentorship_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentorship_batches" (
    "id" UUID NOT NULL,
    "mentorship_program_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "maximum_students" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mentorship_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_batch_assignments" (
    "id" UUID NOT NULL,
    "mentor_id" UUID NOT NULL,
    "mentorship_batch_id" UUID NOT NULL,
    "assigned_by" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removed_at" TIMESTAMPTZ(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "mentor_batch_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_batch_access" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "mentorship_batch_id" UUID NOT NULL,
    "purchase_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "student_batch_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_tasks" (
    "id" UUID NOT NULL,
    "mentorship_batch_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "attachment_url" VARCHAR(2048),
    "start_datetime" TIMESTAMPTZ(3) NOT NULL,
    "end_datetime" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "batch_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "completed_tasks" (
    "id" UUID NOT NULL,
    "batch_task_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "completed_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_notices" (
    "id" UUID NOT NULL,
    "mentorship_batch_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "attachment_url" VARCHAR(2048),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "batch_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doubts" (
    "id" UUID NOT NULL,
    "mentorship_batch_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "visibility" "DoubtVisibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "DoubtStatus" NOT NULL DEFAULT 'OPEN',
    "is_satisfied" BOOLEAN NOT NULL DEFAULT false,
    "last_reply_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "doubts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doubt_replies" (
    "id" UUID NOT NULL,
    "doubt_id" UUID NOT NULL,
    "parent_reply_id" UUID,
    "mentor_id" UUID,
    "student_id" UUID,
    "reply_text" TEXT NOT NULL,
    "attachment_url" VARCHAR(2048),
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "doubt_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "live_sessions" (
    "id" UUID NOT NULL,
    "mentorship_batch_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "meeting_link" VARCHAR(2048) NOT NULL,
    "start_datetime" TIMESTAMPTZ(3) NOT NULL,
    "end_datetime" TIMESTAMPTZ(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "live_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" UUID NOT NULL,
    "live_session_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_tests" (
    "id" UUID NOT NULL,
    "mentorship_batch_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "difficulty_id" UUID NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "total_marks" DECIMAL(10,2) NOT NULL,
    "can_go_back_between_sections" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "batch_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_sections" (
    "id" UUID NOT NULL,
    "batch_test_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "instructions" TEXT NOT NULL,
    "duration_minutes" INTEGER,
    "total_marks" DECIMAL(10,2) NOT NULL,
    "can_go_back_to_previous_question" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "batch_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_comprehensions" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255),
    "passage" TEXT NOT NULL,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "batch_comprehensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_questions" (
    "id" UUID NOT NULL,
    "batch_section_id" UUID NOT NULL,
    "batch_comprehension_id" UUID,
    "topic_id" UUID NOT NULL,
    "subtopic_id" UUID NOT NULL,
    "difficulty_id" UUID NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "question_type" "QuestionType" NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB,
    "correct_answers" JSONB NOT NULL,
    "positive_marks" DECIMAL(10,2) NOT NULL,
    "negative_marks" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "explanation" TEXT NOT NULL,
    "image_url" VARCHAR(2048),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "batch_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_attempts" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "batch_test_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "submitted_at" TIMESTAMPTZ(3),
    "status" "AttemptStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "time_taken_seconds" INTEGER NOT NULL DEFAULT 0,
    "total_marks" DECIMAL(10,2) NOT NULL,
    "marks_scored" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "correct_answers" INTEGER NOT NULL DEFAULT 0,
    "incorrect_answers" INTEGER NOT NULL DEFAULT 0,
    "unattempted_answers" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "batch_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_attempt_sections" (
    "id" UUID NOT NULL,
    "batch_attempt_id" UUID NOT NULL,
    "batch_section_id" UUID NOT NULL,
    "time_taken_seconds" INTEGER NOT NULL DEFAULT 0,
    "marks_scored" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "correct_answers" INTEGER NOT NULL DEFAULT 0,
    "incorrect_answers" INTEGER NOT NULL DEFAULT 0,
    "unattempted_answers" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "batch_attempt_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_attempt_answers" (
    "id" UUID NOT NULL,
    "batch_attempt_id" UUID NOT NULL,
    "batch_question_id" UUID NOT NULL,
    "batch_section_id" UUID NOT NULL,
    "selected_answers" JSONB NOT NULL,
    "correct_answers" JSONB NOT NULL,
    "status" "AnswerStatus" NOT NULL DEFAULT 'UNATTEMPTED',
    "marks_awarded" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "time_taken_seconds" INTEGER NOT NULL DEFAULT 0,
    "visited" BOOLEAN NOT NULL DEFAULT false,
    "bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "marked_for_review" BOOLEAN NOT NULL DEFAULT false,
    "answered_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "batch_attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_test_analytics" (
    "id" UUID NOT NULL,
    "batch_test_id" UUID NOT NULL,
    "total_attempts" INTEGER NOT NULL DEFAULT 0,
    "unique_students_attempted" INTEGER NOT NULL DEFAULT 0,
    "average_score" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "highest_score" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lowest_score" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "average_accuracy" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "average_time_taken_seconds" INTEGER NOT NULL DEFAULT 0,
    "average_percentile" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "batch_test_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_section_analytics" (
    "id" UUID NOT NULL,
    "batch_section_id" UUID NOT NULL,
    "total_attempts" INTEGER NOT NULL DEFAULT 0,
    "average_score" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "highest_score" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lowest_score" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "average_accuracy" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "average_time_taken_seconds" INTEGER NOT NULL DEFAULT 0,
    "total_correct_answers" INTEGER NOT NULL DEFAULT 0,
    "total_incorrect_answers" INTEGER NOT NULL DEFAULT 0,
    "total_unattempted_answers" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "batch_section_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_question_analytics" (
    "id" UUID NOT NULL,
    "batch_question_id" UUID NOT NULL,
    "total_attempts" INTEGER NOT NULL DEFAULT 0,
    "correct_count" INTEGER NOT NULL DEFAULT 0,
    "incorrect_count" INTEGER NOT NULL DEFAULT 0,
    "unattempted_count" INTEGER NOT NULL DEFAULT 0,
    "average_time_taken_seconds" INTEGER NOT NULL DEFAULT 0,
    "correct_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "batch_question_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_topic_analytics" (
    "id" UUID NOT NULL,
    "batch_test_id" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "total_questions" INTEGER NOT NULL DEFAULT 0,
    "total_attempts" INTEGER NOT NULL DEFAULT 0,
    "correct_answers" INTEGER NOT NULL DEFAULT 0,
    "incorrect_answers" INTEGER NOT NULL DEFAULT 0,
    "unattempted_answers" INTEGER NOT NULL DEFAULT 0,
    "average_accuracy" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "average_score" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "batch_topic_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_subtopic_analytics" (
    "id" UUID NOT NULL,
    "batch_test_id" UUID NOT NULL,
    "subtopic_id" UUID NOT NULL,
    "total_questions" INTEGER NOT NULL DEFAULT 0,
    "total_attempts" INTEGER NOT NULL DEFAULT 0,
    "correct_answers" INTEGER NOT NULL DEFAULT 0,
    "incorrect_answers" INTEGER NOT NULL DEFAULT 0,
    "unattempted_answers" INTEGER NOT NULL DEFAULT 0,
    "average_accuracy" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "average_score" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "batch_subtopic_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rc_tests" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "passage" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "start_datetime" TIMESTAMPTZ(3) NOT NULL,
    "end_datetime" TIMESTAMPTZ(3) NOT NULL,
    "duration_minutes" INTEGER,
    "difficulty_id" UUID NOT NULL,
    "total_marks" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rc_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rc_questions" (
    "id" UUID NOT NULL,
    "rc_test_id" UUID NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "question_type" "QuestionType" NOT NULL,
    "options" JSONB,
    "correct_answers" JSONB NOT NULL,
    "positive_marks" DECIMAL(10,2) NOT NULL,
    "negative_marks" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "explanation" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rc_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rc_attempts" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "rc_test_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "submitted_at" TIMESTAMPTZ(3),
    "time_taken_seconds" INTEGER NOT NULL DEFAULT 0,
    "total_marks" DECIMAL(10,2) NOT NULL,
    "marks_scored" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "correct_answers" INTEGER NOT NULL DEFAULT 0,
    "incorrect_answers" INTEGER NOT NULL DEFAULT 0,
    "unattempted_answers" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rc_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rc_attempt_answers" (
    "id" UUID NOT NULL,
    "rc_attempt_id" UUID NOT NULL,
    "rc_question_id" UUID NOT NULL,
    "selected_answers" JSONB NOT NULL,
    "correct_answers" JSONB NOT NULL,
    "status" "AnswerStatus" NOT NULL DEFAULT 'UNATTEMPTED',
    "marks_awarded" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "time_taken_seconds" INTEGER NOT NULL DEFAULT 0,
    "visited" BOOLEAN NOT NULL DEFAULT false,
    "answered_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rc_attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rc_test_analytics" (
    "id" UUID NOT NULL,
    "rc_test_id" UUID NOT NULL,
    "total_attempts" INTEGER NOT NULL DEFAULT 0,
    "unique_students_attempted" INTEGER NOT NULL DEFAULT 0,
    "average_score" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "highest_score" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lowest_score" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "average_accuracy" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "average_time_taken_seconds" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rc_test_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rc_leaderboard" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "highest_streak" INTEGER NOT NULL DEFAULT 0,
    "total_rc_attempted" INTEGER NOT NULL DEFAULT 0,
    "average_score" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "last_completed_date" DATE,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rc_leaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "original_price" DECIMAL(12,2) NOT NULL,
    "selling_price" DECIMAL(12,2) NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "is_content_included" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_mock_exams" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "mock_exam_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "plan_mock_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_mentorship_programs" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "mentorship_program_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "plan_mentorship_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "gateway" "PaymentGateway" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "gateway_order_id" VARCHAR(255),
    "gateway_payment_id" VARCHAR(255),
    "gateway_signature" VARCHAR(1024),
    "gateway_transaction_id" VARCHAR(255),
    "failure_reason" TEXT,
    "paid_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "purchase_price" DECIMAL(12,2) NOT NULL,
    "purchase_date" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" DATE NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "otp_hash" VARCHAR(255) NOT NULL,
    "purpose" "EmailVerificationPurpose" NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "verified_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_notices" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "NoticePriority" NOT NULL DEFAULT 'MEDIUM',
    "start_datetime" TIMESTAMPTZ(3) NOT NULL,
    "end_datetime" TIMESTAMPTZ(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "updated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "dashboard_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "comment" TEXT NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "admin_reply" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "website_settings" (
    "id" UUID NOT NULL,
    "website_name" VARCHAR(255) NOT NULL,
    "support_email" VARCHAR(320) NOT NULL,
    "support_phone_primary" VARCHAR(20) NOT NULL,
    "support_phone_secondary" VARCHAR(20),
    "whatsapp_number" VARCHAR(20),
    "youtube_link" VARCHAR(2048),
    "instagram_link" VARCHAR(2048),
    "facebook_link" VARCHAR(2048),
    "twitter_link" VARCHAR(2048),
    "linkedin_link" VARCHAR(2048),
    "telegram_link" VARCHAR(2048),
    "website_url" VARCHAR(2048),
    "address" TEXT,
    "google_maps_link" VARCHAR(2048),
    "privacy_policy_link" VARCHAR(2048),
    "terms_conditions_link" VARCHAR(2048),
    "refund_policy_link" VARCHAR(2048),
    "logo_url" VARCHAR(2048),
    "favicon_url" VARCHAR(2048),
    "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
    "maintenance_message" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "website_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "mentors_email_key" ON "mentors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "mentors_phone_number_key" ON "mentors"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "students_email_key" ON "students"("email");

-- CreateIndex
CREATE UNIQUE INDEX "students_phone_number_key" ON "students"("phone_number");

-- CreateIndex
CREATE INDEX "students_is_active_idx" ON "students"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "parents_email_key" ON "parents"("email");

-- CreateIndex
CREATE UNIQUE INDEX "parents_phone_number_key" ON "parents"("phone_number");

-- CreateIndex
CREATE INDEX "parents_is_active_idx" ON "parents"("is_active");

-- CreateIndex
CREATE INDEX "parent_student_student_id_idx" ON "parent_student"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_name_key" ON "subjects"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_display_order_key" ON "subjects"("display_order");

-- CreateIndex
CREATE UNIQUE INDEX "topics_subject_id_name_key" ON "topics"("subject_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "topics_subject_id_display_order_key" ON "topics"("subject_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "subtopics_topic_id_name_key" ON "subtopics"("topic_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "subtopics_topic_id_display_order_key" ON "subtopics"("topic_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "difficulty_levels_name_key" ON "difficulty_levels"("name");

-- CreateIndex
CREATE UNIQUE INDEX "difficulty_levels_display_order_key" ON "difficulty_levels"("display_order");

-- CreateIndex
CREATE UNIQUE INDEX "exam_types_name_key" ON "exam_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "mock_exam_types_name_key" ON "mock_exam_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "mock_section_types_name_key" ON "mock_section_types"("name");

-- CreateIndex
CREATE INDEX "mock_exams_exam_type_id_is_active_idx" ON "mock_exams"("exam_type_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "mock_sections_mock_exam_id_sequence_number_key" ON "mock_sections"("mock_exam_id", "sequence_number");

-- CreateIndex
CREATE INDEX "mock_questions_topic_id_subtopic_id_idx" ON "mock_questions"("topic_id", "subtopic_id");

-- CreateIndex
CREATE UNIQUE INDEX "mock_questions_mock_section_id_sequence_number_key" ON "mock_questions"("mock_section_id", "sequence_number");

-- CreateIndex
CREATE INDEX "mock_attempts_student_id_mock_exam_id_status_idx" ON "mock_attempts"("student_id", "mock_exam_id", "status");

-- CreateIndex
CREATE INDEX "mock_attempts_mock_exam_id_submitted_at_idx" ON "mock_attempts"("mock_exam_id", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "mock_attempt_sections_mock_attempt_id_mock_section_id_key" ON "mock_attempt_sections"("mock_attempt_id", "mock_section_id");

-- CreateIndex
CREATE INDEX "mock_attempt_answers_mock_attempt_id_mock_section_id_idx" ON "mock_attempt_answers"("mock_attempt_id", "mock_section_id");

-- CreateIndex
CREATE UNIQUE INDEX "mock_attempt_answers_mock_attempt_id_mock_question_id_key" ON "mock_attempt_answers"("mock_attempt_id", "mock_question_id");

-- CreateIndex
CREATE UNIQUE INDEX "mock_attempt_answers_mock_attempt_id_answer_order_key" ON "mock_attempt_answers"("mock_attempt_id", "answer_order");

-- CreateIndex
CREATE UNIQUE INDEX "mock_attempt_analytics_mock_exam_id_key" ON "mock_attempt_analytics"("mock_exam_id");

-- CreateIndex
CREATE UNIQUE INDEX "mock_section_analytics_mock_section_id_key" ON "mock_section_analytics"("mock_section_id");

-- CreateIndex
CREATE INDEX "student_mock_access_student_id_expiry_date_idx" ON "student_mock_access"("student_id", "expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "student_mock_access_student_id_exam_type_id_purchase_id_key" ON "student_mock_access"("student_id", "exam_type_id", "purchase_id");

-- CreateIndex
CREATE UNIQUE INDEX "contents_subtopic_id_sequence_number_key" ON "contents"("subtopic_id", "sequence_number");

-- CreateIndex
CREATE INDEX "student_content_access_student_id_expiry_date_idx" ON "student_content_access"("student_id", "expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "student_content_access_student_id_purchase_id_key" ON "student_content_access"("student_id", "purchase_id");

-- CreateIndex
CREATE INDEX "content_tests_topic_id_is_active_idx" ON "content_tests"("topic_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "content_sections_content_test_id_sequence_number_key" ON "content_sections"("content_test_id", "sequence_number");

-- CreateIndex
CREATE INDEX "content_questions_topic_id_subtopic_id_idx" ON "content_questions"("topic_id", "subtopic_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_questions_content_section_id_sequence_number_key" ON "content_questions"("content_section_id", "sequence_number");

-- CreateIndex
CREATE UNIQUE INDEX "student_content_completion_student_id_content_id_key" ON "student_content_completion"("student_id", "content_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_notes_student_id_content_id_key" ON "content_notes"("student_id", "content_id");

-- CreateIndex
CREATE INDEX "content_attempts_student_id_content_test_id_status_idx" ON "content_attempts"("student_id", "content_test_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "content_attempt_sections_content_attempt_id_content_section_key" ON "content_attempt_sections"("content_attempt_id", "content_section_id");

-- CreateIndex
CREATE INDEX "content_attempt_answers_content_attempt_id_content_section__idx" ON "content_attempt_answers"("content_attempt_id", "content_section_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_attempt_answers_content_attempt_id_content_question_key" ON "content_attempt_answers"("content_attempt_id", "content_question_id");

-- CreateIndex
CREATE UNIQUE INDEX "mentorship_programs_name_key" ON "mentorship_programs"("name");

-- CreateIndex
CREATE INDEX "mentorship_batches_is_active_idx" ON "mentorship_batches"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "mentorship_batches_mentorship_program_id_name_key" ON "mentorship_batches"("mentorship_program_id", "name");

-- CreateIndex
CREATE INDEX "mentor_batch_assignments_mentorship_batch_id_is_active_idx" ON "mentor_batch_assignments"("mentorship_batch_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "mentor_batch_assignments_mentor_id_mentorship_batch_id_key" ON "mentor_batch_assignments"("mentor_id", "mentorship_batch_id");

-- CreateIndex
CREATE INDEX "student_batch_access_student_id_is_active_expiry_date_idx" ON "student_batch_access"("student_id", "is_active", "expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "student_batch_access_student_id_mentorship_batch_id_purchas_key" ON "student_batch_access"("student_id", "mentorship_batch_id", "purchase_id");

-- CreateIndex
CREATE INDEX "batch_tasks_mentorship_batch_id_start_datetime_idx" ON "batch_tasks"("mentorship_batch_id", "start_datetime");

-- CreateIndex
CREATE INDEX "completed_tasks_student_id_status_idx" ON "completed_tasks"("student_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "completed_tasks_batch_task_id_student_id_key" ON "completed_tasks"("batch_task_id", "student_id");

-- CreateIndex
CREATE INDEX "batch_notices_mentorship_batch_id_created_at_idx" ON "batch_notices"("mentorship_batch_id", "created_at");

-- CreateIndex
CREATE INDEX "doubts_mentorship_batch_id_visibility_status_idx" ON "doubts"("mentorship_batch_id", "visibility", "status");

-- CreateIndex
CREATE INDEX "doubts_student_id_status_idx" ON "doubts"("student_id", "status");

-- CreateIndex
CREATE INDEX "doubt_replies_doubt_id_parent_reply_id_created_at_idx" ON "doubt_replies"("doubt_id", "parent_reply_id", "created_at");

-- CreateIndex
CREATE INDEX "live_sessions_mentorship_batch_id_start_datetime_idx" ON "live_sessions"("mentorship_batch_id", "start_datetime");

-- CreateIndex
CREATE INDEX "attendance_student_id_joined_at_idx" ON "attendance"("student_id", "joined_at");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_live_session_id_student_id_key" ON "attendance"("live_session_id", "student_id");

-- CreateIndex
CREATE INDEX "batch_tests_mentorship_batch_id_is_active_idx" ON "batch_tests"("mentorship_batch_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "batch_sections_batch_test_id_sequence_number_key" ON "batch_sections"("batch_test_id", "sequence_number");

-- CreateIndex
CREATE INDEX "batch_questions_topic_id_subtopic_id_idx" ON "batch_questions"("topic_id", "subtopic_id");

-- CreateIndex
CREATE UNIQUE INDEX "batch_questions_batch_section_id_sequence_number_key" ON "batch_questions"("batch_section_id", "sequence_number");

-- CreateIndex
CREATE INDEX "batch_attempts_student_id_batch_test_id_status_idx" ON "batch_attempts"("student_id", "batch_test_id", "status");

-- CreateIndex
CREATE INDEX "batch_attempts_batch_test_id_submitted_at_idx" ON "batch_attempts"("batch_test_id", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "batch_attempt_sections_batch_attempt_id_batch_section_id_key" ON "batch_attempt_sections"("batch_attempt_id", "batch_section_id");

-- CreateIndex
CREATE INDEX "batch_attempt_answers_batch_attempt_id_batch_section_id_idx" ON "batch_attempt_answers"("batch_attempt_id", "batch_section_id");

-- CreateIndex
CREATE UNIQUE INDEX "batch_attempt_answers_batch_attempt_id_batch_question_id_key" ON "batch_attempt_answers"("batch_attempt_id", "batch_question_id");

-- CreateIndex
CREATE UNIQUE INDEX "batch_test_analytics_batch_test_id_key" ON "batch_test_analytics"("batch_test_id");

-- CreateIndex
CREATE UNIQUE INDEX "batch_section_analytics_batch_section_id_key" ON "batch_section_analytics"("batch_section_id");

-- CreateIndex
CREATE UNIQUE INDEX "batch_question_analytics_batch_question_id_key" ON "batch_question_analytics"("batch_question_id");

-- CreateIndex
CREATE UNIQUE INDEX "batch_topic_analytics_batch_test_id_topic_id_key" ON "batch_topic_analytics"("batch_test_id", "topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "batch_subtopic_analytics_batch_test_id_subtopic_id_key" ON "batch_subtopic_analytics"("batch_test_id", "subtopic_id");

-- CreateIndex
CREATE INDEX "rc_tests_is_active_start_datetime_end_datetime_idx" ON "rc_tests"("is_active", "start_datetime", "end_datetime");

-- CreateIndex
CREATE UNIQUE INDEX "rc_questions_rc_test_id_sequence_number_key" ON "rc_questions"("rc_test_id", "sequence_number");

-- CreateIndex
CREATE INDEX "rc_attempts_student_id_rc_test_id_idx" ON "rc_attempts"("student_id", "rc_test_id");

-- CreateIndex
CREATE INDEX "rc_attempts_rc_test_id_submitted_at_idx" ON "rc_attempts"("rc_test_id", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "rc_attempt_answers_rc_attempt_id_rc_question_id_key" ON "rc_attempt_answers"("rc_attempt_id", "rc_question_id");

-- CreateIndex
CREATE UNIQUE INDEX "rc_test_analytics_rc_test_id_key" ON "rc_test_analytics"("rc_test_id");

-- CreateIndex
CREATE UNIQUE INDEX "rc_leaderboard_student_id_key" ON "rc_leaderboard"("student_id");

-- CreateIndex
CREATE INDEX "rc_leaderboard_current_streak_average_score_idx" ON "rc_leaderboard"("current_streak" DESC, "average_score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "plans_display_order_key" ON "plans"("display_order");

-- CreateIndex
CREATE INDEX "plans_is_active_idx" ON "plans"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "plan_mock_exams_plan_id_mock_exam_id_key" ON "plan_mock_exams"("plan_id", "mock_exam_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_mentorship_programs_plan_id_mentorship_program_id_key" ON "plan_mentorship_programs"("plan_id", "mentorship_program_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_gateway_order_id_key" ON "payments"("gateway_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_gateway_payment_id_key" ON "payments"("gateway_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_gateway_transaction_id_key" ON "payments"("gateway_transaction_id");

-- CreateIndex
CREATE INDEX "payments_student_id_status_created_at_idx" ON "payments"("student_id", "status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_payment_id_key" ON "purchases"("payment_id");

-- CreateIndex
CREATE INDEX "purchases_student_id_status_expiry_date_idx" ON "purchases"("student_id", "status", "expiry_date");

-- CreateIndex
CREATE INDEX "email_verifications_email_purpose_expires_at_idx" ON "email_verifications"("email", "purpose", "expires_at");

-- CreateIndex
CREATE INDEX "dashboard_notices_is_active_start_datetime_end_datetime_idx" ON "dashboard_notices"("is_active", "start_datetime", "end_datetime");

-- CreateIndex
CREATE INDEX "feedback_is_resolved_created_at_idx" ON "feedback"("is_resolved", "created_at");

-- CreateIndex
CREATE INDEX "feedback_student_id_created_at_idx" ON "feedback"("student_id", "created_at");

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentors" ADD CONSTRAINT "mentors_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentors" ADD CONSTRAINT "mentors_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_student" ADD CONSTRAINT "parent_student_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_student" ADD CONSTRAINT "parent_student_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtopics" ADD CONSTRAINT "subtopics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtopics" ADD CONSTRAINT "subtopics_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtopics" ADD CONSTRAINT "subtopics_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "difficulty_levels" ADD CONSTRAINT "difficulty_levels_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "difficulty_levels" ADD CONSTRAINT "difficulty_levels_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_types" ADD CONSTRAINT "exam_types_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_types" ADD CONSTRAINT "exam_types_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exam_types" ADD CONSTRAINT "mock_exam_types_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exam_types" ADD CONSTRAINT "mock_exam_types_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_section_types" ADD CONSTRAINT "mock_section_types_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_section_types" ADD CONSTRAINT "mock_section_types_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exams" ADD CONSTRAINT "mock_exams_exam_type_id_fkey" FOREIGN KEY ("exam_type_id") REFERENCES "exam_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exams" ADD CONSTRAINT "mock_exams_mock_exam_type_id_fkey" FOREIGN KEY ("mock_exam_type_id") REFERENCES "mock_exam_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exams" ADD CONSTRAINT "mock_exams_difficulty_id_fkey" FOREIGN KEY ("difficulty_id") REFERENCES "difficulty_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exams" ADD CONSTRAINT "mock_exams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_exams" ADD CONSTRAINT "mock_exams_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_sections" ADD CONSTRAINT "mock_sections_mock_exam_id_fkey" FOREIGN KEY ("mock_exam_id") REFERENCES "mock_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_sections" ADD CONSTRAINT "mock_sections_mock_section_type_id_fkey" FOREIGN KEY ("mock_section_type_id") REFERENCES "mock_section_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_sections" ADD CONSTRAINT "mock_sections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_sections" ADD CONSTRAINT "mock_sections_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_comprehensions" ADD CONSTRAINT "mock_comprehensions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_comprehensions" ADD CONSTRAINT "mock_comprehensions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_questions" ADD CONSTRAINT "mock_questions_mock_section_id_fkey" FOREIGN KEY ("mock_section_id") REFERENCES "mock_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_questions" ADD CONSTRAINT "mock_questions_mock_comprehension_id_fkey" FOREIGN KEY ("mock_comprehension_id") REFERENCES "mock_comprehensions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_questions" ADD CONSTRAINT "mock_questions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_questions" ADD CONSTRAINT "mock_questions_subtopic_id_fkey" FOREIGN KEY ("subtopic_id") REFERENCES "subtopics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_questions" ADD CONSTRAINT "mock_questions_difficulty_id_fkey" FOREIGN KEY ("difficulty_id") REFERENCES "difficulty_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_questions" ADD CONSTRAINT "mock_questions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_questions" ADD CONSTRAINT "mock_questions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_attempts" ADD CONSTRAINT "mock_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_attempts" ADD CONSTRAINT "mock_attempts_mock_exam_id_fkey" FOREIGN KEY ("mock_exam_id") REFERENCES "mock_exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_attempt_sections" ADD CONSTRAINT "mock_attempt_sections_mock_attempt_id_fkey" FOREIGN KEY ("mock_attempt_id") REFERENCES "mock_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_attempt_sections" ADD CONSTRAINT "mock_attempt_sections_mock_section_id_fkey" FOREIGN KEY ("mock_section_id") REFERENCES "mock_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_attempt_answers" ADD CONSTRAINT "mock_attempt_answers_mock_attempt_id_fkey" FOREIGN KEY ("mock_attempt_id") REFERENCES "mock_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_attempt_answers" ADD CONSTRAINT "mock_attempt_answers_mock_question_id_fkey" FOREIGN KEY ("mock_question_id") REFERENCES "mock_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_attempt_answers" ADD CONSTRAINT "mock_attempt_answers_mock_section_id_fkey" FOREIGN KEY ("mock_section_id") REFERENCES "mock_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_attempt_analytics" ADD CONSTRAINT "mock_attempt_analytics_mock_exam_id_fkey" FOREIGN KEY ("mock_exam_id") REFERENCES "mock_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mock_section_analytics" ADD CONSTRAINT "mock_section_analytics_mock_section_id_fkey" FOREIGN KEY ("mock_section_id") REFERENCES "mock_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_mock_access" ADD CONSTRAINT "student_mock_access_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_mock_access" ADD CONSTRAINT "student_mock_access_exam_type_id_fkey" FOREIGN KEY ("exam_type_id") REFERENCES "exam_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_mock_access" ADD CONSTRAINT "student_mock_access_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_subtopic_id_fkey" FOREIGN KEY ("subtopic_id") REFERENCES "subtopics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_content_access" ADD CONSTRAINT "student_content_access_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_content_access" ADD CONSTRAINT "student_content_access_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_tests" ADD CONSTRAINT "content_tests_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_tests" ADD CONSTRAINT "content_tests_difficulty_id_fkey" FOREIGN KEY ("difficulty_id") REFERENCES "difficulty_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_tests" ADD CONSTRAINT "content_tests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_tests" ADD CONSTRAINT "content_tests_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_sections" ADD CONSTRAINT "content_sections_content_test_id_fkey" FOREIGN KEY ("content_test_id") REFERENCES "content_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_sections" ADD CONSTRAINT "content_sections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_sections" ADD CONSTRAINT "content_sections_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_comprehensions" ADD CONSTRAINT "content_comprehensions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_comprehensions" ADD CONSTRAINT "content_comprehensions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_questions" ADD CONSTRAINT "content_questions_content_section_id_fkey" FOREIGN KEY ("content_section_id") REFERENCES "content_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_questions" ADD CONSTRAINT "content_questions_content_comprehension_id_fkey" FOREIGN KEY ("content_comprehension_id") REFERENCES "content_comprehensions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_questions" ADD CONSTRAINT "content_questions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_questions" ADD CONSTRAINT "content_questions_subtopic_id_fkey" FOREIGN KEY ("subtopic_id") REFERENCES "subtopics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_questions" ADD CONSTRAINT "content_questions_difficulty_id_fkey" FOREIGN KEY ("difficulty_id") REFERENCES "difficulty_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_questions" ADD CONSTRAINT "content_questions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_questions" ADD CONSTRAINT "content_questions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_content_completion" ADD CONSTRAINT "student_content_completion_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_content_completion" ADD CONSTRAINT "student_content_completion_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_notes" ADD CONSTRAINT "content_notes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_notes" ADD CONSTRAINT "content_notes_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_attempts" ADD CONSTRAINT "content_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_attempts" ADD CONSTRAINT "content_attempts_content_test_id_fkey" FOREIGN KEY ("content_test_id") REFERENCES "content_tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_attempt_sections" ADD CONSTRAINT "content_attempt_sections_content_attempt_id_fkey" FOREIGN KEY ("content_attempt_id") REFERENCES "content_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_attempt_sections" ADD CONSTRAINT "content_attempt_sections_content_section_id_fkey" FOREIGN KEY ("content_section_id") REFERENCES "content_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_attempt_answers" ADD CONSTRAINT "content_attempt_answers_content_attempt_id_fkey" FOREIGN KEY ("content_attempt_id") REFERENCES "content_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_attempt_answers" ADD CONSTRAINT "content_attempt_answers_content_question_id_fkey" FOREIGN KEY ("content_question_id") REFERENCES "content_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_attempt_answers" ADD CONSTRAINT "content_attempt_answers_content_section_id_fkey" FOREIGN KEY ("content_section_id") REFERENCES "content_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship_programs" ADD CONSTRAINT "mentorship_programs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship_programs" ADD CONSTRAINT "mentorship_programs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship_batches" ADD CONSTRAINT "mentorship_batches_mentorship_program_id_fkey" FOREIGN KEY ("mentorship_program_id") REFERENCES "mentorship_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship_batches" ADD CONSTRAINT "mentorship_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship_batches" ADD CONSTRAINT "mentorship_batches_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_batch_assignments" ADD CONSTRAINT "mentor_batch_assignments_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_batch_assignments" ADD CONSTRAINT "mentor_batch_assignments_mentorship_batch_id_fkey" FOREIGN KEY ("mentorship_batch_id") REFERENCES "mentorship_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_batch_assignments" ADD CONSTRAINT "mentor_batch_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_batch_access" ADD CONSTRAINT "student_batch_access_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_batch_access" ADD CONSTRAINT "student_batch_access_mentorship_batch_id_fkey" FOREIGN KEY ("mentorship_batch_id") REFERENCES "mentorship_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_batch_access" ADD CONSTRAINT "student_batch_access_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_tasks" ADD CONSTRAINT "batch_tasks_mentorship_batch_id_fkey" FOREIGN KEY ("mentorship_batch_id") REFERENCES "mentorship_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_tasks" ADD CONSTRAINT "batch_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "mentors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_tasks" ADD CONSTRAINT "batch_tasks_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "mentors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completed_tasks" ADD CONSTRAINT "completed_tasks_batch_task_id_fkey" FOREIGN KEY ("batch_task_id") REFERENCES "batch_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completed_tasks" ADD CONSTRAINT "completed_tasks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_notices" ADD CONSTRAINT "batch_notices_mentorship_batch_id_fkey" FOREIGN KEY ("mentorship_batch_id") REFERENCES "mentorship_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_notices" ADD CONSTRAINT "batch_notices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "mentors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doubts" ADD CONSTRAINT "doubts_mentorship_batch_id_fkey" FOREIGN KEY ("mentorship_batch_id") REFERENCES "mentorship_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doubts" ADD CONSTRAINT "doubts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doubt_replies" ADD CONSTRAINT "doubt_replies_doubt_id_fkey" FOREIGN KEY ("doubt_id") REFERENCES "doubts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doubt_replies" ADD CONSTRAINT "doubt_replies_parent_reply_id_fkey" FOREIGN KEY ("parent_reply_id") REFERENCES "doubt_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doubt_replies" ADD CONSTRAINT "doubt_replies_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doubt_replies" ADD CONSTRAINT "doubt_replies_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_mentorship_batch_id_fkey" FOREIGN KEY ("mentorship_batch_id") REFERENCES "mentorship_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "mentors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_live_session_id_fkey" FOREIGN KEY ("live_session_id") REFERENCES "live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_tests" ADD CONSTRAINT "batch_tests_mentorship_batch_id_fkey" FOREIGN KEY ("mentorship_batch_id") REFERENCES "mentorship_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_tests" ADD CONSTRAINT "batch_tests_difficulty_id_fkey" FOREIGN KEY ("difficulty_id") REFERENCES "difficulty_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_tests" ADD CONSTRAINT "batch_tests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "mentors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_tests" ADD CONSTRAINT "batch_tests_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "mentors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_sections" ADD CONSTRAINT "batch_sections_batch_test_id_fkey" FOREIGN KEY ("batch_test_id") REFERENCES "batch_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_sections" ADD CONSTRAINT "batch_sections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "mentors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_sections" ADD CONSTRAINT "batch_sections_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "mentors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_comprehensions" ADD CONSTRAINT "batch_comprehensions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "mentors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_comprehensions" ADD CONSTRAINT "batch_comprehensions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "mentors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_questions" ADD CONSTRAINT "batch_questions_batch_section_id_fkey" FOREIGN KEY ("batch_section_id") REFERENCES "batch_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_questions" ADD CONSTRAINT "batch_questions_batch_comprehension_id_fkey" FOREIGN KEY ("batch_comprehension_id") REFERENCES "batch_comprehensions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_questions" ADD CONSTRAINT "batch_questions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_questions" ADD CONSTRAINT "batch_questions_subtopic_id_fkey" FOREIGN KEY ("subtopic_id") REFERENCES "subtopics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_questions" ADD CONSTRAINT "batch_questions_difficulty_id_fkey" FOREIGN KEY ("difficulty_id") REFERENCES "difficulty_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_questions" ADD CONSTRAINT "batch_questions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "mentors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_questions" ADD CONSTRAINT "batch_questions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "mentors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_attempts" ADD CONSTRAINT "batch_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_attempts" ADD CONSTRAINT "batch_attempts_batch_test_id_fkey" FOREIGN KEY ("batch_test_id") REFERENCES "batch_tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_attempt_sections" ADD CONSTRAINT "batch_attempt_sections_batch_attempt_id_fkey" FOREIGN KEY ("batch_attempt_id") REFERENCES "batch_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_attempt_sections" ADD CONSTRAINT "batch_attempt_sections_batch_section_id_fkey" FOREIGN KEY ("batch_section_id") REFERENCES "batch_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_attempt_answers" ADD CONSTRAINT "batch_attempt_answers_batch_attempt_id_fkey" FOREIGN KEY ("batch_attempt_id") REFERENCES "batch_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_attempt_answers" ADD CONSTRAINT "batch_attempt_answers_batch_question_id_fkey" FOREIGN KEY ("batch_question_id") REFERENCES "batch_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_attempt_answers" ADD CONSTRAINT "batch_attempt_answers_batch_section_id_fkey" FOREIGN KEY ("batch_section_id") REFERENCES "batch_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_test_analytics" ADD CONSTRAINT "batch_test_analytics_batch_test_id_fkey" FOREIGN KEY ("batch_test_id") REFERENCES "batch_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_section_analytics" ADD CONSTRAINT "batch_section_analytics_batch_section_id_fkey" FOREIGN KEY ("batch_section_id") REFERENCES "batch_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_question_analytics" ADD CONSTRAINT "batch_question_analytics_batch_question_id_fkey" FOREIGN KEY ("batch_question_id") REFERENCES "batch_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_topic_analytics" ADD CONSTRAINT "batch_topic_analytics_batch_test_id_fkey" FOREIGN KEY ("batch_test_id") REFERENCES "batch_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_topic_analytics" ADD CONSTRAINT "batch_topic_analytics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_subtopic_analytics" ADD CONSTRAINT "batch_subtopic_analytics_batch_test_id_fkey" FOREIGN KEY ("batch_test_id") REFERENCES "batch_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_subtopic_analytics" ADD CONSTRAINT "batch_subtopic_analytics_subtopic_id_fkey" FOREIGN KEY ("subtopic_id") REFERENCES "subtopics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rc_tests" ADD CONSTRAINT "rc_tests_difficulty_id_fkey" FOREIGN KEY ("difficulty_id") REFERENCES "difficulty_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rc_tests" ADD CONSTRAINT "rc_tests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rc_tests" ADD CONSTRAINT "rc_tests_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rc_questions" ADD CONSTRAINT "rc_questions_rc_test_id_fkey" FOREIGN KEY ("rc_test_id") REFERENCES "rc_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rc_attempts" ADD CONSTRAINT "rc_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rc_attempts" ADD CONSTRAINT "rc_attempts_rc_test_id_fkey" FOREIGN KEY ("rc_test_id") REFERENCES "rc_tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rc_attempt_answers" ADD CONSTRAINT "rc_attempt_answers_rc_attempt_id_fkey" FOREIGN KEY ("rc_attempt_id") REFERENCES "rc_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rc_attempt_answers" ADD CONSTRAINT "rc_attempt_answers_rc_question_id_fkey" FOREIGN KEY ("rc_question_id") REFERENCES "rc_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rc_test_analytics" ADD CONSTRAINT "rc_test_analytics_rc_test_id_fkey" FOREIGN KEY ("rc_test_id") REFERENCES "rc_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rc_leaderboard" ADD CONSTRAINT "rc_leaderboard_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_mock_exams" ADD CONSTRAINT "plan_mock_exams_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_mock_exams" ADD CONSTRAINT "plan_mock_exams_mock_exam_id_fkey" FOREIGN KEY ("mock_exam_id") REFERENCES "mock_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_mentorship_programs" ADD CONSTRAINT "plan_mentorship_programs_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_mentorship_programs" ADD CONSTRAINT "plan_mentorship_programs_mentorship_program_id_fkey" FOREIGN KEY ("mentorship_program_id") REFERENCES "mentorship_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_notices" ADD CONSTRAINT "dashboard_notices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_notices" ADD CONSTRAINT "dashboard_notices_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "website_settings" ADD CONSTRAINT "website_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
