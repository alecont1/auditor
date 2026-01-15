/**
 * Criteria Indexer Service
 *
 * Service for indexing analysis criteria into the RAG knowledge base.
 * Used to populate the vector store with searchable technical standards,
 * validation rules, and acceptance criteria.
 *
 * @module rag/criteria-indexer
 */

import { prisma } from '../../lib/prisma.js';
import { getEmbeddingService, EmbeddingService } from './embedding.service.js';
import { type RAGConfig, type TestType } from './types.js';
import {
  ALL_CRITERIA,
  getCriteriaByCategory,
  getCriteriaByTestType,
  type CriteriaDocument,
  type CriteriaCategory,
} from './criteria.data.js';

// =============================================================================
// TYPES
// =============================================================================

export interface IndexingResult {
  success: boolean;
  indexed: number;
  failed: number;
  errors: string[];
  tokensUsed: number;
  duration: number;
}

export interface IndexingProgress {
  total: number;
  current: number;
  currentId: string;
  currentTitle: string;
}

export type ProgressCallback = (progress: IndexingProgress) => void;

// =============================================================================
// CRITERIA INDEXER SERVICE
// =============================================================================

export class CriteriaIndexerService {
  private embeddingService: EmbeddingService;

  constructor(config: Partial<RAGConfig> = {}) {
    this.embeddingService = getEmbeddingService(config);
  }

  // ===========================================================================
  // MAIN INDEXING METHODS
  // ===========================================================================

  /**
   * Index all criteria into the knowledge base
   */
  async indexAllCriteria(
    progressCallback?: ProgressCallback
  ): Promise<IndexingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let indexed = 0;
    let tokensUsed = 0;

    const criteria = ALL_CRITERIA;
    const total = criteria.length;

    console.log(`Starting indexing of ${total} criteria documents...`);

    for (let i = 0; i < criteria.length; i++) {
      const doc = criteria[i];

      if (progressCallback) {
        progressCallback({
          total,
          current: i + 1,
          currentId: doc.id,
          currentTitle: doc.title,
        });
      }

      try {
        const result = await this.indexSingleCriterion(doc);
        if (result.success) {
          indexed++;
          tokensUsed += result.tokensUsed || 0;
        } else {
          errors.push(`${doc.id}: ${result.error}`);
        }
      } catch (error: any) {
        errors.push(`${doc.id}: ${error.message}`);
      }

      // Small delay to avoid rate limiting
      if (i > 0 && i % 10 === 0) {
        await this.delay(100);
      }
    }

    const duration = Date.now() - startTime;

    console.log(`Indexing complete: ${indexed}/${total} successful in ${duration}ms`);

    return {
      success: errors.length === 0,
      indexed,
      failed: errors.length,
      errors,
      tokensUsed,
      duration,
    };
  }

  /**
   * Index criteria by category (GROUNDING, THERMOGRAPHY, MEGGER, UNIVERSAL)
   */
  async indexByCategory(
    category: CriteriaCategory,
    progressCallback?: ProgressCallback
  ): Promise<IndexingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let indexed = 0;
    let tokensUsed = 0;

    const criteria = getCriteriaByCategory(category);
    const total = criteria.length;

    console.log(`Indexing ${total} criteria for category: ${category}`);

    for (let i = 0; i < criteria.length; i++) {
      const doc = criteria[i];

      if (progressCallback) {
        progressCallback({
          total,
          current: i + 1,
          currentId: doc.id,
          currentTitle: doc.title,
        });
      }

      try {
        const result = await this.indexSingleCriterion(doc);
        if (result.success) {
          indexed++;
          tokensUsed += result.tokensUsed || 0;
        } else {
          errors.push(`${doc.id}: ${result.error}`);
        }
      } catch (error: any) {
        errors.push(`${doc.id}: ${error.message}`);
      }
    }

    const duration = Date.now() - startTime;

    return {
      success: errors.length === 0,
      indexed,
      failed: errors.length,
      errors,
      tokensUsed,
      duration,
    };
  }

  /**
   * Index criteria by test type (includes UNIVERSAL criteria)
   */
  async indexByTestType(
    testType: TestType,
    progressCallback?: ProgressCallback
  ): Promise<IndexingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let indexed = 0;
    let tokensUsed = 0;

    const criteria = getCriteriaByTestType(testType);
    const total = criteria.length;

    console.log(`Indexing ${total} criteria for test type: ${testType}`);

    for (let i = 0; i < criteria.length; i++) {
      const doc = criteria[i];

      if (progressCallback) {
        progressCallback({
          total,
          current: i + 1,
          currentId: doc.id,
          currentTitle: doc.title,
        });
      }

      try {
        const result = await this.indexSingleCriterion(doc);
        if (result.success) {
          indexed++;
          tokensUsed += result.tokensUsed || 0;
        } else {
          errors.push(`${doc.id}: ${result.error}`);
        }
      } catch (error: any) {
        errors.push(`${doc.id}: ${error.message}`);
      }
    }

    const duration = Date.now() - startTime;

    return {
      success: errors.length === 0,
      indexed,
      failed: errors.length,
      errors,
      tokensUsed,
      duration,
    };
  }

  /**
   * Index a single criterion document
   */
  async indexSingleCriterion(
    doc: CriteriaDocument
  ): Promise<{ success: boolean; error?: string; tokensUsed?: number }> {
    try {
      // Check if already indexed (by criterion ID in metadata)
      const existing = await this.checkExisting(doc.id);
      if (existing) {
        console.log(`Criterion ${doc.id} already indexed, skipping...`);
        return { success: true, tokensUsed: 0 };
      }

      // Build content string for embedding
      const content = this.buildCriterionContent(doc);

      // Generate embedding
      const { embedding, tokensUsed } = await this.embeddingService.generateEmbedding(content);
      const embeddingStr = `[${embedding.join(',')}]`;

      // Determine content type based on criterion type
      const contentType = this.mapCriterionTypeToContentType(doc.type);

      // Determine test types for this criterion
      const testTypes = this.getTestTypesForCriterion(doc);

      // Insert into database
      await prisma.$queryRawUnsafe(
        `
        INSERT INTO knowledge_embeddings (
          id, "companyId", "analysisId", "contentType", "testType", verdict,
          content, embedding, metadata, "wasCorrect", "useCount", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), NULL, NULL, $1, $2, NULL,
          $3, $4::vector, $5::jsonb, true, 0, NOW(), NOW()
        )
        `,
        contentType,
        testTypes[0] || null, // Primary test type
        content,
        embeddingStr,
        JSON.stringify({
          criterionId: doc.id,
          criterionType: doc.type,
          category: doc.category,
          title: doc.title,
          normas: doc.metadata.normas || [],
          severity: doc.metadata.severity || null,
          limit: doc.metadata.limit || null,
          formula: doc.metadata.formula || null,
          applicableTestTypes: testTypes,
          source: doc.metadata.source || 'AuditEng',
          priority: doc.metadata.priority || 99,
        })
      );

      // If criterion applies to multiple test types, create additional entries
      // with the same embedding for better search coverage
      if (testTypes.length > 1) {
        for (let i = 1; i < testTypes.length; i++) {
          await prisma.$queryRawUnsafe(
            `
            INSERT INTO knowledge_embeddings (
              id, "companyId", "analysisId", "contentType", "testType", verdict,
              content, embedding, metadata, "wasCorrect", "useCount", "createdAt", "updatedAt"
            ) VALUES (
              gen_random_uuid(), NULL, NULL, $1, $2, NULL,
              $3, $4::vector, $5::jsonb, true, 0, NOW(), NOW()
            )
            `,
            contentType,
            testTypes[i],
            content,
            embeddingStr,
            JSON.stringify({
              criterionId: doc.id,
              criterionType: doc.type,
              category: doc.category,
              title: doc.title,
              normas: doc.metadata.normas || [],
              severity: doc.metadata.severity || null,
              limit: doc.metadata.limit || null,
              formula: doc.metadata.formula || null,
              applicableTestTypes: testTypes,
              source: doc.metadata.source || 'AuditEng',
              priority: doc.metadata.priority || 99,
              secondaryIndex: true,
            })
          );
        }
      }

      return { success: true, tokensUsed };
    } catch (error: any) {
      console.error(`Failed to index criterion ${doc.id}:`, error);
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // CLEANUP METHODS
  // ===========================================================================

  /**
   * Remove all criteria from knowledge base (for re-indexing)
   */
  async clearAllCriteria(): Promise<{ deleted: number }> {
    const result = await prisma.$executeRawUnsafe(
      `
      DELETE FROM knowledge_embeddings
      WHERE "contentType" IN ('TECHNICAL_STANDARD', 'BEST_PRACTICE')
      AND "companyId" IS NULL
      AND "analysisId" IS NULL
      `
    );

    console.log(`Deleted ${result} criteria entries`);
    return { deleted: result as number };
  }

  /**
   * Remove criteria by category
   */
  async clearByCategory(category: CriteriaCategory): Promise<{ deleted: number }> {
    const result = await prisma.$executeRawUnsafe(
      `
      DELETE FROM knowledge_embeddings
      WHERE "contentType" IN ('TECHNICAL_STANDARD', 'BEST_PRACTICE')
      AND "companyId" IS NULL
      AND metadata->>'category' = $1
      `,
      category
    );

    console.log(`Deleted ${result} criteria entries for category ${category}`);
    return { deleted: result as number };
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  /**
   * Check if a criterion is already indexed
   */
  private async checkExisting(criterionId: string): Promise<boolean> {
    type CountResult = { count: bigint };
    const result: CountResult[] = await prisma.$queryRawUnsafe(
      `
      SELECT COUNT(*) as count
      FROM knowledge_embeddings
      WHERE metadata->>'criterionId' = $1
      LIMIT 1
      `,
      criterionId
    );

    return result[0]?.count > 0;
  }

  /**
   * Build content string from criterion document
   */
  private buildCriterionContent(doc: CriteriaDocument): string {
    const parts: string[] = [];

    // Title with type indicator
    parts.push(`[${doc.type}] ${doc.title}`);
    parts.push('');

    // Category and applicable test types
    parts.push(`Category: ${doc.category}`);
    if (doc.metadata.applicableTestTypes?.length) {
      parts.push(`Applies to: ${doc.metadata.applicableTestTypes.join(', ')}`);
    }

    // Metadata summary
    if (doc.metadata.normas?.length) {
      parts.push(`Standards: ${doc.metadata.normas.join(', ')}`);
    }
    if (doc.metadata.severity) {
      parts.push(`Severity: ${doc.metadata.severity}`);
    }
    if (doc.metadata.limit) {
      parts.push(`Limit: ${doc.metadata.limit}`);
    }
    if (doc.metadata.formula) {
      parts.push(`Formula: ${doc.metadata.formula}`);
    }
    parts.push('');

    // Main content
    parts.push(doc.content);

    return parts.join('\n');
  }

  /**
   * Map criterion type to RAG content type
   */
  private mapCriterionTypeToContentType(
    type: CriteriaDocument['type']
  ): 'TECHNICAL_STANDARD' | 'BEST_PRACTICE' {
    switch (type) {
      case 'STANDARD':
      case 'LIMIT':
      case 'FORMULA':
        return 'TECHNICAL_STANDARD';
      case 'CRITERIA':
      case 'VALIDATION_RULE':
        return 'BEST_PRACTICE';
      default:
        return 'TECHNICAL_STANDARD';
    }
  }

  /**
   * Get test types for a criterion
   */
  private getTestTypesForCriterion(doc: CriteriaDocument): TestType[] {
    // If explicit test types defined, use those
    if (doc.metadata.applicableTestTypes?.length) {
      return doc.metadata.applicableTestTypes;
    }

    // Otherwise derive from category
    switch (doc.category) {
      case 'GROUNDING':
        return ['GROUNDING'];
      case 'THERMOGRAPHY':
        return ['THERMOGRAPHY'];
      case 'MEGGER':
        return ['MEGGER'];
      case 'UNIVERSAL':
        return ['GROUNDING', 'MEGGER', 'THERMOGRAPHY'];
      default:
        return [];
    }
  }

  /**
   * Simple delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let criteriaIndexerInstance: CriteriaIndexerService | null = null;

export function getCriteriaIndexerService(
  config?: Partial<RAGConfig>
): CriteriaIndexerService {
  if (!criteriaIndexerInstance || config) {
    criteriaIndexerInstance = new CriteriaIndexerService(config);
  }
  return criteriaIndexerInstance;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Quick function to index all criteria
 */
export async function seedAllCriteria(): Promise<IndexingResult> {
  const indexer = getCriteriaIndexerService();
  return indexer.indexAllCriteria((progress) => {
    console.log(`[${progress.current}/${progress.total}] Indexing: ${progress.currentTitle}`);
  });
}

/**
 * Quick function to clear and re-index all criteria
 */
export async function reseedAllCriteria(): Promise<IndexingResult> {
  const indexer = getCriteriaIndexerService();

  console.log('Clearing existing criteria...');
  await indexer.clearAllCriteria();

  console.log('Re-indexing all criteria...');
  return indexer.indexAllCriteria((progress) => {
    console.log(`[${progress.current}/${progress.total}] Indexing: ${progress.currentTitle}`);
  });
}
