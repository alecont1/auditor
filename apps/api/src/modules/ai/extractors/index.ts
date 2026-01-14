/**
 * AI Extractors Index
 *
 * Exports all extractor classes and utilities for Vision AI data extraction.
 */

// Base extractor and utilities
export {
  BaseExtractor,
  DEFAULT_EXTRACTOR_CONFIG,
  MODEL_COSTS,
  validateImageInput,
  prepareImageForAPI,
  estimateTokenCount,
  estimateImageTokens,
} from './base-extractor';

export type {
  ExtractorConfig,
  ExtractionMetrics,
  ExtractorLogger,
  ChatMessage,
  ChatMessageContent,
  OpenAIResponse,
} from './base-extractor';

// Thermography extractors
export {
  ThermalImageExtractor,
  VisiblePhotoExtractor,
  CertificateExtractor,
  ThermographyBatchExtractor,
  createThermographyExtractor,
  createBatchExtractor,
} from './thermography-extractor';

export type {
  ThermographyExtractionInput,
  BatchThermographyInput,
} from './thermography-extractor';

// Claude Vision Extractor (real API integration)
export {
  extractFromImage,
  extractFromMultipleImages,
  extractFromPDFPages,
  toValidatorFormat,
} from './claude-extractor';

export type {
  ExtractionResult,
  ImageType,
} from './claude-extractor';
