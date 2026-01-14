/**
 * Base Extractor Class
 *
 * Abstract base class for all Vision AI extractors with:
 * - Retry logic with exponential backoff
 * - Structured output validation
 * - Cost tracking
 * - Logging
 *
 * @version 1.0.0
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Default configuration for extractors
 */
export const DEFAULT_EXTRACTOR_CONFIG = {
  /** Maximum retry attempts */
  maxRetries: 3,
  /** Initial retry delay in ms */
  initialRetryDelayMs: 1000,
  /** Retry delay multiplier (exponential backoff) */
  retryMultiplier: 2,
  /** Maximum retry delay in ms */
  maxRetryDelayMs: 10000,
  /** Request timeout in ms */
  timeoutMs: 60000,
  /** Vision detail level */
  visionDetail: 'high' as const,
  /** Maximum tokens for response */
  maxTokens: 4000,
  /** Temperature for generation (0 for deterministic) */
  temperature: 0,
  /** Default model */
  model: 'gpt-4o',
  /** Fallback model if primary rate limited */
  fallbackModel: 'gpt-4o-mini',
} as const;

/**
 * Cost per token for different models (in USD)
 * Updated as of Jan 2025
 */
export const MODEL_COSTS = {
  'gpt-4o': {
    input: 0.0025 / 1000,  // $2.50 per 1M input tokens
    output: 0.01 / 1000,   // $10 per 1M output tokens
    imageBase: 0.00255,    // Base cost for 512x512
    imageHigh: 0.00765,    // High detail cost
  },
  'gpt-4o-mini': {
    input: 0.00015 / 1000,
    output: 0.0006 / 1000,
    imageBase: 0.001275,
    imageHigh: 0.005525,
  },
  'gpt-4-turbo': {
    input: 0.01 / 1000,
    output: 0.03 / 1000,
    imageBase: 0.00255,
    imageHigh: 0.00765,
  },
} as const;

// =============================================================================
// TYPES
// =============================================================================

export interface ExtractorConfig {
  maxRetries?: number;
  initialRetryDelayMs?: number;
  retryMultiplier?: number;
  maxRetryDelayMs?: number;
  timeoutMs?: number;
  visionDetail?: 'low' | 'high' | 'auto';
  maxTokens?: number;
  temperature?: number;
  model?: string;
  fallbackModel?: string;
}

export interface ExtractionMetrics {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  latencyMs: number;
  retryCount: number;
  modelUsed: string;
  imageCount: number;
}

export interface ExtractorLogger {
  info: (message: string, meta?: Record<string, any>) => void;
  warn: (message: string, meta?: Record<string, any>) => void;
  error: (message: string, meta?: Record<string, any>) => void;
  debug: (message: string, meta?: Record<string, any>) => void;
}

/**
 * Message format for OpenAI Chat API
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ChatMessageContent[];
}

export interface ChatMessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail: 'low' | 'high' | 'auto';
  };
}

/**
 * OpenAI-compatible API response
 */
export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// =============================================================================
// BASE EXTRACTOR CLASS
// =============================================================================

/**
 * Abstract base class for Vision AI extractors
 */
export abstract class BaseExtractor<TInput, TOutput> {
  protected config: Required<ExtractorConfig>;
  protected logger: ExtractorLogger;
  protected circuitBreakerFailures: number = 0;
  protected circuitBreakerLastFailure: number = 0;
  protected readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  protected readonly CIRCUIT_BREAKER_RESET_MS = 60000;

  constructor(config?: ExtractorConfig, logger?: ExtractorLogger) {
    this.config = {
      ...DEFAULT_EXTRACTOR_CONFIG,
      ...config,
    } as Required<ExtractorConfig>;

    this.logger = logger || this.createDefaultLogger();
  }

  /**
   * Create default console logger
   */
  private createDefaultLogger(): ExtractorLogger {
    const formatMeta = (meta?: Record<string, any>) =>
      meta ? ` ${JSON.stringify(meta)}` : '';

    return {
      info: (msg, meta) => console.log(`[INFO] ${msg}${formatMeta(meta)}`),
      warn: (msg, meta) => console.warn(`[WARN] ${msg}${formatMeta(meta)}`),
      error: (msg, meta) => console.error(`[ERROR] ${msg}${formatMeta(meta)}`),
      debug: (msg, meta) => console.debug(`[DEBUG] ${msg}${formatMeta(meta)}`),
    };
  }

  /**
   * Abstract method to build the system prompt
   */
  protected abstract buildSystemPrompt(input: TInput): string;

  /**
   * Abstract method to build the user prompt
   */
  protected abstract buildUserPrompt(input: TInput): string;

  /**
   * Abstract method to validate and parse the response
   */
  protected abstract parseResponse(response: string): TOutput;

  /**
   * Abstract method to extract images from input
   */
  protected abstract getImages(input: TInput): string[];

  /**
   * Check circuit breaker status
   */
  protected isCircuitBreakerOpen(): boolean {
    if (this.circuitBreakerFailures < this.CIRCUIT_BREAKER_THRESHOLD) {
      return false;
    }

    const timeSinceLastFailure = Date.now() - this.circuitBreakerLastFailure;
    if (timeSinceLastFailure > this.CIRCUIT_BREAKER_RESET_MS) {
      // Reset circuit breaker after timeout
      this.circuitBreakerFailures = 0;
      return false;
    }

    return true;
  }

  /**
   * Record a failure for circuit breaker
   */
  protected recordFailure(): void {
    this.circuitBreakerFailures++;
    this.circuitBreakerLastFailure = Date.now();
  }

  /**
   * Reset circuit breaker on success
   */
  protected resetCircuitBreaker(): void {
    this.circuitBreakerFailures = 0;
  }

  /**
   * Calculate delay for retry with exponential backoff
   */
  protected calculateRetryDelay(attempt: number): number {
    const delay = this.config.initialRetryDelayMs *
      Math.pow(this.config.retryMultiplier, attempt);
    return Math.min(delay, this.config.maxRetryDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Build messages array for API call
   */
  protected buildMessages(input: TInput): ChatMessage[] {
    const systemPrompt = this.buildSystemPrompt(input);
    const userPrompt = this.buildUserPrompt(input);
    const images = this.getImages(input);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Build user message with text and images
    const userContent: ChatMessageContent[] = [
      { type: 'text', text: userPrompt },
    ];

    for (const imageUrl of images) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: imageUrl,
          detail: this.config.visionDetail,
        },
      });
    }

    messages.push({ role: 'user', content: userContent });

    return messages;
  }

  /**
   * Estimate cost for the extraction
   */
  protected estimateCost(
    inputTokens: number,
    outputTokens: number,
    imageCount: number,
    model: string
  ): number {
    const costs = MODEL_COSTS[model as keyof typeof MODEL_COSTS] || MODEL_COSTS['gpt-4o'];
    const imageCost = this.config.visionDetail === 'high'
      ? costs.imageHigh
      : costs.imageBase;

    return (
      inputTokens * costs.input +
      outputTokens * costs.output +
      imageCount * imageCost
    );
  }

  /**
   * Create hash of input for logging (privacy-preserving)
   */
  protected hashInput(input: TInput): string {
    const str = JSON.stringify(input).slice(0, 100);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  /**
   * Main extraction method with retry logic
   *
   * NOTE: This is a MOCK implementation.
   * In production, replace callAPI with actual OpenAI API call.
   */
  async extract(input: TInput): Promise<{
    success: boolean;
    data: TOutput | null;
    error?: string;
    metrics: ExtractionMetrics;
  }> {
    const startTime = Date.now();
    const inputHash = this.hashInput(input);
    const images = this.getImages(input);

    this.logger.info('Starting extraction', {
      inputHash,
      imageCount: images.length,
      model: this.config.model,
    });

    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      this.logger.warn('Circuit breaker open, rejecting request', { inputHash });
      return {
        success: false,
        data: null,
        error: 'Service temporarily unavailable (circuit breaker open)',
        metrics: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
          latencyMs: Date.now() - startTime,
          retryCount: 0,
          modelUsed: this.config.model,
          imageCount: images.length,
        },
      };
    }

    let lastError: Error | null = null;
    let retryCount = 0;
    let modelUsed = this.config.model;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.calculateRetryDelay(attempt - 1);
          this.logger.info(`Retry attempt ${attempt}/${this.config.maxRetries}`, {
            inputHash,
            delayMs: delay,
          });
          await this.sleep(delay);
          retryCount++;
        }

        // Build messages
        const messages = this.buildMessages(input);

        // Call API (MOCK - replace with actual implementation)
        const response = await this.callAPI(messages, modelUsed);

        // Parse response
        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('Empty response from API');
        }

        // Parse and validate
        const data = this.parseResponse(content);

        // Calculate metrics
        const metrics: ExtractionMetrics = {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
          estimatedCost: this.estimateCost(
            response.usage.prompt_tokens,
            response.usage.completion_tokens,
            images.length,
            modelUsed
          ),
          latencyMs: Date.now() - startTime,
          retryCount,
          modelUsed,
          imageCount: images.length,
        };

        this.logger.info('Extraction successful', {
          inputHash,
          ...metrics,
        });

        this.resetCircuitBreaker();

        return {
          success: true,
          data,
          metrics,
        };
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Extraction attempt ${attempt + 1} failed`, {
          inputHash,
          error: lastError.message,
        });

        // Check if rate limited and should switch to fallback
        if (this.isRateLimitError(lastError) && modelUsed !== this.config.fallbackModel) {
          this.logger.info('Switching to fallback model', {
            from: modelUsed,
            to: this.config.fallbackModel,
          });
          modelUsed = this.config.fallbackModel;
        }
      }
    }

    // All retries exhausted
    this.recordFailure();
    this.logger.error('Extraction failed after all retries', {
      inputHash,
      error: lastError?.message,
      retryCount,
    });

    return {
      success: false,
      data: null,
      error: lastError?.message || 'Unknown error',
      metrics: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        latencyMs: Date.now() - startTime,
        retryCount,
        modelUsed,
        imageCount: images.length,
      },
    };
  }

  /**
   * Check if error is a rate limit error
   */
  protected isRateLimitError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('too many requests')
    );
  }

  /**
   * MOCK API call - replace with actual OpenAI implementation
   *
   * Production implementation would look like:
   * ```typescript
   * protected async callAPI(messages: ChatMessage[], model: string): Promise<OpenAIResponse> {
   *   const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
   *
   *   const response = await openai.chat.completions.create({
   *     model,
   *     messages,
   *     response_format: { type: 'json_object' },
   *     max_tokens: this.config.maxTokens,
   *     temperature: this.config.temperature,
   *   });
   *
   *   return response as OpenAIResponse;
   * }
   * ```
   */
  protected async callAPI(messages: ChatMessage[], model: string): Promise<OpenAIResponse> {
    // MOCK IMPLEMENTATION - DO NOT USE IN PRODUCTION
    this.logger.debug('MOCK API call', { model, messageCount: messages.length });

    // Simulate API latency
    await this.sleep(500 + Math.random() * 500);

    // Return mock response structure
    // In production, this would be the actual OpenAI API response
    return {
      id: `mock-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: this.getMockResponse(),
        },
        finish_reason: 'stop',
      }],
      usage: {
        prompt_tokens: 1500,
        completion_tokens: 800,
        total_tokens: 2300,
      },
    };
  }

  /**
   * Get mock response - override in subclasses for specific mock data
   */
  protected getMockResponse(): string {
    return JSON.stringify({
      success: true,
      message: 'Mock response - implement callAPI for real extraction',
    });
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Validate that an image is valid base64 or URL
 */
export function validateImageInput(image: string): {
  valid: boolean;
  type: 'base64' | 'url' | 'invalid';
  error?: string;
} {
  // Check if URL
  if (image.startsWith('http://') || image.startsWith('https://')) {
    try {
      new URL(image);
      return { valid: true, type: 'url' };
    } catch {
      return { valid: false, type: 'invalid', error: 'Invalid URL format' };
    }
  }

  // Check if data URL
  if (image.startsWith('data:image/')) {
    const matches = image.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/);
    if (matches) {
      return { valid: true, type: 'base64' };
    }
    return { valid: false, type: 'invalid', error: 'Invalid data URL format' };
  }

  // Check if raw base64 (try to detect)
  if (/^[A-Za-z0-9+/]+=*$/.test(image) && image.length > 100) {
    return { valid: true, type: 'base64' };
  }

  return { valid: false, type: 'invalid', error: 'Image must be a URL or base64 encoded' };
}

/**
 * Prepare image for API call (ensure correct format)
 */
export function prepareImageForAPI(image: string, mimeType: string = 'image/jpeg'): string {
  // Already a URL
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }

  // Already a data URL
  if (image.startsWith('data:image/')) {
    return image;
  }

  // Raw base64 - convert to data URL
  return `data:${mimeType};base64,${image}`;
}

/**
 * Calculate approximate token count for text
 * Rough estimate: 1 token ~ 4 characters for English
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate image token cost based on dimensions
 * GPT-4o: 85 tokens base + 170 tokens per 512x512 tile
 */
export function estimateImageTokens(
  width: number,
  height: number,
  detail: 'low' | 'high'
): number {
  if (detail === 'low') {
    return 85;
  }

  // High detail: scale down if larger than 2048x2048
  const maxDim = Math.max(width, height);
  if (maxDim > 2048) {
    const scale = 2048 / maxDim;
    width = Math.floor(width * scale);
    height = Math.floor(height * scale);
  }

  // Scale to fit in 768px on shortest side
  const minDim = Math.min(width, height);
  if (minDim > 768) {
    const scale = 768 / minDim;
    width = Math.floor(width * scale);
    height = Math.floor(height * scale);
  }

  // Calculate tiles
  const tilesX = Math.ceil(width / 512);
  const tilesY = Math.ceil(height / 512);
  const totalTiles = tilesX * tilesY;

  return 85 + (170 * totalTiles);
}
