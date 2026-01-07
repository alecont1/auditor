import { prisma } from '../../lib/prisma';
import { consumeTokens } from '../tokens/tokens.service';

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

export interface AnalysisResult {
  id: string;
  filename: string;
  testType: string;
  status: string;
  createdAt: Date;
}

export async function createAnalysis(
  input: CreateAnalysisInput,
  userId: string,
  companyId: string
): Promise<AnalysisResult> {
  // Get the company's default standard
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { defaultStandard: true },
  });

  const standardUsed = company?.defaultStandard || 'NETA';

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

// Simulate background processing (for development)
// Exported for reanalysis workflow
export async function simulateProcessing(analysisId: string) {
  // Wait 2 seconds then mark as completed
  setTimeout(async () => {
    try {
      // Get the analysis to find userId and companyId
      const analysis = await prisma.analysis.findUnique({
        where: { id: analysisId },
        select: { userId: true, companyId: true, filename: true },
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

      // Simulate different calibration scenarios:
      // - 70% chance: valid calibration (expires 6 months from now)
      // - 15% chance: expiring today
      // - 15% chance: expired (expired yesterday)
      const random = Math.random();
      let calibrationExpiryDate: string;
      if (random < 0.70) {
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

      // Build non-conformities list
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

      // Determine verdict based on validation results
      // Automatic REJECTION for expired calibration
      let finalVerdict: 'APPROVED' | 'APPROVED_WITH_COMMENTS' | 'REJECTED';
      let score: number;

      if (calibrationExpired) {
        finalVerdict = 'REJECTED';
        score = Math.floor(Math.random() * 20) + 30; // 30-49
      } else if (nonConformities.length > 0) {
        finalVerdict = 'APPROVED_WITH_COMMENTS';
        score = Math.floor(Math.random() * 15) + 75; // 75-89
      } else {
        finalVerdict = 'APPROVED';
        score = Math.floor(Math.random() * 10) + 90; // 90-99
      }

      // Update the analysis
      await prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'COMPLETED',
          verdict: finalVerdict,
          score,
          overallConfidence: 0.85 + Math.random() * 0.14, // 0.85-0.99
          tokensConsumed,
          processingTimeMs: Math.floor(Math.random() * 5000) + 2000,
          completedAt: new Date(),
          extractionData: JSON.stringify({
            equipmentId: 'EQ-001',
            testDate,
            calibrationCertificate: {
              serialNumber: 'CAL-2024-' + Math.floor(Math.random() * 10000).toString().padStart(5, '0'),
              expiryDate: calibrationExpiryDate,
              isExpired: calibrationExpired,
              isExpiringToday: calibrationExpiringToday,
            },
            readings: [
              { point: 'A', value: 0.5, unit: 'ohms' },
              { point: 'B', value: 0.7, unit: 'ohms' },
              { point: 'C', value: 0.4, unit: 'ohms' },
            ],
          }),
          nonConformities: JSON.stringify(nonConformities),
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
