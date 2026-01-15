/**
 * RAG Module Index
 *
 * Exports for the RAG (Retrieval-Augmented Generation) module
 * that powers loop learning in AuditEng.
 *
 * @module rag
 */

// =============================================================================
// SERVICES
// =============================================================================

export { RAGService, getRAGService } from './rag.service.js';
export { EmbeddingService, getEmbeddingService } from './embedding.service.js';

// =============================================================================
// CRITERIA INDEXER
// =============================================================================

export {
  CriteriaIndexerService,
  getCriteriaIndexerService,
  seedAllCriteria,
  reseedAllCriteria,
} from './criteria-indexer.service.js';

export type {
  IndexingResult,
  IndexingProgress,
  ProgressCallback,
} from './criteria-indexer.service.js';

// =============================================================================
// CRITERIA DATA
// =============================================================================

export {
  ALL_CRITERIA,
  UNIVERSAL_CRITERIA,
  GROUNDING_CRITERIA,
  THERMOGRAPHY_CRITERIA,
  MEGGER_CRITERIA,
  getCriteriaByCategory,
  getCriteriaByTestType,
  getCriteriaBySeverity,
} from './criteria.data.js';

export type {
  CriteriaDocument,
  CriteriaCategory,
  CriteriaSeverity,
} from './criteria.data.js';

// =============================================================================
// PROMPT ENHANCEMENT
// =============================================================================

export {
  RAGPromptEnhancer,
  getRAGContextForAnalysis,
  buildRAGEnhancedSystemPrompt,
  buildRAGEnhancedUserPrompt,
} from './prompt-enhancer.js';

export type { EnhancedPromptInput, EnhancedPromptResult } from './prompt-enhancer.js';

// =============================================================================
// TYPES
// =============================================================================

export type {
  ContentType,
  TestType,
  Verdict,
  FeedbackType,
  EmbeddingInput,
  EmbeddingResult,
  SearchQuery,
  SearchResult,
  RAGContext,
  RAGContextRequest,
  FeedbackInput,
  IndexAnalysisInput,
  IndexResult,
  RAGConfig,
} from './types.js';

export { DEFAULT_RAG_CONFIG } from './types.js';
