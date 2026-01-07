import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { getUserById } from '../auth/auth.service';
import { getUsersByCompanyId, createInvitation, deleteUser } from './users.service';

export const userRoutes = new Hono();

const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'ANALYST']).default('ANALYST'),
});

// GET /api/users - List company users (ADMIN only)
userRoutes.get('/', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (c) => {
  try {
    const tokenUser = c.get('user');

    // Get current user to find their company
    const user = await getUserById(tokenUser.userId);
    if (!user || !user.companyId) {
      return c.json({ error: 'Not Found', message: 'Company not found' }, 404);
    }

    const users = await getUsersByCompanyId(user.companyId);
    return c.json({ users });
  } catch (error) {
    console.error('List users error:', error);
    return c.json({ error: 'Server Error', message: 'Failed to list users' }, 500);
  }
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
  try {
    const id = c.req.param('id');
    const tokenUser = c.get('user');

    // Get current user to find their company
    const user = await getUserById(tokenUser.userId);
    if (!user || !user.companyId) {
      return c.json({ error: 'Not Found', message: 'Company not found' }, 404);
    }

    await deleteUser(id, user.companyId);
    return c.json({ success: true, message: 'User removed successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        return c.json({ error: 'Not Found', message: error.message }, 404);
      }
      if (error.message === 'Cannot delete the last admin user') {
        return c.json({ error: 'Forbidden', message: error.message }, 403);
      }
      return c.json({ error: 'Server Error', message: error.message }, 500);
    }
    return c.json({ error: 'Server Error', message: 'Failed to delete user' }, 500);
  }
});

// POST /api/users/invite - Invite user (ADMIN only)
userRoutes.post('/invite', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (c) => {
  try {
    const tokenUser = c.get('user');
    const body = await c.req.json();

    const validation = inviteUserSchema.safeParse(body);
    if (!validation.success) {
      return c.json(
        { error: 'Validation Error', message: validation.error.issues[0].message },
        400
      );
    }

    // Get current user to find their company
    const user = await getUserById(tokenUser.userId);
    if (!user || !user.companyId) {
      return c.json({ error: 'Not Found', message: 'Company not found' }, 404);
    }

    const { invitation, token } = await createInvitation(
      validation.data.email,
      validation.data.role,
      user.companyId,
      tokenUser.userId
    );

    // In production, send email with invitation link
    // For now, return the token in the response (development only)
    const inviteUrl = `${process.env.WEB_URL || 'http://localhost:3000'}/accept-invite?token=${token}`;

    return c.json({
      success: true,
      message: 'Invitation sent successfully',
      invitation,
      // Only include URL in development
      ...(process.env.NODE_ENV !== 'production' && { inviteUrl }),
    });
  } catch (error) {
    console.error('Invite user error:', error);
    if (error instanceof Error) {
      if (error.message.includes('already exists') || error.message.includes('already been sent')) {
        return c.json({ error: 'Conflict', message: error.message }, 409);
      }
      return c.json({ error: 'Server Error', message: error.message }, 500);
    }
    return c.json({ error: 'Server Error', message: 'Failed to send invitation' }, 500);
  }
});

// POST /api/users/accept-invitation - Accept invitation (public - uses token)
userRoutes.post('/accept-invitation', async (c) => {
  // TODO: Implement accept invitation
  return c.json({ message: 'Accept invitation endpoint' });
});
