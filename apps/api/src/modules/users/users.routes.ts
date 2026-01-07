import { Hono } from 'hono';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { getUserById } from '../auth/auth.service';

export const userRoutes = new Hono();

// GET /api/users - List company users (ADMIN only)
userRoutes.get('/', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (c) => {
  // TODO: Implement user list
  return c.json({ message: 'Users list endpoint' });
});

// GET /api/users/me - Get current user
userRoutes.get('/me', requireAuth, async (c) => {
  try {
    const tokenUser = c.get('user');
    const user = await getUserById(tokenUser.userId);

    if (!user) {
      return c.json({ error: 'Not Found', message: 'User not found' }, 404);
    }

    return c.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    return c.json({ error: 'Server Error', message: 'Failed to get user' }, 500);
  }
});

// GET /api/users/:id - Get user by ID
userRoutes.get('/:id', requireAuth, async (c) => {
  const id = c.req.param('id');
  // TODO: Implement get user
  return c.json({ message: `Get user ${id} endpoint` });
});

// PUT /api/users/:id - Update user
userRoutes.put('/:id', requireAuth, async (c) => {
  const id = c.req.param('id');
  // TODO: Implement update user
  return c.json({ message: `Update user ${id} endpoint` });
});

// DELETE /api/users/:id - Delete user (ADMIN only)
userRoutes.delete('/:id', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (c) => {
  const id = c.req.param('id');
  // TODO: Implement delete user
  return c.json({ message: `Delete user ${id} endpoint` });
});

// POST /api/users/invite - Invite user (ADMIN only)
userRoutes.post('/invite', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (c) => {
  // TODO: Implement invite user
  return c.json({ message: 'Invite user endpoint' });
});

// POST /api/users/accept-invitation - Accept invitation (public - uses token)
userRoutes.post('/accept-invitation', async (c) => {
  // TODO: Implement accept invitation
  return c.json({ message: 'Accept invitation endpoint' });
});
