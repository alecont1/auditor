/**
 * AI Module Index
 *
 * Central export for all AI-related functionality including:
 * - Vision AI extractors for image analysis
 * - Prompt templates for different test types
 * - Type definitions for extraction results
 * - Cross-validation utilities
 *
 * @module ai
 * @version 1.0.0
 */

// =============================================================================
// EXTRACTORS
// =============================================================================

export {
  // Base
  BaseExtractor,
  DEFAULT_EXTRACTOR_CONFIG,
  MODEL_COSTS,
  validateImageInput,
  prepareImageForAPI,
  estimateTokenCount,
  estimateImageTokens,

  // Thermography
  ThermalImageExtractor,
  VisiblePhotoExtractor,
  CertificateExtractor,
  ThermographyBatchExtractor,
  createThermographyExtractor,
  createBatchExtractor,
} from './extractors/index.js';

export type {
  ExtractorConfig,
  ExtractionMetrics,
  ExtractorLogger,
  ChatMessage,
  ChatMessageContent,
  OpenAIResponse,
  ThermographyExtractionInput,
  BatchThermographyInput,
} from './extractors/index.js';

// =============================================================================
// PROMPTS
// =============================================================================

export {
  // System prompts
  THERMAL_IMAGE_SYSTEM_PROMPT,
  VISIBLE_PHOTO_SYSTEM_PROMPT,
  CERTIFICATE_SYSTEM_PROMPT,

  // User prompt builders
  buildThermalImageUserPrompt,
  buildVisiblePhotoUserPrompt,
  buildCertificateUserPrompt,

  // Examples and schemas
  THERMAL_IMAGE_FEW_SHOT_EXAMPLE,
  THERMAL_EXTRACTION_JSON_SCHEMA,

  // Versioning
  PROMPT_VERSIONS,
  getPromptMetadata,
} from './prompts/index.js';

// =============================================================================
// TYPES
// =============================================================================

export type {
  // Validation types
  Inconsistencia,
  CertificadoData,
  RelatorioData,
  FotosData,
  MedicaoData,
  DadosExtraidos,
  ResultadoValidacao,

  // Vision extraction types
  ExtractedField,
  OptionalExtractedField,
  EquipmentIdentification,
  ThermalCameraParameters,
  ThermalReadings,
  InstrumentIdentification,
  ThermographyImageExtraction,
  DisplayReading,
  CalibrationCertificateExtraction,
  ThermographyExtractionResult,
  VisionExtractionResponse,
  BatchExtractionRequest,
  BatchExtractionResponse,
} from './types/index.js';

// =============================================================================
// VALIDATORS
// =============================================================================

export {
  validarCruzado,
  gerarResultadoValidacao,
  converterParaDadosExtraidos,
} from './validators/cross-validator.js';
