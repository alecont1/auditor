/**
 * RAG Prompt Enhancer
 *
 * Enhances analysis prompts with relevant context from past analyses,
 * corrections, and technical standards using RAG.
 *
 * @module rag/prompt-enhancer
 */

import { getRAGService, type RAGContext, type SearchResult } from './index.js';
import type { TestType } from './types.js';

// =============================================================================
// TYPES
// =============================================================================

export interface EnhancedPromptInput {
  testType: TestType;
  extractedText: string;
  companyId?: string;
  includeExamples?: boolean;
  includeCorrections?: boolean;
  includeStandards?: boolean;
}

export interface EnhancedPromptResult {
  systemPromptAddition: string;
  userPromptAddition: string;
  contextUsed: {
    similarAnalyses: number;
    corrections: number;
    standards: number;
    totalTokens: number;
  };
  embeddingIds: string[]; // For tracking usage
}

// =============================================================================
// PROMPT ENHANCER
// =============================================================================

export class RAGPromptEnhancer {
  /**
   * Enhance prompts with RAG context for a new analysis
   */
  async enhancePrompt(input: EnhancedPromptInput): Promise<EnhancedPromptResult> {
    const {
      testType,
      extractedText,
      companyId,
      includeExamples = true,
      includeCorrections = true,
      includeStandards = true,
    } = input;

    const ragService = getRAGService();

    // Build query from extracted text (use first 500 chars as context)
    const queryText = `${testType} analysis: ${extractedText.slice(0, 500)}`;

    // Get RAG context
    const context = await ragService.buildContext({
      query: queryText,
      testType,
      companyId,
      maxResults: 5,
      maxTokens: 3000, // Reserve tokens for main prompt
    });

    // Track which embeddings we used
    const embeddingIds: string[] = [];

    // Build system prompt addition
    const systemPromptParts: string[] = [];

    // Add similar analyses as few-shot examples
    if (includeExamples && context.similarAnalyses.length > 0) {
      systemPromptParts.push(this.formatSimilarAnalyses(context.similarAnalyses, testType));
      embeddingIds.push(...context.similarAnalyses.map(a => a.id));
    }

    // Add corrections (learn from mistakes)
    if (includeCorrections && context.corrections.length > 0) {
      systemPromptParts.push(this.formatCorrections(context.corrections));
      embeddingIds.push(...context.corrections.map(c => c.id));
    }

    // Add relevant standards
    if (includeStandards && context.standards.length > 0) {
      systemPromptParts.push(this.formatStandards(context.standards));
      embeddingIds.push(...context.standards.map(s => s.id));
    }

    // Build user prompt addition (hints based on similar cases)
    const userPromptAddition = this.buildUserHints(context, testType);

    // Track usage asynchronously
    if (embeddingIds.length > 0) {
      ragService.trackUsage(embeddingIds).catch(console.error);
    }

    return {
      systemPromptAddition: systemPromptParts.join('\n\n'),
      userPromptAddition,
      contextUsed: {
        similarAnalyses: context.similarAnalyses.length,
        corrections: context.corrections.length,
        standards: context.standards.length,
        totalTokens: context.totalTokens,
      },
      embeddingIds,
    };
  }

  /**
   * Format similar analyses as few-shot examples
   */
  private formatSimilarAnalyses(analyses: SearchResult[], _testType: TestType): string {
    const parts: string[] = [
      '## Reference: Similar Past Analyses',
      '',
      'Use these examples from past analyses to guide your extraction and validation:',
      '',
    ];

    for (let i = 0; i < analyses.length; i++) {
      const analysis = analyses[i];
      const similarity = (analysis.similarity * 100).toFixed(0);

      parts.push(`### Example ${i + 1} (${analysis.verdict || 'N/A'}, ${similarity}% similar)`);
      parts.push('');
      parts.push(analysis.content);
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Format corrections as warnings
   */
  private formatCorrections(corrections: SearchResult[]): string {
    const parts: string[] = [
      '## IMPORTANT: Corrections from Past Analyses',
      '',
      'Pay close attention to these corrections to avoid repeating past mistakes:',
      '',
    ];

    for (const correction of corrections) {
      parts.push(`**Correction:**`);
      parts.push(correction.content);
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Format technical standards
   */
  private formatStandards(standards: SearchResult[]): string {
    const parts: string[] = [
      '## Relevant Technical Standards',
      '',
    ];

    for (const standard of standards) {
      parts.push(standard.content);
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Build hints for user prompt based on context
   */
  private buildUserHints(context: RAGContext, _testType: TestType): string {
    const hints: string[] = [];

    // Check if similar analyses had common issues
    const rejectedAnalyses = context.similarAnalyses.filter(a => a.verdict === 'REJECTED');
    if (rejectedAnalyses.length > 0) {
      hints.push('Note: Similar reports in the past have been REJECTED. Pay extra attention to validation criteria.');
    }

    // Check for common non-conformities in metadata
    const ncCodes = context.similarAnalyses
      .flatMap(a => (a.metadata?.nonConformityCodes as string[]) || []);
    const uniqueNCs = Array.from(new Set(ncCodes));

    if (uniqueNCs.length > 0) {
      hints.push(`Common issues found in similar analyses: ${uniqueNCs.slice(0, 3).join(', ')}`);
    }

    // Check for relevant corrections
    if (context.corrections.length > 0) {
      hints.push('Important: Review the corrections above - similar reports have had validation issues before.');
    }

    if (hints.length === 0) {
      return '';
    }

    return '\n\n**Analysis Hints (from past experience):**\n' + hints.map(h => `- ${h}`).join('\n');
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Get RAG-enhanced context for a specific test type
 */
export async function getRAGContextForAnalysis(
  testType: TestType,
  extractedText: string,
  companyId?: string
): Promise<EnhancedPromptResult> {
  const enhancer = new RAGPromptEnhancer();
  return enhancer.enhancePrompt({
    testType,
    extractedText,
    companyId,
  });
}

/**
 * Build a complete RAG-enhanced system prompt
 */
export function buildRAGEnhancedSystemPrompt(
  baseSystemPrompt: string,
  ragContext: EnhancedPromptResult
): string {
  if (!ragContext.systemPromptAddition) {
    return baseSystemPrompt;
  }

  return `${baseSystemPrompt}

---

# CONTEXT FROM PAST ANALYSES (Loop Learning)

The following information comes from analyzing similar reports in the past.
Use this context to improve your accuracy and avoid known pitfalls.

${ragContext.systemPromptAddition}

---

Now analyze the current report with this context in mind.`;
}

/**
 * Build a RAG-enhanced user prompt
 */
export function buildRAGEnhancedUserPrompt(
  baseUserPrompt: string,
  ragContext: EnhancedPromptResult
): string {
  if (!ragContext.userPromptAddition) {
    return baseUserPrompt;
  }

  return `${baseUserPrompt}

${ragContext.userPromptAddition}`;
}
