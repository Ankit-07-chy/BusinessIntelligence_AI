-- AlterTable
ALTER TABLE "explanations" ADD COLUMN "structured_response" JSONB NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "explanations_anomaly_id_persona_id_key" ON "explanations"("anomaly_id", "persona_id");

-- AlterTable
ALTER TABLE "action_recommendations"
  ADD COLUMN "driver_id" TEXT,
  ADD COLUMN "lever" TEXT,
  ADD COLUMN "confidence" DECIMAL(65,30),
  ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
