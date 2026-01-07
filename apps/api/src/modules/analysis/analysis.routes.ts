import { Hono } from 'hono';
import { requireAuth } from '../auth/auth.middleware';
import { prisma } from '../../lib/prisma';

export const analysisRoutes = new Hono();

// Apply auth middleware to all analysis routes
analysisRoutes.use('*', requireAuth);

// POST /api/analysis - Upload and start analysis
analysisRoutes.post('/', async (c) => {
  // TODO: Implement analysis creation
  return c.json({ message: 'Create analysis endpoint' });
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
