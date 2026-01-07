import { Hono } from 'hono';
import { requireAuth, requireRole } from '../auth/auth.middleware';

export const companyRoutes = new Hono();

// GET /api/companies/:id - Get company details (authenticated users)
companyRoutes.get('/:id', requireAuth, async (c) => {
  const id = c.req.param('id');
  // TODO: Implement get company
  return c.json({ message: `Get company ${id} endpoint` });
});

// PUT /api/companies/:id - Update company (ADMIN only)
companyRoutes.put('/:id', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (c) => {
  const id = c.req.param('id');
  // TODO: Implement update company
  return c.json({ message: `Update company ${id} endpoint` });
});

// POST /api/companies/:id/logo - Upload company logo (ADMIN only)
companyRoutes.post('/:id/logo', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (c) => {
  const id = c.req.param('id');
  // TODO: Implement logo upload
  return c.json({ message: `Upload logo for company ${id} endpoint` });
});

// POST /api/companies - Create company (SUPER_ADMIN only)
companyRoutes.post('/', requireAuth, requireRole('SUPER_ADMIN'), async (c) => {
  // TODO: Implement create company
  return c.json({ message: 'Create company endpoint' });
});
