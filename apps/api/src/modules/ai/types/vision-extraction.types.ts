/**
 * Vision AI Extraction Types
 *
 * These types define the structure of data extracted from images using GPT Vision.
 * Each extracted field includes a confidence score and source tracking.
 */

// =============================================================================
// BASE TYPES
// =============================================================================

/**
 * Every extracted field includes metadata about extraction quality
 */
export interface ExtractedField<T> {
  /** The extracted value */
  value: T;
  /** Confidence score from 0 to 1 */
  confidence: number;
  /** Source of extraction: which image or page */
  source: string;
  /** Page number in the PDF (if applicable) */
  page?: number;
  /** Image index in the request (0-based) */
  imageIndex?: number;
  /** Bounding box of the extracted element (normalized 0-1) */
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Result of attempting to extract a field that may not be present
 */
export type OptionalExtractedField<T> = ExtractedField<T> | {
  value: null;
  confidence: 0;
  source: 'not_found';
  reason: string;
};

// =============================================================================
// THERMOGRAPHY SPECIFIC TYPES
// =============================================================================

/**
 * Equipment identification extracted from thermal images or visible photos
 */
export interface EquipmentIdentification {
  /** Equipment TAG (e.g., "PDU-A-01", "SWBD-B-03") */
  tag: OptionalExtractedField<string>;
  /** Serial number of the equipment */
  serial: OptionalExtractedField<string>;
  /** Description or name of the equipment */
  description: OptionalExtractedField<string>;
  /** Location or area */
  location: OptionalExtractedField<string>;
}

/**
 * Thermal camera parameters extracted from the thermal image overlay
 */
export interface ThermalCameraParameters {
  /** Ambient/atmospheric temperature (Tatm) */
  ambientTemperature: OptionalExtractedField<number>;
  /** Reflected apparent temperature (Trefl) */
  reflectedTemperature: OptionalExtractedField<number>;
  /** Emissivity setting (epsilon) */
  emissivity: OptionalExtractedField<number>;
  /** Distance to target in meters */
  distance: OptionalExtractedField<number>;
  /** Relative humidity percentage */
  humidity: OptionalExtractedField<number>;
}

/**
 * Temperature readings from thermal image
 */
export interface ThermalReadings {
  /** Maximum temperature in the image (Sp1 or max marker) */
  maxTemperature: OptionalExtractedField<number>;
  /** Minimum temperature in the image */
  minTemperature: OptionalExtractedField<number>;
  /** Average temperature (if available) */
  avgTemperature: OptionalExtractedField<number>;
  /** Spot temperature readings (Sp1, Sp2, etc.) */
  spotReadings: Array<{
    label: string;
    temperature: ExtractedField<number>;
  }>;
  /** Delta T between hottest and reference point */
  deltaT: OptionalExtractedField<number>;
}

/**
 * Instrument/camera identification from thermal image or certificate
 */
export interface InstrumentIdentification {
  /** Camera serial number */
  serialNumber: OptionalExtractedField<string>;
  /** Camera model (e.g., "FLIR E96", "FLUKE Ti480") */
  model: OptionalExtractedField<string>;
  /** Manufacturer */
  manufacturer: OptionalExtractedField<string>;
}

/**
 * Complete extraction result for a thermography image
 */
export interface ThermographyImageExtraction {
  /** Equipment identification from the image */
  equipment: EquipmentIdentification;
  /** Thermal camera parameters */
  cameraParameters: ThermalCameraParameters;
  /** Temperature readings */
  readings: ThermalReadings;
  /** Instrument/camera info if visible */
  instrument: InstrumentIdentification;
  /** Image timestamp if visible */
  timestamp: OptionalExtractedField<string>;
  /** Overall extraction quality score (0-1) */
  overallConfidence: number;
  /** Any warnings or notes about the extraction */
  warnings: string[];
}

/**
 * Display reading extracted from an instrument photo
 */
export interface DisplayReading {
  /** The numeric value shown on display */
  value: ExtractedField<number>;
  /** Unit displayed (C, F, ohm, etc.) */
  unit: OptionalExtractedField<string>;
  /** Type of reading (temperature, resistance, etc.) */
  readingType: string;
}

// =============================================================================
// CALIBRATION CERTIFICATE TYPES
// =============================================================================

/**
 * Data extracted from calibration certificate images
 */
export interface CalibrationCertificateExtraction {
  /** Certificate number */
  certificateNumber: OptionalExtractedField<string>;
  /** Instrument serial number on certificate */
  instrumentSerial: OptionalExtractedField<string>;
  /** Instrument model on certificate */
  instrumentModel: OptionalExtractedField<string>;
  /** Calibration date */
  calibrationDate: OptionalExtractedField<string>;
  /** Expiry/due date */
  expiryDate: OptionalExtractedField<string>;
  /** Calibration laboratory name */
  laboratoryName: OptionalExtractedField<string>;
  /** Accreditation number (e.g., A2LA, UKAS) */
  accreditationNumber: OptionalExtractedField<string>;
  /** Overall extraction confidence */
  overallConfidence: number;
}

// =============================================================================
// AGGREGATED EXTRACTION RESULT
// =============================================================================

/**
 * Complete extraction result from all images in a thermography report
 */
export interface ThermographyExtractionResult {
  /** Extraction from thermal images */
  thermalImages: ThermographyImageExtraction[];
  /** Extraction from visible/regular photos */
  visiblePhotos: {
    equipment: EquipmentIdentification;
    displayReadings: DisplayReading[];
  }[];
  /** Extraction from calibration certificate */
  calibrationCertificate: CalibrationCertificateExtraction | null;
  /** Merged/reconciled equipment identification */
  mergedEquipment: {
    tag: OptionalExtractedField<string>;
    serial: OptionalExtractedField<string>;
    sources: string[];
  };
  /** Processing metadata */
  metadata: {
    totalImages: number;
    processedImages: number;
    totalProcessingTimeMs: number;
    estimatedCost: number;
    modelUsed: string;
  };
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * JSON schema for GPT Vision response validation
 */
export interface VisionExtractionResponse {
  success: boolean;
  data: ThermographyImageExtraction | null;
  error?: string;
  rawResponse?: string;
}

/**
 * Batch extraction request
 */
export interface BatchExtractionRequest {
  /** Report ID for tracking */
  reportId: string;
  /** Test type for prompt selection */
  testType: 'THERMOGRAPHY' | 'GROUNDING' | 'MEGGER';
  /** Images to process (base64 or URLs) */
  images: Array<{
    data: string;
    type: 'thermal' | 'visible' | 'certificate' | 'unknown';
    pageNumber?: number;
  }>;
  /** Previously extracted text from OCR/PDF parsing */
  extractedText?: string;
  /** Additional context for extraction */
  context?: Record<string, any>;
}

/**
 * Batch extraction response
 */
export interface BatchExtractionResponse {
  success: boolean;
  result: ThermographyExtractionResult | null;
  errors: Array<{
    imageIndex: number;
    error: string;
  }>;
  metadata: {
    totalTokens: number;
    totalCost: number;
    processingTimeMs: number;
  };
}
