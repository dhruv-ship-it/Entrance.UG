-- CreateTable
CREATE TABLE "mock_attempt_swot_analysis" (
    "id" UUID NOT NULL,
    "mock_attempt_id" UUID NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" JSONB NOT NULL,
    "weaknesses" JSONB NOT NULL,
    "opportunities" JSONB NOT NULL,
    "threats" JSONB NOT NULL,
    "generated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mock_attempt_swot_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mock_attempt_swot_analysis_mock_attempt_id_key" ON "mock_attempt_swot_analysis"("mock_attempt_id");

-- AddForeignKey
ALTER TABLE "mock_attempt_swot_analysis" ADD CONSTRAINT "mock_attempt_swot_analysis_mock_attempt_id_fkey" FOREIGN KEY ("mock_attempt_id") REFERENCES "mock_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
