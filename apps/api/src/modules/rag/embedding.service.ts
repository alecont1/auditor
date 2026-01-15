/**
 * Embedding Service
 *
 * Handles vector embedding generation using Voyage AI (Anthropic partner).
 * Falls back to a simple TF-IDF approach if Voyage is unavailable.
 *
 * @module rag/embedding
 */

import { DEFAULT_RAG_CONFIG } from './types.js';
import type { RAGConfig } from './types.js';

// =============================================================================
// TYPES
// =============================================================================

interface VoyageEmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    total_tokens: number;
  };
}

interface EmbeddingServiceResult {
  embedding: number[];
  tokensUsed: number;
  model: string;
}

// =============================================================================
// EMBEDDING SERVICE
// =============================================================================

export class EmbeddingService {
  private config: RAGConfig;
  private voyageApiKey: string | undefined;

  constructor(config: Partial<RAGConfig> = {}) {
    this.config = { ...DEFAULT_RAG_CONFIG, ...config };
    this.voyageApiKey = process.env.VOYAGE_API_KEY;
  }

  /**
   * Generate embeddings for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingServiceResult> {
    // Truncate very long texts to avoid token limits
    const truncatedText = this.truncateText(text, 8000);

    // Try Voyage AI first
    if (this.voyageApiKey) {
      try {
        return await this.generateVoyageEmbedding(truncatedText);
      } catch (error) {
        console.error('Voyage embedding failed, using fallback:', error);
      }
    }

    // Fallback to local embedding (for development/testing)
    return this.generateLocalEmbedding(truncatedText);
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async generateBatchEmbeddings(texts: string[]): Promise<EmbeddingServiceResult[]> {
    if (this.voyageApiKey && texts.length > 1) {
      try {
        return await this.generateVoyageBatchEmbeddings(texts);
      } catch (error) {
        console.error('Voyage batch embedding failed, using fallback:', error);
      }
    }

    // Fallback to individual embeddings
    const results: EmbeddingServiceResult[] = [];
    for (const text of texts) {
      results.push(await this.generateEmbedding(text));
    }
    return results;
  }

  /**
   * Generate embedding using Voyage AI API
   */
  private async generateVoyageEmbedding(text: string): Promise<EmbeddingServiceResult> {
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.voyageApiKey}`,
      },
      body: JSON.stringify({
        model: this.config.embeddingModel,
        input: text,
        input_type: 'document', // or 'query' for search queries
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Voyage API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as VoyageEmbeddingResponse;

    return {
      embedding: data.data[0].embedding,
      tokensUsed: data.usage.total_tokens,
      model: data.model,
    };
  }

  /**
   * Generate batch embeddings using Voyage AI API
   */
  private async generateVoyageBatchEmbeddings(texts: string[]): Promise<EmbeddingServiceResult[]> {
    const truncatedTexts = texts.map(t => this.truncateText(t, 8000));

    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.voyageApiKey}`,
      },
      body: JSON.stringify({
        model: this.config.embeddingModel,
        input: truncatedTexts,
        input_type: 'document',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Voyage API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as VoyageEmbeddingResponse;
    const tokensPerItem = Math.ceil(data.usage.total_tokens / texts.length);

    return data.data.map(item => ({
      embedding: item.embedding,
      tokensUsed: tokensPerItem,
      model: data.model,
    }));
  }

  /**
   * Generate embedding for search queries (uses different input_type)
   */
  async generateQueryEmbedding(query: string): Promise<EmbeddingServiceResult> {
    const truncatedQuery = this.truncateText(query, 2000);

    if (this.voyageApiKey) {
      try {
        const response = await fetch('https://api.voyageai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.voyageApiKey}`,
          },
          body: JSON.stringify({
            model: this.config.embeddingModel,
            input: truncatedQuery,
            input_type: 'query', // Optimized for search queries
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Voyage API error: ${response.status} - ${error}`);
        }

        const data = await response.json() as VoyageEmbeddingResponse;

        return {
          embedding: data.data[0].embedding,
          tokensUsed: data.usage.total_tokens,
          model: data.model,
        };
      } catch (error) {
        console.error('Voyage query embedding failed, using fallback:', error);
      }
    }

    return this.generateLocalEmbedding(truncatedQuery);
  }

  /**
   * Local fallback embedding using simple TF-IDF-like approach
   * This is for development/testing only - not production quality
   */
  private generateLocalEmbedding(text: string): EmbeddingServiceResult {
    // Simple hash-based embedding for development
    // In production, this should never be used - always use Voyage
    const dimensions = this.config.embeddingDimensions;
    const embedding = new Array(dimensions).fill(0);

    // Tokenize and normalize
    const tokens = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);

    // Simple bag-of-words with position encoding
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const hash = this.simpleHash(token);

      // Distribute token influence across multiple dimensions
      for (let j = 0; j < 5; j++) {
        const idx = (hash + j * 127) % dimensions;
        const weight = 1 / Math.sqrt(i + 1); // Position-based decay
        embedding[idx] += weight;
      }
    }

    // Normalize to unit vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < dimensions; i++) {
        embedding[i] /= magnitude;
      }
    }

    return {
      embedding,
      tokensUsed: tokens.length,
      model: 'local-fallback',
    };
  }

  /**
   * Simple hash function for local embedding
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Truncate text to approximate token limit
   */
  private truncateText(text: string, maxTokens: number): string {
    // Rough approximation: 1 token ~= 4 characters
    const maxChars = maxTokens * 4;
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars) + '...';
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) return 0;

    return dotProduct / magnitude;
  }
}

// Singleton instance
let embeddingServiceInstance: EmbeddingService | null = null;

export function getEmbeddingService(config?: Partial<RAGConfig>): EmbeddingService {
  if (!embeddingServiceInstance || config) {
    embeddingServiceInstance = new EmbeddingService(config);
  }
  return embeddingServiceInstance;
}
