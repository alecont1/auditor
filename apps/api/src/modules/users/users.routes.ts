import { Hono } from 'hono';

export const userRoutes = new Hono();

// GET /api/users - List company users (ADMIN only)
userRoutes.get('/', async (c) => {
  // TODO: Implement user list
  return c.json({ message: 'Users list endpoint' });
});

// GET /api/users/me - Get current user
userRoutes.get('/me', async (c) => {
  // TODO: Implement get current user
  return c.json({ message: 'Current user endpoint' });
});

// GET /api/users/:id - Get user by ID
userRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  // TODO: Implement get user
  return c.json({ message: `Get user ${id} endpoint` });
});

// PUT /api/users/:id - Update user
userRoutes.put('/:id', async (c) => {
  const id = c.req.param('id');
  // TODO: Implement update user
  return c.json({ message: `Update user ${id} endpoint` });
});

// DELETE /api/users/:id - Delete user (ADMIN only)
userRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  // TODO: Implement delete user
  return c.json({ message: `Delete user ${id} endpoint` });
});

// POST /api/users/invite - Invite user (ADMIN only)
userRoutes.post('/invite', async (c) => {
  // TODO: Implement invite user
  return c.json({ message: 'Invite user endpoint' });
});

// POST /api/users/accept-invitation - Accept invitation
userRoutes.post('/accept-invitation', async (c) => {
  // TODO: Implement accept invitation
  return c.json({ message: 'Accept invitation endpoint' });
});
