/**
 * RAG Service
 *
 * Main service for Retrieval-Augmented Generation.
 * Handles semantic search and context building for loop learning.
 *
 * @module rag/service
 */

import { prisma } from '../../lib/prisma.js';
import { getEmbeddingService, EmbeddingService } from './embedding.service.js';
import {
  DEFAULT_RAG_CONFIG,
  type RAGConfig,
  type SearchQuery,
  type SearchResult,
  type RAGContext,
  type RAGContextRequest,
  type IndexAnalysisInput,
  type IndexResult,
  type ContentType,
} from './types.js';

// =============================================================================
// RAG SERVICE
// =============================================================================

export class RAGService {
  private config: RAGConfig;
  private embeddingService: EmbeddingService;

  constructor(config: Partial<RAGConfig> = {}) {
    this.config = { ...DEFAULT_RAG_CONFIG, ...config };
    this.embeddingService = getEmbeddingService(config);
  }

  // ===========================================================================
  // SEMANTIC SEARCH
  // ===========================================================================

  /**
   * Search for similar content using vector similarity
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const {
      query: queryText,
      testType,
      verdict,
      contentTypes,
      companyId,
      limit = this.config.defaultLimit,
      minSimilarity = this.config.defaultMinSimilarity,
    } = query;

    // Generate query embedding
    const { embedding } = await this.embeddingService.generateQueryEmbedding(queryText);
    const embeddingStr = `[${embedding.join(',')}]`;

    // Build WHERE conditions
    const conditions: string[] = [];
    const params: any[] = [embeddingStr, limit];
    let paramIndex = 3;

    if (testType) {
      conditions.push(`"testType" = $${paramIndex}`);
      params.push(testType);
      paramIndex++;
    }

    if (verdict) {
      conditions.push(`verdict = $${paramIndex}`);
      params.push(verdict);
      paramIndex++;
    }

    if (contentTypes && contentTypes.length > 0) {
      conditions.push(`"contentType" = ANY($${paramIndex})`);
      params.push(contentTypes);
      paramIndex++;
    }

    if (companyId) {
      // Include company-specific and global knowledge
      conditions.push(`("companyId" = $${paramIndex} OR "companyId" IS NULL)`);
      params.push(companyId);
      paramIndex++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Execute vector similarity search using pgvector
    // Uses cosine distance: 1 - (a <=> b) gives similarity
    type SearchQueryResult = {
      id: string;
      content: string;
      contentType: string;
      testType: string | null;
      verdict: string | null;
      similarity: number;
      metadata: any;
      analysisId: string | null;
    };

    const results: SearchQueryResult[] = await prisma.$queryRawUnsafe(
      `
      SELECT
        id,
        content,
        "contentType",
        "testType",
        verdict,
        1 - (embedding <=> $1::vector) as similarity,
        metadata,
        "analysisId"
      FROM knowledge_embeddings
      ${whereClause}
      AND embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $2
      `,
      ...params
    );

    // Filter by minimum similarity and map to result type
    return results
      .filter(r => r.similarity >= minSimilarity)
      .map(r => ({
        id: r.id,
        content: r.content,
        contentType: r.contentType as ContentType,
        testType: r.testType as any,
        verdict: r.verdict as any,
        similarity: r.similarity,
        metadata: r.metadata,
        analysisId: r.analysisId || undefined,
      }));
  }

  // ===========================================================================
  // CONTEXT BUILDING
  // ===========================================================================

  /**
   * Build RAG context for an analysis request
   * Retrieves similar analyses, corrections, and relevant standards
   */
  async buildContext(request: RAGContextRequest): Promise<RAGContext> {
    const {
      query,
      testType,
      companyId,
      maxTokens = this.config.maxContextTokens,
    } = request;

    // Search for similar completed analyses
    const similarAnalyses = await this.search({
      query,
      testType,
      contentTypes: ['ANALYSIS_RESULT'],
      companyId,
      limit: this.config.maxSimilarAnalyses,
      minSimilarity: 0.65,
    });

    // Search for relevant corrections (learn from mistakes)
    const corrections = await this.search({
      query,
      testType,
      contentTypes: ['MANUAL_CORRECTION'],
      companyId,
      limit: this.config.maxCorrections,
      minSimilarity: 0.60,
    });

    // Search for relevant technical standards
    const standards = await this.search({
      query,
      testType,
      contentTypes: ['TECHNICAL_STANDARD', 'BEST_PRACTICE'],
      limit: this.config.maxStandards,
      minSimilarity: 0.55,
    });

    // Calculate approximate token count
    const estimateTokens = (text: string) => Math.ceil(text.length / 4);
    let totalTokens = 0;

    // Trim results to fit within token budget
    const trimmedAnalyses: SearchResult[] = [];
    for (const analysis of similarAnalyses) {
      const tokens = estimateTokens(analysis.content);
      if (totalTokens + tokens > maxTokens * 0.5) break; // Reserve 50% for other context
      trimmedAnalyses.push(analysis);
      totalTokens += tokens;
    }

    const trimmedCorrections: SearchResult[] = [];
    for (const correction of corrections) {
      const tokens = estimateTokens(correction.content);
      if (totalTokens + tokens > maxTokens * 0.75) break;
      trimmedCorrections.push(correction);
      totalTokens += tokens;
    }

    const trimmedStandards: SearchResult[] = [];
    for (const standard of standards) {
      const tokens = estimateTokens(standard.content);
      if (totalTokens + tokens > maxTokens) break;
      trimmedStandards.push(standard);
      totalTokens += tokens;
    }

    return {
      similarAnalyses: trimmedAnalyses,
      corrections: trimmedCorrections,
      standards: trimmedStandards,
      totalTokens,
    };
  }

  /**
   * Format RAG context for injection into prompts
   */
  formatContextForPrompt(context: RAGContext): string {
    const sections: string[] = [];

    // Format similar analyses
    if (context.similarAnalyses.length > 0) {
      sections.push('## Similar Previous Analyses\n');
      for (const analysis of context.similarAnalyses) {
        sections.push(`### Example (${analysis.verdict || 'N/A'}, similarity: ${(analysis.similarity * 100).toFixed(0)}%)`);
        sections.push(analysis.content);
        sections.push('');
      }
    }

    // Format corrections (learn from mistakes)
    if (context.corrections.length > 0) {
      sections.push('## Important Corrections from Past Analyses\n');
      sections.push('Pay special attention to these corrections to avoid repeating mistakes:\n');
      for (const correction of context.corrections) {
        sections.push(`- ${correction.content}`);
      }
      sections.push('');
    }

    // Format technical standards
    if (context.standards.length > 0) {
      sections.push('## Relevant Technical Standards\n');
      for (const standard of context.standards) {
        sections.push(standard.content);
        sections.push('');
      }
    }

    return sections.join('\n');
  }

  // ===========================================================================
  // INDEXING
  // ===========================================================================

  /**
   * Index a completed analysis for future RAG retrieval
   */
  async indexAnalysis(input: IndexAnalysisInput): Promise<IndexResult> {
    try {
      // Build content string from analysis data
      const content = this.buildAnalysisContent(input);

      // Generate embedding
      const { embedding, tokensUsed } = await this.embeddingService.generateEmbedding(content);
      const embeddingStr = `[${embedding.join(',')}]`;

      // Store in database using raw SQL (Prisma doesn't support vector type directly)
      const severitiesSet = new Set(input.nonConformities.map(nc => nc.severity));
      const result: Array<{ id: string }> = await prisma.$queryRawUnsafe(
        `
        INSERT INTO knowledge_embeddings (
          id, "companyId", "analysisId", "contentType", "testType", verdict,
          content, embedding, metadata, "wasCorrect", "useCount", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5,
          $6, $7::vector, $8::jsonb, true, 0, NOW(), NOW()
        )
        RETURNING id
        `,
        input.companyId,
        input.analysisId,
        'ANALYSIS_RESULT',
        input.testType,
        input.verdict,
        content,
        embeddingStr,
        JSON.stringify({
          nonConformityCodes: input.nonConformities.map(nc => nc.code),
          severities: Array.from(severitiesSet),
        })
      );

      return {
        success: true,
        embeddingId: result[0]?.id,
        tokensUsed,
      };
    } catch (error: any) {
      console.error('Failed to index analysis:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Index a manual correction for loop learning
   */
  async indexCorrection(
    analysisId: string,
    companyId: string,
    testType: string,
    originalValue: any,
    correctedValue: any,
    explanation?: string
  ): Promise<IndexResult> {
    try {
      // Build correction content
      const content = this.buildCorrectionContent(
        testType,
        originalValue,
        correctedValue,
        explanation
      );

      // Generate embedding
      const { embedding, tokensUsed } = await this.embeddingService.generateEmbedding(content);
      const embeddingStr = `[${embedding.join(',')}]`;

      // Store in database
      const result: Array<{ id: string }> = await prisma.$queryRawUnsafe(
        `
        INSERT INTO knowledge_embeddings (
          id, "companyId", "analysisId", "contentType", "testType", verdict,
          content, embedding, metadata, "wasCorrect", "useCount", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, NULL,
          $5, $6::vector, $7::jsonb, true, 0, NOW(), NOW()
        )
        RETURNING id
        `,
        companyId,
        analysisId,
        'MANUAL_CORRECTION',
        testType,
        content,
        embeddingStr,
        JSON.stringify({
          correctionType: 'user_feedback',
          hasExplanation: !!explanation,
        })
      );

      return {
        success: true,
        embeddingId: result[0]?.id,
        tokensUsed,
      };
    } catch (error: any) {
      console.error('Failed to index correction:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Index technical standard content
   */
  async indexStandard(
    standardName: string,
    section: string,
    content: string,
    testTypes: string[]
  ): Promise<IndexResult> {
    try {
      const fullContent = `[${standardName}] ${section}\n\n${content}`;

      // Generate embedding
      const { embedding, tokensUsed } = await this.embeddingService.generateEmbedding(fullContent);
      const embeddingStr = `[${embedding.join(',')}]`;

      // Index for each applicable test type
      for (const testType of testTypes) {
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
          'TECHNICAL_STANDARD',
          testType,
          fullContent,
          embeddingStr,
          JSON.stringify({
            standardName,
            section,
          })
        );
      }

      return {
        success: true,
        tokensUsed,
      };
    } catch (error: any) {
      console.error('Failed to index standard:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ===========================================================================
  // CONTENT BUILDERS
  // ===========================================================================

  /**
   * Build content string from analysis for embedding
   */
  private buildAnalysisContent(input: IndexAnalysisInput): string {
    const parts: string[] = [];

    // Header with verdict
    parts.push(`${input.testType} Analysis - ${input.verdict}`);

    // Extraction summary
    const extraction = input.extractionData;
    if (extraction) {
      parts.push('\nExtracted Data:');

      // Test-type specific formatting
      switch (input.testType) {
        case 'GROUNDING':
          if (extraction.groundResistance?.value) {
            parts.push(`- Ground Resistance: ${extraction.groundResistance.value}${extraction.groundResistance.unit || 'ohm'}`);
          }
          if (extraction.watermarkPresent?.value !== undefined) {
            parts.push(`- Watermark Present: ${extraction.watermarkPresent.value ? 'Yes' : 'No'}`);
          }
          break;

        case 'MEGGER':
          if (extraction.insulationResistance) {
            parts.push('- Insulation Resistance Readings:');
            const ir = extraction.insulationResistance;
            for (const [key, value] of Object.entries(ir)) {
              if (value && typeof value === 'object' && 'value' in value) {
                parts.push(`  - ${key}: ${(value as any).value} ${(value as any).unit || 'Mohm'}`);
              }
            }
          }
          if (extraction.absorptionIndex?.value) {
            parts.push(`- Absorption Index: ${extraction.absorptionIndex.value}`);
          }
          break;

        case 'THERMOGRAPHY':
          if (extraction.phaseToPhaseDeltatT?.value) {
            parts.push(`- Phase-to-Phase Delta T: ${extraction.phaseToPhaseDeltatT.value}C`);
          }
          if (extraction.ambientTemperature?.value) {
            parts.push(`- Ambient Temperature: ${extraction.ambientTemperature.value}C`);
          }
          break;
      }

      // Calibration info
      if (extraction.calibrationCertificate) {
        parts.push(`- Calibration Expiry: ${extraction.calibrationCertificate.expiryDate || 'Unknown'}`);
        parts.push(`- Calibration Valid: ${extraction.calibrationCertificate.isExpired ? 'No' : 'Yes'}`);
      }
    }

    // Non-conformities
    if (input.nonConformities.length > 0) {
      parts.push('\nNon-Conformities Found:');
      for (const nc of input.nonConformities) {
        parts.push(`- [${nc.severity}] ${nc.code}: ${nc.description}`);
        parts.push(`  Evidence: ${nc.evidence}`);
      }
    } else {
      parts.push('\nNo non-conformities found.');
    }

    return parts.join('\n');
  }

  /**
   * Build content string from a correction for embedding
   */
  private buildCorrectionContent(
    testType: string,
    originalValue: any,
    correctedValue: any,
    explanation?: string
  ): string {
    const parts: string[] = [];

    parts.push(`CORRECTION for ${testType} Analysis`);
    parts.push('\nOriginal (INCORRECT):');
    parts.push(typeof originalValue === 'string' ? originalValue : JSON.stringify(originalValue, null, 2));

    parts.push('\nCorrected (CORRECT):');
    parts.push(typeof correctedValue === 'string' ? correctedValue : JSON.stringify(correctedValue, null, 2));

    if (explanation) {
      parts.push('\nExplanation:');
      parts.push(explanation);
    }

    return parts.join('\n');
  }

  // ===========================================================================
  // USAGE TRACKING
  // ===========================================================================

  /**
   * Increment use count for embeddings that were used as context
   */
  async trackUsage(embeddingIds: string[]): Promise<void> {
    if (embeddingIds.length === 0) return;

    await prisma.$executeRawUnsafe(
      `
      UPDATE knowledge_embeddings
      SET "useCount" = "useCount" + 1, "updatedAt" = NOW()
      WHERE id = ANY($1::uuid[])
      `,
      embeddingIds
    );
  }

  /**
   * Mark an embedding as incorrect (for loop learning)
   */
  async markAsIncorrect(embeddingId: string): Promise<void> {
    await prisma.$executeRawUnsafe(
      `
      UPDATE knowledge_embeddings
      SET "wasCorrect" = false, "updatedAt" = NOW()
      WHERE id = $1
      `,
      embeddingId
    );
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let ragServiceInstance: RAGService | null = null;

export function getRAGService(config?: Partial<RAGConfig>): RAGService {
  if (!ragServiceInstance || config) {
    ragServiceInstance = new RAGService(config);
  }
  return ragServiceInstance;
}
