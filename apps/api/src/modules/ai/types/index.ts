/**
 * AI Types Index
 *
 * Exports all type definitions for the AI module.
 */

// Extraction validation types (existing)
export type {
  Inconsistencia,
  CertificadoData,
  RelatorioData,
  FotosData,
  MedicaoData,
  DadosExtraidos,
  ResultadoValidacao,
} from './extraction.types';

// Vision extraction types (new)
export type {
  // Base types
  ExtractedField,
  OptionalExtractedField,

  // Thermography types
  EquipmentIdentification,
  ThermalCameraParameters,
  ThermalReadings,
  InstrumentIdentification,
  ThermographyImageExtraction,
  DisplayReading,

  // Certificate types
  CalibrationCertificateExtraction,

  // Aggregated results
  ThermographyExtractionResult,

  // API types
  VisionExtractionResponse,
  BatchExtractionRequest,
  BatchExtractionResponse,
} from './vision-extraction.types';
