import { prisma } from '../../lib/prisma';

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
async function simulateProcessing(analysisId: string) {
  // Wait 2 seconds then mark as completed
  setTimeout(async () => {
    try {
      await prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'COMPLETED',
          verdict: 'APPROVED',
          score: Math.floor(Math.random() * 20) + 80, // Random score 80-100
          overallConfidence: 0.85 + Math.random() * 0.14, // 0.85-0.99
          tokensConsumed: Math.floor(Math.random() * 5000) + 1000,
          processingTimeMs: Math.floor(Math.random() * 5000) + 2000,
          completedAt: new Date(),
          extractionData: JSON.stringify({
            equipmentId: 'EQ-001',
            testDate: new Date().toISOString().split('T')[0],
            readings: [
              { point: 'A', value: 0.5, unit: 'ohms' },
              { point: 'B', value: 0.7, unit: 'ohms' },
              { point: 'C', value: 0.4, unit: 'ohms' },
            ],
          }),
          nonConformities: JSON.stringify([]),
        },
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
