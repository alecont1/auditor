import { prisma } from '../../lib/prisma.js';
import { consumeTokens } from '../tokens/tokens.service.js';
import { validarCruzado, converterParaDadosExtraidos } from '../ai/validators/cross-validator.js';
import { getRAGService } from '../rag/index.js';

/**
 * Compare two dates in a timezone-neutral way (date-only comparison).
 * Uses UTC date strings (YYYY-MM-DD) to avoid timezone edge cases.
 * This ensures that a calibration expiring "today" is correctly identified
 * regardless of the server's timezone.
 */
function compareDatesTimezoneNeutral(date1: Date | string, date2: Date | string): number {
  // Convert to Date objects if strings
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

  // Extract just the date portion in UTC to avoid timezone issues
  const utc1 = Date.UTC(d1.getUTCFullYear(), d1.getUTCMonth(), d1.getUTCDate());
  const utc2 = Date.UTC(d2.getUTCFullYear(), d2.getUTCMonth(), d2.getUTCDate());

  return utc1 - utc2; // negative if date1 < date2, 0 if equal, positive if date1 > date2
}

/**
 * Check if a calibration certificate is expired on the test date.
 * Uses timezone-neutral comparison to avoid false positives/negatives.
 */
function isCalibrationExpired(calibrationExpiry: Date | string, testDate: Date | string): boolean {
  // Calibration is expired if expiry date is before the test date
  return compareDatesTimezoneNeutral(calibrationExpiry, testDate) < 0;
}

/**
 * Check if a calibration certificate is expiring today (same day as test).
 */
function isCalibrationExpiringToday(calibrationExpiry: Date | string, testDate: Date | string): boolean {
  return compareDatesTimezoneNeutral(calibrationExpiry, testDate) === 0;
}

export interface CreateAnalysisInput {
  filename: string;
  testType: 'GROUNDING' | 'MEGGER' | 'THERMOGRAPHY';
  pdfData?: string; // Base64 encoded PDF data (optional for now)
  pdfSizeBytes?: number;
}

// Chunking threshold - PDFs over 15MB are chunked for processing
const CHUNKING_THRESHOLD_BYTES = 15 * 1024 * 1024; // 15MB
const CHUNK_SIZE_BYTES = 5 * 1024 * 1024; // 5MB per chunk

/**
 * Determine if a PDF needs chunking based on its size.
 * PDFs over 15MB are automatically chunked for efficient processing.
 */
export function requiresChunking(pdfSizeBytes: number): boolean {
  return pdfSizeBytes > CHUNKING_THRESHOLD_BYTES;
}

/**
 * Calculate the number of chunks for a large PDF.
 * Uses approximately 5MB per chunk for optimal processing.
 */
export function calculateChunkCount(pdfSizeBytes: number): number {
  if (!requiresChunking(pdfSizeBytes)) return 1;
  return Math.ceil(pdfSizeBytes / CHUNK_SIZE_BYTES);
}

/**
 * Get chunking information for a PDF
 */
export function getChunkingInfo(pdfSizeBytes: number): {
  chunked: boolean;
  chunkCount: number;
  chunkSizeBytes: number;
  thresholdBytes: number;
} {
  const chunked = requiresChunking(pdfSizeBytes);
  return {
    chunked,
    chunkCount: calculateChunkCount(pdfSizeBytes),
    chunkSizeBytes: CHUNK_SIZE_BYTES,
    thresholdBytes: CHUNKING_THRESHOLD_BYTES,
  };
}

export interface AnalysisResult {
  id: string;
  filename: string;
  testType: string;
  status: string;
  createdAt: Date;
}

/**
 * Parse a date string based on the company's configured date format.
 * This handles the difference between US (MM/DD/YYYY) and International (DD/MM/YYYY) formats.
 *
 * @param dateString - The date string from the PDF (e.g., "01/15/24" or "15/01/2024")
 * @param dateFormat - The company's date format preference ("MM/DD/YYYY" or "DD/MM/YYYY")
 * @returns A Date object representing the parsed date
 */
export function parseDateWithFormat(dateString: string, dateFormat: string): Date {
  // Remove any extra whitespace
  const cleaned = dateString.trim();

  // Split the date string by common separators
  const parts = cleaned.split(/[\/\-\.]/);

  if (parts.length < 3) {
    // If we can't parse it, return current date
    console.warn(`Unable to parse date string: ${dateString}`);
    return new Date();
  }

  let month: number, day: number, year: number;

  if (dateFormat === 'DD/MM/YYYY') {
    // International format: DD/MM/YYYY
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } else {
    // US format: MM/DD/YYYY (default)
    month = parseInt(parts[0], 10);
    day = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  }

  // Handle 2-digit year
  if (year < 100) {
    // Assume 20xx for years < 50, 19xx for years >= 50
    year = year < 50 ? 2000 + year : 1900 + year;
  }

  // Month is 0-indexed in JavaScript
  return new Date(year, month - 1, day);
}

/**
 * Format a date according to the company's preferred format.
 *
 * @param date - The Date object to format
 * @param dateFormat - The company's date format preference
 * @returns A formatted date string
 */
export function formatDateWithFormat(date: Date, dateFormat: string): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  if (dateFormat === 'DD/MM/YYYY') {
    return `${day}/${month}/${year}`;
  } else {
    return `${month}/${day}/${year}`;
  }
}

export async function createAnalysis(
  input: CreateAnalysisInput,
  userId: string,
  companyId: string
): Promise<AnalysisResult> {
  // Get the company's default standard and date format
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { defaultStandard: true, dateFormat: true },
  });

  const standardUsed = company?.defaultStandard || 'NETA';
  // Store the date format for use in processing
  const _dateFormat = company?.dateFormat || 'MM/DD/YYYY';
  void _dateFormat; // Used in production for PDF parsing

  // For now, we'll create the analysis in PENDING status
  // In production, this would trigger a background job for PDF processing
  const analysis = await prisma.analysis.create({
    data: {
      companyId,
      userId,
      testType: input.testType,
      filename: input.filename,
      pdfUrl: `/uploads/${input.filename}`, // Placeholder URL
      pdfSizeBytes: input.pdfSizeBytes || 0,
      status: 'PENDING',
      standardUsed,
    },
    select: {
      id: true,
      filename: true,
      testType: true,
      status: true,
      createdAt: true,
    },
  });

  // In production, queue background processing job here
  // For now, simulate processing completion after a short delay
  simulateProcessing(analysis.id);

  return analysis;
}

/**
 * Generate test-type-specific extraction data
 *
 * For deterministic testing, certain filename patterns force specific scenarios:
 * - "LOW_IR" in filename: Forces IR < 100MΩ (triggers MEG-002)
 * - "LOW_ABSORPTION" in filename: Forces absorption index < 1.4 (triggers MEG-003)
 * - "MISSING_COMBO" in filename: Forces missing SxT combination (triggers MEG-001)
 */
function generateExtractionData(
  testType: string,
  testDate: string,
  calibrationExpiryDate: string,
  calibrationExpired: boolean,
  calibrationExpiringToday: boolean,
  filename?: string
) {
  const baseData = {
    equipmentId: 'EQ-001',
    testDate,
    calibrationCertificate: {
      serialNumber: 'CAL-2024-' + Math.floor(Math.random() * 10000).toString().padStart(5, '0'),
      expiryDate: calibrationExpiryDate,
      isExpired: calibrationExpired,
      isExpiringToday: calibrationExpiringToday,
    },
  };

  // Check for test scenario flags in filename
  const forceLowIR = filename?.toUpperCase().includes('LOW_IR');
  const forceLowAbsorption = filename?.toUpperCase().includes('LOW_ABSORPTION');
  const forceMissingCombo = filename?.toUpperCase().includes('MISSING_COMBO');

  switch (testType) {
    case 'MEGGER':
      // Force failure scenarios based on filename, otherwise 80% pass rate
      const irPasses = forceLowIR ? false : Math.random() < 0.8;
      const generateIRValue = () => irPasses
        ? Math.floor(Math.random() * 5000) + 200 // 200-5200 MΩ (passes)
        : Math.floor(Math.random() * 80) + 20; // 20-99 MΩ (fails)

      // Force failure scenarios based on filename, otherwise 80% pass rate
      const absorptionPasses = forceLowAbsorption ? false : Math.random() < 0.8;
      const absorptionIdx = absorptionPasses
        ? 1.5 + Math.random() * 1.5 // 1.5-3.0 (passes)
        : 1.0 + Math.random() * 0.3; // 1.0-1.3 (fails)

      return {
        ...baseData,
        testVoltage: {
          value: 1000,
          unit: 'V',
          confidence: 0.95 + Math.random() * 0.04,
          source: 'report_header',
          page: 1,
        },
        absorptionIndex: {
          value: parseFloat(absorptionIdx.toFixed(2)),
          confidence: 0.88 + Math.random() * 0.10,
          source: 'report_table',
          page: 1,
        },
        polarizationIndex: {
          value: parseFloat((2.0 + Math.random() * 2.0).toFixed(2)),
          confidence: 0.85 + Math.random() * 0.12,
          source: 'report_table',
          page: 1,
        },
        insulationResistance: {
          // 6 combinations for 3-phase insulation testing
          // If forceMissingCombo, omit SxT to trigger MEG-001
          RxS: { value: generateIRValue(), unit: 'MΩ', confidence: 0.90 + Math.random() * 0.09, source: 'report_table', page: 1 },
          RxT: { value: generateIRValue(), unit: 'MΩ', confidence: 0.90 + Math.random() * 0.09, source: 'report_table', page: 1 },
          ...(forceMissingCombo ? {} : { SxT: { value: generateIRValue(), unit: 'MΩ', confidence: 0.90 + Math.random() * 0.09, source: 'report_table', page: 1 } }),
          RxMASS: { value: generateIRValue(), unit: 'MΩ', confidence: 0.90 + Math.random() * 0.09, source: 'report_table', page: 1 },
          SxMASS: { value: generateIRValue(), unit: 'MΩ', confidence: 0.90 + Math.random() * 0.09, source: 'report_table', page: 1 },
          TxMASS: { value: generateIRValue(), unit: 'MΩ', confidence: 0.90 + Math.random() * 0.09, source: 'report_table', page: 1 },
        },
        allCombinationsPresent: {
          value: !forceMissingCombo, // False if missing combo scenario
          confidence: 0.95 + Math.random() * 0.04,
          source: 'report_analysis',
          page: 1,
        },
        temperature: {
          value: 20 + Math.floor(Math.random() * 15),
          unit: '°C',
          confidence: 0.92 + Math.random() * 0.07,
          source: 'report_header',
          page: 1,
        },
        humidity: {
          value: 30 + Math.floor(Math.random() * 40),
          unit: '%',
          confidence: 0.88 + Math.random() * 0.10,
          source: 'report_header',
          page: 1,
        },
        instrumentCalibration: {
          ...baseData.calibrationCertificate,
          confidence: 0.92 + Math.random() * 0.07,
          source: 'certificate',
          page: 3,
        },
      };

    case 'THERMOGRAPHY':
      // Check for test scenario flags in filename for Thermography
      const forceMildDeltaT = filename?.toUpperCase().includes('MILD_DELTA'); // 5-10°C (triggers THM-002)
      const forceCriticalDeltaT = filename?.toUpperCase().includes('CRITICAL_DELTA'); // >15°C (triggers THM-001)
      const forceMissingReading = filename?.toUpperCase().includes('MISSING_READING'); // Missing readings (triggers THM-003)

      // Generate load readings (percentage of rated load)
      const minLoadReading = 50 + Math.floor(Math.random() * 30); // 50-80%
      const maxLoadReading = minLoadReading + 10 + Math.floor(Math.random() * 20); // Higher than min

      // Phase temperatures for delta T calculation
      // Determine delta T based on test scenario
      let phaseToPhaseDeltatT: number;
      let phaseATemp: number;
      let phaseBTemp: number;
      let phaseCTemp: number;

      if (forceCriticalDeltaT) {
        phaseToPhaseDeltatT = 16 + Math.floor(Math.random() * 10); // 16-25°C (CRITICAL)
        // Generate consistent phase temps for display
        phaseATemp = 35 + Math.floor(Math.random() * 10);
        phaseBTemp = phaseATemp + phaseToPhaseDeltatT;
        phaseCTemp = phaseATemp + Math.floor(phaseToPhaseDeltatT / 2);
      } else if (forceMildDeltaT) {
        phaseToPhaseDeltatT = 5 + Math.floor(Math.random() * 8); // 5-12°C (MINOR)
        // Generate consistent phase temps for display
        phaseATemp = 35 + Math.floor(Math.random() * 10);
        phaseBTemp = phaseATemp + phaseToPhaseDeltatT;
        phaseCTemp = phaseATemp + Math.floor(phaseToPhaseDeltatT / 2);
      } else {
        // Random - generate phase temps and calculate delta
        phaseATemp = 35 + Math.floor(Math.random() * 25); // 35-60°C
        phaseBTemp = 35 + Math.floor(Math.random() * 25);
        phaseCTemp = 35 + Math.floor(Math.random() * 25);
        const maxPhaseTemp = Math.max(phaseATemp, phaseBTemp, phaseCTemp);
        const minPhaseTemp = Math.min(phaseATemp, phaseBTemp, phaseCTemp);
        phaseToPhaseDeltatT = maxPhaseTemp - minPhaseTemp;
      }

      const ambientTemp = 20 + Math.floor(Math.random() * 10); // 20-30°C
      const reflectedTemp = ambientTemp + Math.floor(Math.random() * 5) - 2; // Close to ambient

      return {
        ...baseData,
        // Required fields per spec (ai_extraction_thermography)
        // If forceMissingReading, omit one or both load readings
        ...(forceMissingReading ? {} : {
          minimumLoadReading: {
            value: minLoadReading,
            unit: '%',
            confidence: 0.85 + Math.random() * 0.14,
            source: 'report_table',
            page: 1,
          },
        }),
        maximumLoadReading: {
          value: maxLoadReading,
          unit: '%',
          confidence: 0.85 + Math.random() * 0.14,
          source: 'report_table',
          page: 1,
        },
        phaseToPhaseDeltatT: {
          value: phaseToPhaseDeltatT,
          unit: '°C',
          confidence: 0.85 + Math.random() * 0.14,
          source: 'thermal_image',
          page: 2,
        },
        ambientTemperature: {
          value: ambientTemp,
          unit: '°C',
          confidence: 0.90 + Math.random() * 0.09,
          source: 'report_header',
          page: 1,
        },
        reflectedTemperature: {
          value: reflectedTemp,
          unit: '°C',
          confidence: 0.85 + Math.random() * 0.14,
          source: 'thermal_image',
          page: 2,
        },
        twoMandatoryReadingsDetected: {
          value: !forceMissingReading, // False if missing reading scenario
          confidence: 0.95 + Math.random() * 0.04,
          source: 'report_analysis',
          page: 1,
        },
        // Additional detail fields
        phaseTemperatures: {
          phaseA: { value: phaseATemp, unit: '°C', confidence: 0.88 + Math.random() * 0.11 },
          phaseB: { value: phaseBTemp, unit: '°C', confidence: 0.88 + Math.random() * 0.11 },
          phaseC: { value: phaseCTemp, unit: '°C', confidence: 0.88 + Math.random() * 0.11 },
        },
        emissivity: 0.85 + Math.random() * 0.1, // 0.85-0.95
        hotSpots: [
          {
            location: 'Panel A - Breaker 1',
            temperature: 45 + Math.floor(Math.random() * 30), // 45-75°C
            referenceTemp: 25,
            deltaT: 20 + Math.floor(Math.random() * 30),
            severity: Math.random() > 0.7 ? 'HIGH' : Math.random() > 0.4 ? 'MEDIUM' : 'LOW',
          },
          {
            location: 'Panel B - Main Bus',
            temperature: 35 + Math.floor(Math.random() * 20), // 35-55°C
            referenceTemp: 25,
            deltaT: 10 + Math.floor(Math.random() * 20),
            severity: Math.random() > 0.7 ? 'HIGH' : Math.random() > 0.4 ? 'MEDIUM' : 'LOW',
          },
        ],
        cameraModel: 'FLIR E96',
        imageCount: 5 + Math.floor(Math.random() * 10),
      };

    case 'GROUNDING':
    default:
      // Check for test scenario flags in filename
      const forceCleanGround = filename?.toUpperCase().includes('CLEAN');
      const forceMajorGround = filename?.toUpperCase().includes('MAJOR_ISSUE');
      const forceCriticalGround = filename?.toUpperCase().includes('HIGH_RESISTANCE');
      const forceMinorGround = filename?.toUpperCase().includes('EXPIRING_TODAY');

      // Generate ground resistance value based on scenario
      let groundResistance: number;
      if (forceCriticalGround) {
        // Force high resistance for REJECTED verdict
        groundResistance = 6 + Math.random() * 4; // 6-10 ohm (fails)
      } else if (forceCleanGround || forceMajorGround || forceMinorGround) {
        // Force low resistance for APPROVED scenarios
        groundResistance = 0.5 + Math.random() * 3; // 0.5-3.5 ohm (passes)
      } else {
        // 80% chance: passes (< 5 ohm), 20% chance: fails (> 5 ohm)
        const resistancePasses = Math.random() < 0.8;
        groundResistance = resistancePasses
          ? 0.5 + Math.random() * 3.5 // 0.5-4.0 ohm (passes)
          : 5.5 + Math.random() * 4.5; // 5.5-10.0 ohm (fails)
      }

      // Watermark detection based on scenario
      let hasWatermark: boolean;
      if (forceCleanGround || forceMinorGround) {
        hasWatermark = true; // Force watermark present for APPROVED/MINOR scenarios
      } else if (forceMajorGround) {
        hasWatermark = false; // Force watermark missing for APPROVED_WITH_COMMENTS
      } else {
        hasWatermark = Math.random() < 0.85; // 85% chance present
      }

      // Technician signature - force present for clean/minor, otherwise 90% chance
      const hasTechnicianSignature = (forceCleanGround || forceMinorGround) ? true : Math.random() < 0.9;

      return {
        ...baseData,
        // Required fields per spec (ai_extraction_grounding)
        groundResistance: {
          value: parseFloat(groundResistance.toFixed(2)),
          unit: 'Ω',
          confidence: 0.90 + Math.random() * 0.09,
          source: 'report_table',
          page: 1,
        },
        calibrationCertificate: {
          ...baseData.calibrationCertificate,
          confidence: 0.92 + Math.random() * 0.07,
          source: 'certificate',
          page: 3,
        },
        watermarkPresent: {
          value: hasWatermark,
          confidence: hasWatermark ? 0.95 + Math.random() * 0.04 : 0.85 + Math.random() * 0.10,
          source: 'photo_analysis',
          page: 2,
        },
        watermarkTimestamp: hasWatermark ? {
          value: new Date().toISOString(),
          confidence: 0.88 + Math.random() * 0.10,
          source: 'photo_watermark',
          page: 2,
        } : null,
        technicianSignature: {
          present: hasTechnicianSignature,
          confidence: 0.92 + Math.random() * 0.07,
          source: 'report_footer',
          page: 1,
        },
        instrumentSerialNumber: {
          value: 'SN-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0'),
          confidence: 0.88 + Math.random() * 0.10,
          source: Math.random() > 0.5 ? 'header' : Math.random() > 0.5 ? 'photo' : 'certificate',
          page: Math.random() > 0.5 ? 1 : 3,
        },
        // Additional readings for completeness
        readings: [
          { point: 'A', value: parseFloat((groundResistance * (0.9 + Math.random() * 0.2)).toFixed(2)), unit: 'Ω', confidence: 0.88 + Math.random() * 0.11 },
          { point: 'B', value: parseFloat((groundResistance * (0.9 + Math.random() * 0.2)).toFixed(2)), unit: 'Ω', confidence: 0.88 + Math.random() * 0.11 },
          { point: 'C', value: parseFloat((groundResistance * (0.9 + Math.random() * 0.2)).toFixed(2)), unit: 'Ω', confidence: 0.88 + Math.random() * 0.11 },
        ],
        soilResistivity: {
          value: 50 + Math.floor(Math.random() * 150), // 50-200 Ω·m
          unit: 'Ω·m',
          confidence: 0.85 + Math.random() * 0.10,
          source: 'report_table',
          page: 1,
        },
        electrodeDepth: {
          value: 2.4,
          unit: 'm',
          confidence: 0.90 + Math.random() * 0.08,
          source: 'report_table',
          page: 1,
        },
        testMethod: {
          value: 'Fall-of-Potential',
          confidence: 0.95 + Math.random() * 0.04,
          source: 'report_header',
          page: 1,
        },
      };
  }
}

// Simulate background processing (for development)
// Exported for reanalysis workflow
export async function simulateProcessing(analysisId: string) {
  // Wait 2 seconds then mark as completed
  setTimeout(async () => {
    try {
      // Get the analysis to find userId, companyId, and testType
      const analysis = await prisma.analysis.findUnique({
        where: { id: analysisId },
        select: { userId: true, companyId: true, filename: true, testType: true },
      });

      if (!analysis) {
        console.error('Analysis not found:', analysisId);
        return;
      }

      // Get the PDF size for token calculation
      const fullAnalysis = await prisma.analysis.findUnique({
        where: { id: analysisId },
        select: { pdfSizeBytes: true },
      });

      // Calculate tokens based on PDF size (same formula as frontend estimate)
      // Base: pdfSize / 100, clamped between 1000 and 10000
      // Add small random variance (±10%) to simulate real processing
      const baseTokens = Math.max(1000, Math.min(10000, Math.round((fullAnalysis?.pdfSizeBytes || 5000) / 100)));
      const variance = (Math.random() * 0.2 - 0.1) * baseTokens; // ±10% variance
      const tokensConsumed = Math.round(baseTokens + variance);

      // Simulate extraction data with calibration info
      const testDate = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format

      // Check for test scenario flags that control calibration status
      const forceValidCalibration = analysis.filename?.toUpperCase().includes('CLEAN') ||
                                    analysis.filename?.toUpperCase().includes('MAJOR_ISSUE');
      const forceExpiringToday = analysis.filename?.toUpperCase().includes('EXPIRING_TODAY');

      // Simulate different calibration scenarios:
      // - Force valid if CLEAN or MAJOR_ISSUE flag (to ensure APPROVED/APPROVED_WITH_COMMENTS)
      // - Force expiring today if EXPIRING_TODAY flag (to trigger GND-003 MINOR)
      // - 70% chance: valid calibration (expires 6 months from now)
      // - 15% chance: expiring today
      // - 15% chance: expired (expired yesterday)
      const random = Math.random();
      let calibrationExpiryDate: string;
      if (forceExpiringToday) {
        // Force calibration to expire today (triggers GND-003 MINOR)
        calibrationExpiryDate = testDate;
      } else if (forceValidCalibration || random < 0.70) {
        // Valid: expires 6 months from now
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 6);
        calibrationExpiryDate = futureDate.toISOString().split('T')[0];
      } else if (random < 0.85) {
        // Expiring today
        calibrationExpiryDate = testDate;
      } else {
        // Expired yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        calibrationExpiryDate = yesterday.toISOString().split('T')[0];
      }

      // Validate calibration using timezone-safe comparison
      const calibrationExpired = isCalibrationExpired(calibrationExpiryDate, testDate);
      const calibrationExpiringToday = isCalibrationExpiringToday(calibrationExpiryDate, testDate);

      // Generate extraction data first to access values for validation
      // Pass filename to enable deterministic test scenarios (e.g., LOW_IR, LOW_ABSORPTION, MISSING_COMBO)
      const extractionData = generateExtractionData(analysis.testType, testDate, calibrationExpiryDate, calibrationExpired, calibrationExpiringToday, analysis.filename);

      // Build non-conformities list based on test type
      const nonConformities: Array<{
        code: string;
        severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
        description: string;
        evidence: string;
        correctiveAction: string;
      }> = [];

      // Check calibration expiration - CRITICAL if expired, MINOR if expiring today
      if (calibrationExpired) {
        nonConformities.push({
          code: 'GND-002',
          severity: 'CRITICAL',
          description: 'Calibration certificate expired on test date',
          evidence: `Calibration expires ${calibrationExpiryDate}, test conducted on ${testDate}`,
          correctiveAction: 'Recalibrate instrument before retesting',
        });
      } else if (calibrationExpiringToday) {
        nonConformities.push({
          code: 'GND-003',
          severity: 'MINOR',
          description: 'Calibration certificate expires on test date',
          evidence: `Calibration expires on ${calibrationExpiryDate}, same as test date ${testDate}`,
          correctiveAction: 'Certificate is still valid but recommend recalibration soon',
        });
      }

      // Test-type specific validations
      if (analysis.testType === 'GROUNDING') {
        // GND-001: Maximum resistance check (5 ohm for NETA, 1 ohm for Microsoft critical)
        const groundResistance = (extractionData as any).groundResistance?.value;
        if (groundResistance && groundResistance > 5) {
          nonConformities.push({
            code: 'GND-001',
            severity: 'CRITICAL',
            description: 'Ground resistance exceeds maximum allowed value',
            evidence: `Measured resistance: ${groundResistance}Ω, maximum allowed: 5Ω (NETA ATS-2021)`,
            correctiveAction: 'Investigate grounding system, add ground rods or improve soil contact',
          });
        }

        // GND-004: Watermark presence check on photos
        const watermarkPresent = (extractionData as any).watermarkPresent?.value;
        if (!watermarkPresent) {
          nonConformities.push({
            code: 'GND-004',
            severity: 'MAJOR',
            description: 'Watermark not detected on photo evidence',
            evidence: 'Photo analysis did not detect timestamp watermark on test photos',
            correctiveAction: 'Re-submit photos with visible timestamp watermarks',
          });
        }

        // GND-005: Technician signature presence check
        const technicianSignature = (extractionData as any).technicianSignature?.present;
        if (!technicianSignature) {
          nonConformities.push({
            code: 'GND-005',
            severity: 'MAJOR',
            description: 'Technician signature not detected',
            evidence: 'Report footer does not contain technician signature',
            correctiveAction: 'Report must be signed by certified technician',
          });
        }
      } else if (analysis.testType === 'MEGGER') {
        // MEG-001: Check if all 6 combinations present
        const ir = (extractionData as any).insulationResistance;
        const requiredCombinations = ['RxS', 'RxT', 'SxT', 'RxMASS', 'SxMASS', 'TxMASS'];
        // Check for missing combinations - a combination is missing if:
        // 1. The key doesn't exist in ir object, OR
        // 2. The value property is undefined/null (but 0 is a valid value)
        const missingCombinations = requiredCombinations.filter(c => {
          if (!ir || !ir[c]) return true; // Key doesn't exist
          const val = ir[c]?.value;
          return val === undefined || val === null;
        });
        if (missingCombinations.length > 0) {
          nonConformities.push({
            code: 'MEG-001',
            severity: 'CRITICAL',
            description: 'Missing required insulation resistance combinations',
            evidence: `Missing combinations: ${missingCombinations.join(', ')}`,
            correctiveAction: 'Complete all 6 insulation resistance measurements',
          });
        }

        // MEG-002: Minimum IR check (100MΩ @ 1000V for MV cables)
        const irValues = ir ? Object.values(ir).filter((v: any) => v?.value !== undefined).map((v: any) => v.value) : [];
        if (irValues.length > 0) {
          const minIR = Math.min(...(irValues as number[]));
          if (minIR < 100) {
            nonConformities.push({
              code: 'MEG-002',
              severity: 'CRITICAL',
              description: 'Insulation resistance below minimum threshold',
              evidence: `Minimum IR reading: ${minIR}MΩ, required: ≥100MΩ @ 1000V`,
              correctiveAction: 'Investigate insulation failure and repair before energizing',
            });
          }
        }

        // MEG-003: Absorption index check (> 1.4 for approval)
        const absorptionIndexData = (extractionData as any).absorptionIndex;
        const absorptionIndex = absorptionIndexData?.value ?? absorptionIndexData;
        if (absorptionIndex !== undefined && absorptionIndex < 1.4) {
          nonConformities.push({
            code: 'MEG-003',
            severity: 'MAJOR',
            description: 'Absorption index below acceptable threshold',
            evidence: `Absorption index: ${typeof absorptionIndex === 'number' ? absorptionIndex.toFixed(2) : absorptionIndex}, required: >1.4`,
            correctiveAction: 'Investigate moisture ingress or contamination',
          });
        }
      } else if (analysis.testType === 'THERMOGRAPHY') {
        // THM-001: Phase-to-phase delta T check (> 15°C = CRITICAL for NETA, > 3°C = comment for Microsoft)
        const deltaT = (extractionData as any).phaseToPhaseDeltatT?.value;
        if (deltaT && deltaT > 15) {
          nonConformities.push({
            code: 'THM-001',
            severity: 'CRITICAL',
            description: 'Phase-to-phase temperature differential exceeds critical threshold',
            evidence: `Delta T: ${deltaT}°C, maximum allowed: 15°C (NETA ATS-2021)`,
            correctiveAction: 'Immediate investigation required - possible loose connection or overload',
          });
        } else if (deltaT && deltaT > 3) {
          nonConformities.push({
            code: 'THM-002',
            severity: 'MINOR',
            description: 'Phase-to-phase temperature differential requires comment',
            evidence: `Delta T: ${deltaT}°C exceeds 3°C threshold (Microsoft CxPOR)`,
            correctiveAction: 'Monitor and document - schedule follow-up inspection',
          });
        }

        // THM-003: Two mandatory readings check
        const twoReadings = (extractionData as any).twoMandatoryReadingsDetected?.value;
        if (!twoReadings) {
          nonConformities.push({
            code: 'THM-003',
            severity: 'MAJOR',
            description: 'Missing mandatory load readings',
            evidence: 'Report does not contain both minimum and maximum load readings',
            correctiveAction: 'Re-test with measurements at both low and high load conditions',
          });
        }

        // THM-004: Reflected temperature documentation check
        const reflectedTemp = (extractionData as any).reflectedTemperature?.value;
        if (reflectedTemp === undefined || reflectedTemp === null) {
          nonConformities.push({
            code: 'THM-004',
            severity: 'MINOR',
            description: 'Reflected temperature not documented',
            evidence: 'Thermal image analysis did not find reflected temperature setting',
            correctiveAction: 'Document reflected temperature used for IR camera calibration',
          });
        }
      }

      // ===== VALIDAÇÃO CRUZADA (detecta falsos positivos) =====
      const dadosParaValidacao = converterParaDadosExtraidos(extractionData, testDate);
      const inconsistenciasCruzadas = validarCruzado(dadosParaValidacao);

      // Converte inconsistências cruzadas para o formato de nonConformities
      for (const inc of inconsistenciasCruzadas) {
        nonConformities.push({
          code: inc.codigo,
          severity: inc.tipo,
          description: inc.mensagem,
          evidence: `${inc.campo}: esperado [${inc.esperado}], encontrado [${inc.encontrado}]`,
          correctiveAction: inc.tipo === 'CRITICAL'
            ? 'Corrigir inconsistência antes de reenviar'
            : 'Verificar e documentar a divergência',
        });
      }
      // ===== FIM VALIDAÇÃO CRUZADA =====

      // Determine verdict based on validation results
      // Automatic REJECTION for expired calibration or any CRITICAL non-conformity
      let finalVerdict: 'APPROVED' | 'APPROVED_WITH_COMMENTS' | 'REJECTED';
      let score: number;

      const hasCritical = nonConformities.some(nc => nc.severity === 'CRITICAL');
      const hasMajor = nonConformities.some(nc => nc.severity === 'MAJOR');

      if (calibrationExpired || hasCritical) {
        finalVerdict = 'REJECTED';
        score = Math.floor(Math.random() * 20) + 30; // 30-49
      } else if (hasMajor || nonConformities.length > 0) {
        finalVerdict = 'APPROVED_WITH_COMMENTS';
        score = Math.floor(Math.random() * 15) + 75; // 75-89
      } else {
        finalVerdict = 'APPROVED';
        score = Math.floor(Math.random() * 10) + 90; // 90-99
      }

      // Determine overall confidence based on filename flags or random
      const forceLowConfidence = analysis.filename?.toUpperCase().includes('LOW_CONFIDENCE');
      const forceHighConfidence = analysis.filename?.toUpperCase().includes('HIGH_CONFIDENCE');

      let overallConfidence: number;
      if (forceLowConfidence) {
        overallConfidence = 0.65 + Math.random() * 0.14; // 0.65-0.79 (triggers review)
      } else if (forceHighConfidence) {
        overallConfidence = 0.95 + Math.random() * 0.04; // 0.95-0.99 (auto-approval eligible)
      } else {
        overallConfidence = 0.85 + Math.random() * 0.14; // 0.85-0.99 (normal range)
      }

      // Flag for review if confidence < 80%
      const requiresReview = overallConfidence < 0.80;

      // Update the analysis
      await prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'COMPLETED',
          verdict: finalVerdict,
          score,
          overallConfidence,
          requiresReview,
          tokensConsumed,
          processingTimeMs: Math.floor(Math.random() * 5000) + 2000,
          completedAt: new Date(),
          extractionData: extractionData,
          nonConformities: nonConformities,
        },
      });

      // Consume tokens
      try {
        await consumeTokens(
          analysis.companyId,
          analysis.userId,
          tokensConsumed,
          analysisId,
          `Analysis: ${analysis.filename}`
        );
      } catch (tokenError) {
        console.error('Failed to consume tokens:', tokenError);
        // Analysis still completed, but tokens weren't consumed
        // In production, this would need better handling
      }

      // Index completed analysis for RAG/Loop Learning (async, non-blocking)
      indexAnalysisForRAG(
        analysisId,
        analysis.testType as 'GROUNDING' | 'MEGGER' | 'THERMOGRAPHY',
        finalVerdict,
        extractionData,
        nonConformities,
        analysis.companyId
      ).catch(err => {
        console.error('RAG indexing failed (non-critical):', err);
      });
    } catch (error) {
      console.error('Error updating analysis status:', error);
      // Mark as failed if update fails
      await prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
        },
      }).catch(() => {});
    }
  }, 2000);
}

export async function getAnalysesByCompanyId(
  companyId: string,
  options?: {
    status?: string;
    testType?: string;
    limit?: number;
    offset?: number;
  }
) {
  const where: any = { companyId };

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.testType) {
    where.testType = options.testType;
  }

  const analyses = await prisma.analysis.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 100,
    skip: options?.offset || 0,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  const total = await prisma.analysis.count({ where });

  return { analyses, total };
}

export async function getAnalysisById(
  analysisId: string,
  companyId: string
) {
  const analysis = await prisma.analysis.findFirst({
    where: {
      id: analysisId,
      companyId, // Tenant isolation
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return analysis;
}

// =============================================================================
// RAG / LOOP LEARNING INTEGRATION
// =============================================================================

/**
 * Index a completed analysis for RAG-based loop learning.
 * This allows the system to learn from past analyses and improve future ones.
 */
async function indexAnalysisForRAG(
  analysisId: string,
  testType: 'GROUNDING' | 'MEGGER' | 'THERMOGRAPHY',
  verdict: 'APPROVED' | 'APPROVED_WITH_COMMENTS' | 'REJECTED',
  extractionData: Record<string, any>,
  nonConformities: Array<{
    code: string;
    severity: string;
    description: string;
    evidence: string;
  }>,
  companyId: string
): Promise<void> {
  try {
    const ragService = getRAGService();

    const result = await ragService.indexAnalysis({
      analysisId,
      testType,
      verdict,
      extractionData,
      nonConformities,
      companyId,
    });

    if (result.success) {
      console.log(`Indexed analysis ${analysisId} for RAG (embedding: ${result.embeddingId})`);
    } else {
      console.warn(`Failed to index analysis ${analysisId}: ${result.error}`);
    }
  } catch (error) {
    // Non-critical error - don't fail the analysis
    console.error('RAG indexing error:', error);
  }
}

/**
 * Submit user feedback/correction for an analysis.
 * This is used for loop learning - corrections improve future analyses.
 */
export async function submitAnalysisFeedback(
  analysisId: string,
  userId: string,
  companyId: string,
  feedbackType: 'VERDICT_CORRECTION' | 'FIELD_CORRECTION' | 'FALSE_POSITIVE' | 'FALSE_NEGATIVE',
  originalValue: Record<string, any>,
  correctedValue: Record<string, any>,
  explanation?: string
): Promise<{ success: boolean; feedbackId?: string; error?: string }> {
  try {
    // Get the analysis to verify access and get testType
    const analysis = await prisma.analysis.findFirst({
      where: { id: analysisId, companyId },
      select: { testType: true },
    });

    if (!analysis) {
      return { success: false, error: 'Analysis not found' };
    }

    // Store feedback in database
    const feedback = await prisma.analysisFeedback.create({
      data: {
        analysisId,
        userId,
        companyId,
        feedbackType,
        originalValue,
        correctedValue,
        explanation,
      },
    });

    // Index the correction for RAG (async, non-blocking)
    const ragService = getRAGService();
    ragService.indexCorrection(
      analysisId,
      companyId,
      analysis.testType,
      originalValue,
      correctedValue,
      explanation
    ).then(result => {
      if (result.success) {
        // Mark feedback as incorporated
        prisma.analysisFeedback.update({
          where: { id: feedback.id },
          data: { incorporated: true, incorporatedAt: new Date() },
        }).catch(console.error);
      }
    }).catch(console.error);

    return { success: true, feedbackId: feedback.id };
  } catch (error: any) {
    console.error('Failed to submit feedback:', error);
    return { success: false, error: error.message };
  }
}
