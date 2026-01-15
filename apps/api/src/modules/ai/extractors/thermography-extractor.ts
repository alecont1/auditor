/**
 * Thermography Extractor
 *
 * Specialized extractor for thermography report images including:
 * - Thermal images with temperature readings
 * - Visible photos with equipment tags/serials
 * - Calibration certificates
 *
 * @version 1.0.0
 */

import {
  BaseExtractor,
  type ExtractorConfig,
  type ExtractorLogger,
  validateImageInput,
  prepareImageForAPI,
} from './base-extractor.js';

import type {
  ThermographyImageExtraction,
  EquipmentIdentification,
  ThermalCameraParameters,
  ThermalReadings,
  InstrumentIdentification,
  OptionalExtractedField,
  ExtractedField,
  CalibrationCertificateExtraction,
  ThermographyExtractionResult,
} from '../types/vision-extraction.types.js';

import {
  THERMAL_IMAGE_SYSTEM_PROMPT,
  VISIBLE_PHOTO_SYSTEM_PROMPT,
  CERTIFICATE_SYSTEM_PROMPT,
  buildThermalImageUserPrompt,
  buildVisiblePhotoUserPrompt,
  buildCertificateUserPrompt,
  THERMAL_IMAGE_FEW_SHOT_EXAMPLE,
} from '../prompts/thermography-extraction.prompts.js';

// =============================================================================
// TYPES
// =============================================================================

export interface ThermographyExtractionInput {
  /** Image data (base64 or URL) */
  image: string;
  /** Type of image for prompt selection */
  imageType: 'thermal' | 'visible' | 'certificate';
  /** Page number in the PDF */
  pageNumber?: number;
  /** Expected equipment TAG for cross-validation */
  expectedTag?: string;
  /** Expected serial for cross-validation */
  expectedSerial?: string;
  /** Additional context */
  context?: {
    reportSection?: string;
    instrumentModel?: string;
  };
}

export interface BatchThermographyInput {
  reportId: string;
  images: ThermographyExtractionInput[];
  extractedText?: string;
}

// =============================================================================
// THERMAL IMAGE EXTRACTOR
// =============================================================================

/**
 * Extractor for thermal images
 */
export class ThermalImageExtractor extends BaseExtractor<
  ThermographyExtractionInput,
  ThermographyImageExtraction
> {
  constructor(config?: ExtractorConfig, logger?: ExtractorLogger) {
    super(config, logger);
  }

  protected buildSystemPrompt(_input: ThermographyExtractionInput): string {
    return THERMAL_IMAGE_SYSTEM_PROMPT;
  }

  protected buildUserPrompt(input: ThermographyExtractionInput): string {
    return buildThermalImageUserPrompt({
      pageNumber: input.pageNumber,
      reportSection: input.context?.reportSection,
      expectedEquipmentTag: input.expectedTag,
    });
  }

  protected getImages(input: ThermographyExtractionInput): string[] {
    const validation = validateImageInput(input.image);
    if (!validation.valid) {
      throw new Error(`Invalid image: ${validation.error}`);
    }
    return [prepareImageForAPI(input.image)];
  }

  protected parseResponse(response: string): ThermographyImageExtraction {
    try {
      const parsed = JSON.parse(response);
      return this.validateAndNormalize(parsed);
    } catch (error) {
      throw new Error(`Failed to parse response: ${(error as Error).message}`);
    }
  }

  /**
   * Validate and normalize the parsed response
   */
  private validateAndNormalize(data: any): ThermographyImageExtraction {
    // Create default structure
    const result: ThermographyImageExtraction = {
      equipment: this.normalizeEquipment(data.equipment),
      cameraParameters: this.normalizeCameraParams(data.cameraParameters),
      readings: this.normalizeReadings(data.readings),
      instrument: this.normalizeInstrument(data.instrument),
      timestamp: this.normalizeOptionalField(data.timestamp),
      overallConfidence: this.normalizeConfidence(data.overallConfidence),
      warnings: Array.isArray(data.warnings) ? data.warnings : [],
    };

    return result;
  }

  private normalizeEquipment(equipment: any): EquipmentIdentification {
    return {
      tag: this.normalizeOptionalField(equipment?.tag),
      serial: this.normalizeOptionalField(equipment?.serial),
      description: this.normalizeOptionalField(equipment?.description),
      location: this.normalizeOptionalField(equipment?.location),
    };
  }

  private normalizeCameraParams(params: any): ThermalCameraParameters {
    return {
      ambientTemperature: this.normalizeOptionalField(params?.ambientTemperature),
      reflectedTemperature: this.normalizeOptionalField(params?.reflectedTemperature),
      emissivity: this.normalizeOptionalField(params?.emissivity),
      distance: this.normalizeOptionalField(params?.distance),
      humidity: this.normalizeOptionalField(params?.humidity),
    };
  }

  private normalizeReadings(readings: any): ThermalReadings {
    const spotReadings: Array<{ label: string; temperature: ExtractedField<number> }> = [];

    if (Array.isArray(readings?.spotReadings)) {
      for (const spot of readings.spotReadings) {
        if (spot?.label && spot?.temperature?.value != null) {
          spotReadings.push({
            label: String(spot.label),
            temperature: {
              value: Number(spot.temperature.value),
              confidence: this.normalizeConfidence(spot.temperature.confidence),
              source: String(spot.temperature.source || 'spot_reading'),
            },
          });
        }
      }
    }

    return {
      maxTemperature: this.normalizeOptionalField(readings?.maxTemperature),
      minTemperature: this.normalizeOptionalField(readings?.minTemperature),
      avgTemperature: this.normalizeOptionalField(readings?.avgTemperature),
      spotReadings,
      deltaT: this.normalizeOptionalField(readings?.deltaT),
    };
  }

  private normalizeInstrument(instrument: any): InstrumentIdentification {
    return {
      serialNumber: this.normalizeOptionalField(instrument?.serialNumber),
      model: this.normalizeOptionalField(instrument?.model),
      manufacturer: this.normalizeOptionalField(instrument?.manufacturer),
    };
  }

  private normalizeOptionalField<T>(field: any): OptionalExtractedField<T> {
    if (!field || field.value === null || field.value === undefined) {
      return {
        value: null,
        confidence: 0,
        source: 'not_found',
        reason: 'Field not found in image',
      };
    }

    return {
      value: field.value as T,
      confidence: this.normalizeConfidence(field.confidence),
      source: String(field.source || 'extracted'),
    };
  }

  private normalizeConfidence(value: any): number {
    if (typeof value !== 'number') return 0;
    return Math.max(0, Math.min(1, value));
  }

  /**
   * Get mock response for testing
   */
  protected getMockResponse(): string {
    // Return the few-shot example for consistent mock data
    return JSON.stringify(THERMAL_IMAGE_FEW_SHOT_EXAMPLE.expectedOutput);
  }
}

// =============================================================================
// VISIBLE PHOTO EXTRACTOR
// =============================================================================

/**
 * Extractor for visible photos (nameplates, displays)
 */
export class VisiblePhotoExtractor extends BaseExtractor<
  ThermographyExtractionInput,
  { equipment: EquipmentIdentification; displayReadings: any[]; warnings: string[] }
> {
  constructor(config?: ExtractorConfig, logger?: ExtractorLogger) {
    super(config, logger);
  }

  protected buildSystemPrompt(_input: ThermographyExtractionInput): string {
    return VISIBLE_PHOTO_SYSTEM_PROMPT;
  }

  protected buildUserPrompt(input: ThermographyExtractionInput): string {
    return buildVisiblePhotoUserPrompt({
      pageNumber: input.pageNumber,
      expectedTag: input.expectedTag,
      photoType: 'general',
    });
  }

  protected getImages(input: ThermographyExtractionInput): string[] {
    const validation = validateImageInput(input.image);
    if (!validation.valid) {
      throw new Error(`Invalid image: ${validation.error}`);
    }
    return [prepareImageForAPI(input.image)];
  }

  protected parseResponse(response: string): {
    equipment: EquipmentIdentification;
    displayReadings: any[];
    warnings: string[];
  } {
    try {
      const parsed = JSON.parse(response);
      return {
        equipment: {
          tag: this.normalizeField(parsed.equipment?.tag),
          serial: this.normalizeField(parsed.equipment?.serial),
          description: this.normalizeField(parsed.equipment?.description),
          location: this.normalizeField(parsed.equipment?.location),
        },
        displayReadings: Array.isArray(parsed.displayReadings)
          ? parsed.displayReadings
          : [],
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      };
    } catch (error) {
      throw new Error(`Failed to parse response: ${(error as Error).message}`);
    }
  }

  private normalizeField<T>(field: any): OptionalExtractedField<T> {
    if (!field || field.value === null || field.value === undefined) {
      return { value: null, confidence: 0, source: 'not_found', reason: 'Not found' };
    }
    return {
      value: field.value as T,
      confidence: Math.max(0, Math.min(1, field.confidence || 0)),
      source: String(field.source || 'extracted'),
    };
  }

  protected getMockResponse(): string {
    return JSON.stringify({
      equipment: {
        tag: { value: "PDU-B-02", confidence: 0.95, source: "nameplate" },
        serial: { value: "SN-2024-001234", confidence: 0.92, source: "label" },
        description: { value: null, confidence: 0, source: "not_found" },
        location: { value: "Data Hall B", confidence: 0.88, source: "header" },
      },
      displayReadings: [],
      warnings: [],
    });
  }
}

// =============================================================================
// CERTIFICATE EXTRACTOR
// =============================================================================

/**
 * Extractor for calibration certificates
 */
export class CertificateExtractor extends BaseExtractor<
  ThermographyExtractionInput,
  CalibrationCertificateExtraction
> {
  constructor(config?: ExtractorConfig, logger?: ExtractorLogger) {
    super(config, logger);
  }

  protected buildSystemPrompt(_input: ThermographyExtractionInput): string {
    return CERTIFICATE_SYSTEM_PROMPT;
  }

  protected buildUserPrompt(input: ThermographyExtractionInput): string {
    return buildCertificateUserPrompt({
      expectedSerial: input.expectedSerial,
      instrumentModel: input.context?.instrumentModel,
    });
  }

  protected getImages(input: ThermographyExtractionInput): string[] {
    const validation = validateImageInput(input.image);
    if (!validation.valid) {
      throw new Error(`Invalid image: ${validation.error}`);
    }
    return [prepareImageForAPI(input.image)];
  }

  protected parseResponse(response: string): CalibrationCertificateExtraction {
    try {
      const parsed = JSON.parse(response);
      return {
        certificateNumber: this.normalizeField(parsed.certificateNumber),
        instrumentSerial: this.normalizeField(parsed.instrumentSerial),
        instrumentModel: this.normalizeField(parsed.instrumentModel),
        calibrationDate: this.normalizeField(parsed.calibrationDate),
        expiryDate: this.normalizeField(parsed.expiryDate),
        laboratoryName: this.normalizeField(parsed.laboratoryName),
        accreditationNumber: this.normalizeField(parsed.accreditationNumber),
        overallConfidence: Math.max(0, Math.min(1, parsed.overallConfidence || 0)),
      };
    } catch (error) {
      throw new Error(`Failed to parse response: ${(error as Error).message}`);
    }
  }

  private normalizeField<T>(field: any): OptionalExtractedField<T> {
    if (!field || field.value === null || field.value === undefined) {
      return { value: null, confidence: 0, source: 'not_found', reason: 'Not found' };
    }
    return {
      value: field.value as T,
      confidence: Math.max(0, Math.min(1, field.confidence || 0)),
      source: String(field.source || 'extracted'),
    };
  }

  protected getMockResponse(): string {
    return JSON.stringify({
      certificateNumber: { value: "CAL-2024-78456", confidence: 0.98, source: "header" },
      instrumentSerial: { value: "63050178", confidence: 0.99, source: "instrument details" },
      instrumentModel: { value: "FLIR E96", confidence: 0.97, source: "instrument details" },
      calibrationDate: { value: "2024-01-15", confidence: 0.95, source: "dates section" },
      expiryDate: { value: "2025-01-15", confidence: 0.95, source: "dates section" },
      laboratoryName: { value: "Precision Calibration Labs", confidence: 0.92, source: "header" },
      accreditationNumber: { value: "A2LA 1234.56", confidence: 0.90, source: "footer" },
      overallConfidence: 0.95,
    });
  }
}

// =============================================================================
// BATCH THERMOGRAPHY EXTRACTOR
// =============================================================================

/**
 * Batch extractor that processes multiple images and merges results
 */
export class ThermographyBatchExtractor {
  private thermalExtractor: ThermalImageExtractor;
  private visibleExtractor: VisiblePhotoExtractor;
  private certificateExtractor: CertificateExtractor;
  private logger: ExtractorLogger;

  constructor(config?: ExtractorConfig, logger?: ExtractorLogger) {
    this.thermalExtractor = new ThermalImageExtractor(config, logger);
    this.visibleExtractor = new VisiblePhotoExtractor(config, logger);
    this.certificateExtractor = new CertificateExtractor(config, logger);
    this.logger = logger || {
      info: console.log,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };
  }

  /**
   * Process all images in a thermography report
   */
  async extractFromBatch(input: BatchThermographyInput): Promise<ThermographyExtractionResult> {
    const startTime = Date.now();

    this.logger.info('Starting batch extraction', {
      reportId: input.reportId,
      imageCount: input.images.length,
    });

    const thermalImages: ThermographyImageExtraction[] = [];
    const visiblePhotos: Array<{
      equipment: EquipmentIdentification;
      displayReadings: any[];
    }> = [];
    let calibrationCertificate: CalibrationCertificateExtraction | null = null;

    let totalTokens = 0;
    let totalCost = 0;
    let processedImages = 0;

    // Process each image based on type
    for (const imageInput of input.images) {
      try {
        switch (imageInput.imageType) {
          case 'thermal': {
            const result = await this.thermalExtractor.extract(imageInput);
            if (result.success && result.data) {
              thermalImages.push(result.data);
            }
            totalTokens += result.metrics.totalTokens;
            totalCost += result.metrics.estimatedCost;
            processedImages++;
            break;
          }

          case 'visible': {
            const result = await this.visibleExtractor.extract(imageInput);
            if (result.success && result.data) {
              visiblePhotos.push({
                equipment: result.data.equipment,
                displayReadings: result.data.displayReadings,
              });
            }
            totalTokens += result.metrics.totalTokens;
            totalCost += result.metrics.estimatedCost;
            processedImages++;
            break;
          }

          case 'certificate': {
            const result = await this.certificateExtractor.extract(imageInput);
            if (result.success && result.data) {
              calibrationCertificate = result.data;
            }
            totalTokens += result.metrics.totalTokens;
            totalCost += result.metrics.estimatedCost;
            processedImages++;
            break;
          }
        }
      } catch (error) {
        this.logger.warn('Failed to process image', {
          imageType: imageInput.imageType,
          pageNumber: imageInput.pageNumber,
          error: (error as Error).message,
        });
      }
    }

    // Merge equipment identification from all sources
    const mergedEquipment = this.mergeEquipmentIdentification(
      thermalImages,
      visiblePhotos
    );

    const result: ThermographyExtractionResult = {
      thermalImages,
      visiblePhotos,
      calibrationCertificate,
      mergedEquipment,
      metadata: {
        totalImages: input.images.length,
        processedImages,
        totalProcessingTimeMs: Date.now() - startTime,
        estimatedCost: totalCost,
        modelUsed: 'gpt-4o',
      },
    };

    this.logger.info('Batch extraction complete', {
      reportId: input.reportId,
      thermalCount: thermalImages.length,
      visibleCount: visiblePhotos.length,
      hasCertificate: !!calibrationCertificate,
      totalCost: totalCost.toFixed(4),
      processingTimeMs: result.metadata.totalProcessingTimeMs,
    });

    return result;
  }

  /**
   * Merge equipment identification from multiple sources
   * Uses highest confidence value for each field
   */
  private mergeEquipmentIdentification(
    thermalImages: ThermographyImageExtraction[],
    visiblePhotos: Array<{ equipment: EquipmentIdentification; displayReadings: any[] }>
  ): ThermographyExtractionResult['mergedEquipment'] {
    const sources: string[] = [];

    // Collect all TAG candidates with confidence
    const tagCandidates: Array<{ value: string; confidence: number; source: string }> = [];
    const serialCandidates: Array<{ value: string; confidence: number; source: string }> = [];

    // From thermal images
    for (let i = 0; i < thermalImages.length; i++) {
      const eq = thermalImages[i].equipment;
      if (eq.tag.value !== null && 'confidence' in eq.tag) {
        tagCandidates.push({
          value: eq.tag.value,
          confidence: eq.tag.confidence,
          source: `thermal_image_${i + 1}`,
        });
        sources.push(`thermal_image_${i + 1}`);
      }
      if (eq.serial.value !== null && 'confidence' in eq.serial) {
        serialCandidates.push({
          value: eq.serial.value,
          confidence: eq.serial.confidence,
          source: `thermal_image_${i + 1}`,
        });
      }
    }

    // From visible photos
    for (let i = 0; i < visiblePhotos.length; i++) {
      const eq = visiblePhotos[i].equipment;
      if (eq.tag.value !== null && 'confidence' in eq.tag) {
        tagCandidates.push({
          value: eq.tag.value,
          confidence: eq.tag.confidence,
          source: `visible_photo_${i + 1}`,
        });
        sources.push(`visible_photo_${i + 1}`);
      }
      if (eq.serial.value !== null && 'confidence' in eq.serial) {
        serialCandidates.push({
          value: eq.serial.value,
          confidence: eq.serial.confidence,
          source: `visible_photo_${i + 1}`,
        });
      }
    }

    // Select best TAG (highest confidence)
    const bestTag = tagCandidates.length > 0
      ? tagCandidates.reduce((best, current) =>
          current.confidence > best.confidence ? current : best
        )
      : null;

    // Select best serial (highest confidence)
    const bestSerial = serialCandidates.length > 0
      ? serialCandidates.reduce((best, current) =>
          current.confidence > best.confidence ? current : best
        )
      : null;

    return {
      tag: bestTag
        ? { value: bestTag.value, confidence: bestTag.confidence, source: bestTag.source }
        : { value: null, confidence: 0, source: 'not_found', reason: 'No TAG found in any image' },
      serial: bestSerial
        ? { value: bestSerial.value, confidence: bestSerial.confidence, source: bestSerial.source }
        : { value: null, confidence: 0, source: 'not_found', reason: 'No serial found in any image' },
      sources: Array.from(new Set(sources)),
    };
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a thermography extractor based on image type
 */
export function createThermographyExtractor(
  imageType: 'thermal' | 'visible' | 'certificate',
  config?: ExtractorConfig,
  logger?: ExtractorLogger
) {
  switch (imageType) {
    case 'thermal':
      return new ThermalImageExtractor(config, logger);
    case 'visible':
      return new VisiblePhotoExtractor(config, logger);
    case 'certificate':
      return new CertificateExtractor(config, logger);
    default:
      throw new Error(`Unknown image type: ${imageType}`);
  }
}

/**
 * Create a batch extractor for processing multiple images
 */
export function createBatchExtractor(
  config?: ExtractorConfig,
  logger?: ExtractorLogger
): ThermographyBatchExtractor {
  return new ThermographyBatchExtractor(config, logger);
}
