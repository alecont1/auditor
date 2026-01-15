-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable: Knowledge Embeddings for RAG/Loop Learning
CREATE TABLE "knowledge_embeddings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "companyId" UUID,
    "analysisId" UUID,
    "contentType" TEXT NOT NULL,
    "testType" TEXT,
    "verdict" TEXT,
    "content" TEXT NOT NULL,
    "embedding" vector(1024),
    "metadata" JSONB,
    "wasCorrect" BOOLEAN NOT NULL DEFAULT true,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Analysis Feedback for Loop Learning
CREATE TABLE "analysis_feedback" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "analysisId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "feedbackType" TEXT NOT NULL,
    "originalValue" JSONB NOT NULL,
    "correctedValue" JSONB NOT NULL,
    "explanation" TEXT,
    "incorporated" BOOLEAN NOT NULL DEFAULT false,
    "incorporatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Indexes for efficient querying
CREATE INDEX "knowledge_embeddings_companyId_testType_idx" ON "knowledge_embeddings"("companyId", "testType");
CREATE INDEX "knowledge_embeddings_contentType_idx" ON "knowledge_embeddings"("contentType");
CREATE INDEX "knowledge_embeddings_verdict_idx" ON "knowledge_embeddings"("verdict");
CREATE INDEX "knowledge_embeddings_createdAt_idx" ON "knowledge_embeddings"("createdAt");

CREATE INDEX "analysis_feedback_analysisId_idx" ON "analysis_feedback"("analysisId");
CREATE INDEX "analysis_feedback_companyId_createdAt_idx" ON "analysis_feedback"("companyId", "createdAt");
CREATE INDEX "analysis_feedback_feedbackType_idx" ON "analysis_feedback"("feedbackType");
CREATE INDEX "analysis_feedback_incorporated_idx" ON "analysis_feedback"("incorporated");

-- Create HNSW index for fast approximate nearest neighbor search
-- This significantly speeds up vector similarity queries
CREATE INDEX "knowledge_embeddings_embedding_idx" ON "knowledge_embeddings"
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- AddForeignKey
ALTER TABLE "knowledge_embeddings" ADD CONSTRAINT "knowledge_embeddings_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "knowledge_embeddings" ADD CONSTRAINT "knowledge_embeddings_analysisId_fkey"
FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "analysis_feedback" ADD CONSTRAINT "analysis_feedback_analysisId_fkey"
FOREIGN KEY ("analysisId") REFERENCES "analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "analysis_feedback" ADD CONSTRAINT "analysis_feedback_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "analysis_feedback" ADD CONSTRAINT "analysis_feedback_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
