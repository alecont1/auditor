/**
 * AI Prompts Index
 *
 * Exports all prompt templates and utilities for Vision AI extraction.
 */

// Thermography prompts
export {
  // System prompts
  THERMAL_IMAGE_SYSTEM_PROMPT,
  VISIBLE_PHOTO_SYSTEM_PROMPT,
  CERTIFICATE_SYSTEM_PROMPT,

  // User prompt builders
  buildThermalImageUserPrompt,
  buildVisiblePhotoUserPrompt,
  buildCertificateUserPrompt,

  // Few-shot examples
  THERMAL_IMAGE_FEW_SHOT_EXAMPLE,

  // JSON schema for validation
  THERMAL_EXTRACTION_JSON_SCHEMA,

  // Versioning
  PROMPT_VERSIONS,
  getPromptMetadata,
} from './thermography-extraction.prompts.js';
