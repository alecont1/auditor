import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.analysis.create({
    data: {
      id: 'rejected-test-1',
      companyId: 'test-company-1',
      userId: 'c8dac6c8-885d-4227-bd1f-7577bf277138',
      testType: 'GROUNDING',
      filename: 'REJECTED_TEST_REPORT.pdf',
      pdfUrl: '/uploads/rejected.pdf',
      pdfSizeBytes: 1000,
      status: 'COMPLETED',
      verdict: 'REJECTED',
      score: 45,
      overallConfidence: 0.65,
      tokensConsumed: 1500,
      processingTimeMs: 3000,
      standardUsed: 'NETA',
      completedAt: new Date()
    }
  });
  console.log('Created REJECTED analysis');
}

main().then(() => prisma.$disconnect());
