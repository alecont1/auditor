/**
 * RAG Types for Loop Learning
 *
 * Type definitions for the RAG (Retrieval-Augmented Generation) system
 * that enables loop learning from past analyses.
 */

// =============================================================================
// CONTENT TYPES
// =============================================================================

export type ContentType =
  | 'ANALYSIS_RESULT'      // Completed analysis with extraction + validation
  | 'MANUAL_CORRECTION'    // User feedback/correction
  | 'TECHNICAL_STANDARD'   // NBR, IEEE, NETA standards
  | 'BEST_PRACTICE';       // Domain knowledge, guidelines

export type TestType = 'GROUNDING' | 'MEGGER' | 'THERMOGRAPHY';

export type Verdict = 'APPROVED' | 'APPROVED_WITH_COMMENTS' | 'REJECTED';

export type FeedbackType =
  | 'VERDICT_CORRECTION'   // User says verdict was wrong
  | 'FIELD_CORRECTION'     // User corrects extracted field
  | 'FALSE_POSITIVE'       // Flagged as issue but wasn't
  | 'FALSE_NEGATIVE';      // Missed an issue

// =============================================================================
// EMBEDDING TYPES
// =============================================================================

export interface EmbeddingInput {
  content: string;
  contentType: ContentType;
  testType?: TestType;
  verdict?: Verdict;
  metadata?: Record<string, any>;
  companyId?: string;
  analysisId?: string;
}

export interface EmbeddingResult {
  id: string;
  embedding: number[];
  content: string;
  contentType: ContentType;
  testType?: TestType;
  verdict?: Verdict;
  metadata?: Record<string, any>;
}

// =============================================================================
// SEARCH TYPES
// =============================================================================

export interface SearchQuery {
  query: string;
  testType?: TestType;
  verdict?: Verdict;
  contentTypes?: ContentType[];
  companyId?: string;
  limit?: number;
  minSimilarity?: number;
}

export interface SearchResult {
  id: string;
  content: string;
  contentType: ContentType;
  testType?: TestType;
  verdict?: Verdict;
  similarity: number;
  metadata?: Record<string, any>;
  analysisId?: string;
}

// =============================================================================
// RAG CONTEXT TYPES
// =============================================================================

export interface RAGContext {
  similarAnalyses: SearchResult[];
  corrections: SearchResult[];
  standards: SearchResult[];
  totalTokens: number;
}

export interface RAGContextRequest {
  query: string;
  testType: TestType;
  companyId?: string;
  maxResults?: number;
  maxTokens?: number;
}

// =============================================================================
// FEEDBACK TYPES
// =============================================================================

export interface FeedbackInput {
  analysisId: string;
  userId: string;
  companyId: string;
  feedbackType: FeedbackType;
  originalValue: Record<string, any>;
  correctedValue: Record<string, any>;
  explanation?: string;
}

// =============================================================================
// INDEXING TYPES
// =============================================================================

export interface IndexAnalysisInput {
  analysisId: string;
  testType: TestType;
  verdict: Verdict;
  extractionData: Record<string, any>;
  nonConformities: Array<{
    code: string;
    severity: string;
    description: string;
    evidence: string;
  }>;
  companyId: string;
}

export interface IndexResult {
  success: boolean;
  embeddingId?: string;
  error?: string;
  tokensUsed?: number;
}

// =============================================================================
// SERVICE CONFIG
// =============================================================================

export interface RAGConfig {
  // Embedding provider configuration
  embeddingModel: string;
  embeddingDimensions: number;

  // Search configuration
  defaultLimit: number;
  defaultMinSimilarity: number;

  // Context configuration
  maxContextTokens: number;
  maxSimilarAnalyses: number;
  maxCorrections: number;
  maxStandards: number;

  // Chunking configuration
  chunkSize: number;
  chunkOverlap: number;
}

export const DEFAULT_RAG_CONFIG: RAGConfig = {
  // Using voyage-3-lite (1024 dimensions, good balance of quality/cost)
  embeddingModel: 'voyage-3-lite',
  embeddingDimensions: 1024,

  // Search defaults
  defaultLimit: 5,
  defaultMinSimilarity: 0.7,

  // Context limits
  maxContextTokens: 4000,
  maxSimilarAnalyses: 3,
  maxCorrections: 2,
  maxStandards: 2,

  // Chunking (for long documents)
  chunkSize: 600,
  chunkOverlap: 100,
};
