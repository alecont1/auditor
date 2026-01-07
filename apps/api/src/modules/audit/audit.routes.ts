import { Hono } from 'hono';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { getUserById } from '../auth/auth.service';
import { getAuditLogs } from '../../lib/audit-log';

export const auditRoutes = new Hono();

// Apply auth middleware to all audit routes
auditRoutes.use('*', requireAuth);

// GET /api/audit - Get audit logs (ADMIN sees company logs, SUPER_ADMIN can see all)
auditRoutes.get('/', requireRole('ADMIN', 'SUPER_ADMIN'), async (c) => {
  try {
    const tokenUser = c.get('user');

    // Parse query params
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    const userId = c.req.query('userId');
    const action = c.req.query('action');

    // SUPER_ADMIN can optionally filter by company, ADMIN always sees their own company
    let companyId: string | null = null;

    if (tokenUser.role === 'SUPER_ADMIN') {
      // SUPER_ADMIN can filter by company or see all
      companyId = c.req.query('companyId') || null;
    } else {
      // ADMIN sees only their company's logs
      const user = await getUserById(tokenUser.userId);
      companyId = user?.companyId || null;
    }

    const logs = await getAuditLogs(companyId, {
      limit: Math.min(limit, 100), // Cap at 100
      offset,
      userId: userId || undefined,
      action: action as any,
    });

    return c.json({
      logs,
      pagination: {
        limit,
        offset,
        count: logs.length,
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return c.json({ error: 'Server Error', message: 'Failed to fetch audit logs' }, 500);
  }
});
