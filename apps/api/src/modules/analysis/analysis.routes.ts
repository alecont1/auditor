import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth } from '../auth/auth.middleware';
import { prisma } from '../../lib/prisma';
import { createAnalysis } from './analysis.service';

export const analysisRoutes = new Hono();

// Apply auth middleware to all analysis routes
analysisRoutes.use('*', requireAuth);

const createAnalysisSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  testType: z.enum(['GROUNDING', 'MEGGER', 'THERMOGRAPHY']),
  pdfData: z.string().optional(), // Base64 encoded PDF
  pdfSizeBytes: z.number().optional(),
});

// POST /api/analysis - Upload and start analysis
analysisRoutes.post('/', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    const validation = createAnalysisSchema.safeParse(body);
    if (!validation.success) {
      return c.json(
        { error: 'Validation Error', message: validation.error.issues[0].message },
        400
      );
    }

    const analysis = await createAnalysis(
      validation.data,
      user.userId,
      user.companyId
    );

    return c.json({
      success: true,
      message: 'Analysis created successfully',
      analysis,
    }, 201);
  } catch (error) {
    console.error('Create analysis error:', error);
    return c.json(
      { error: 'Server Error', message: 'Failed to create analysis' },
      500
    );
  }
});

// GET /api/analysis/stats - Get dashboard statistics (tenant-isolated)
analysisRoutes.get('/stats', async (c) => {
  const user = c.get('user');

  // Get start of current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get analyses this month
  const analysesThisMonth = await prisma.analysis.count({
    where: {
      companyId: user.companyId,
      createdAt: { gte: startOfMonth },
    },
  });

  // Get completed analyses for stats
  const completedAnalyses = await prisma.analysis.findMany({
    where: {
      companyId: user.companyId,
      status: 'COMPLETED',
    },
    select: {
      verdict: true,
      processingTimeMs: true,
    },
  });

  // Calculate approval rate
  const approvedCount = completedAnalyses.filter(
    (a) => a.verdict === 'APPROVED' || a.verdict === 'APPROVED_WITH_COMMENTS'
  ).length;
  const approvalRate = completedAnalyses.length > 0
    ? Math.round((approvedCount / completedAnalyses.length) * 100)
    : null;

  // Calculate average processing time
  const processingTimes = completedAnalyses
    .filter((a) => a.processingTimeMs !== null)
    .map((a) => a.processingTimeMs!);
  const avgProcessingTime = processingTimes.length > 0
    ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length / 1000)
    : null;

  // Get company token balance
  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { tokenBalance: true },
  });

  return c.json({
    stats: {
      analysesThisMonth,
      approvalRate,
      avgProcessingTimeSeconds: avgProcessingTime,
      tokenBalance: company?.tokenBalance ?? 0,
    },
  });
});

// GET /api/analysis/recent - Get recent analyses for dashboard (tenant-isolated)
analysisRoutes.get('/recent', async (c) => {
  const user = c.get('user');

  const recentAnalyses = await prisma.analysis.findMany({
    where: { companyId: user.companyId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      filename: true,
      testType: true,
      status: true,
      verdict: true,
      score: true,
      createdAt: true,
    },
  });

  return c.json({ analyses: recentAnalyses });
});

// GET /api/analysis - List analyses with filters (tenant-isolated)
analysisRoutes.get('/', async (c) => {
  const user = c.get('user');

  // Only return analyses for the user's company (tenant isolation)
  const analyses = await prisma.analysis.findMany({
    where: {
      companyId: user.companyId,
    },
    orderBy: {
      createdAt: 'desc',
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

  return c.json({ analyses });
});

// GET /api/analysis/estimate - Token estimate for file
analysisRoutes.get('/estimate', async (c) => {
  // TODO: Implement token estimate
  return c.json({ message: 'Token estimate endpoint' });
});

// GET /api/analysis/:id - Get analysis details (tenant-isolated)
analysisRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');

  // Find analysis and check it belongs to user's company
  const analysis = await prisma.analysis.findFirst({
    where: {
      id,
      companyId: user.companyId, // CRITICAL: Tenant isolation
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

  // Return 404 if analysis not found OR belongs to different company
  // This prevents information leakage about analyses in other companies
  if (!analysis) {
    return c.json({ error: 'Not Found', message: 'Analysis not found' }, 404);
  }

  return c.json({ analysis });
});

// GET /api/analysis/:id/export - Export analysis (JSON or CSV)
analysisRoutes.get('/:id/export', async (c) => {
  const id = c.req.param('id');
  const format = c.req.query('format') || 'json';
  const user = c.get('user');

  // Check tenant isolation
  const analysis = await prisma.analysis.findFirst({
    where: {
      id,
      companyId: user.companyId,
    },
  });

  if (!analysis) {
    return c.json({ error: 'Not Found', message: 'Analysis not found' }, 404);
  }

  // TODO: Implement full export logic
  return c.json({ message: `Export analysis ${id} as ${format}`, analysis });
});

// POST /api/analysis/:id/reanalyze - Re-analyze (tenant-isolated)
analysisRoutes.post('/:id/reanalyze', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');

  // Check tenant isolation
  const analysis = await prisma.analysis.findFirst({
    where: {
      id,
      companyId: user.companyId,
    },
  });

  if (!analysis) {
    return c.json({ error: 'Not Found', message: 'Analysis not found' }, 404);
  }

  // TODO: Implement reanalyze logic
  return c.json({ message: `Reanalyze ${id}`, analysis });
});

// DELETE /api/analysis/:id - Delete analysis (tenant-isolated)
analysisRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');

  // Check tenant isolation
  const analysis = await prisma.analysis.findFirst({
    where: {
      id,
      companyId: user.companyId,
    },
  });

  if (!analysis) {
    return c.json({ error: 'Not Found', message: 'Analysis not found' }, 404);
  }

  // TODO: Implement full delete logic (cascade, R2 cleanup, etc.)
  await prisma.analysis.delete({
    where: { id },
  });

  return c.json({ message: `Analysis ${id} deleted` });
});
