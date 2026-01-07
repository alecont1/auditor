import { Hono } from 'hono';
import { z } from 'zod';
import { login, changePassword, acceptInvitation, validateInvitationToken } from './auth.service';
import { requireAuth } from './auth.middleware';

export const authRoutes = new Hono();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// POST /api/auth/login
authRoutes.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return c.json(
        { error: 'Validation Error', message: validation.error.issues[0].message },
        400
      );
    }

    const { email, password } = validation.data;
    const result = await login(email, password);

    return c.json(result);
  } catch (error) {
    console.error('Login error:', error);
    return c.json(
      { error: 'Authentication Failed', message: error instanceof Error ? error.message : 'Login failed' },
      401
    );
  }
});

// POST /api/auth/logout
authRoutes.post('/logout', async (c) => {
  // JWT tokens are stateless, so logout is mainly handled client-side
  // by removing the token from localStorage.
  // In a production app, you might want to add the token to a blocklist
  return c.json({ success: true, message: 'Logged out successfully' });
});

// POST /api/auth/refresh
authRoutes.post('/refresh', requireAuth, async (c) => {
  // For now, just return a success message
  // Token refresh can be implemented by generating a new token
  // before the current one expires
  return c.json({ message: 'Token refresh not yet implemented' });
});

// POST /api/auth/change-password
authRoutes.post('/change-password', requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const validation = changePasswordSchema.safeParse(body);

    if (!validation.success) {
      return c.json(
        { error: 'Validation Error', message: validation.error.issues[0].message },
        400
      );
    }

    const user = c.get('user');
    const { currentPassword, newPassword } = validation.data;

    await changePassword(user.userId, currentPassword, newPassword);

    return c.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return c.json(
      { error: 'Failed', message: error instanceof Error ? error.message : 'Failed to change password' },
      400
    );
  }
});

// GET /api/auth/invitation/:token - Validate invitation token
authRoutes.get('/invitation/:token', async (c) => {
  try {
    const token = c.req.param('token');
    const invitation = await validateInvitationToken(token);

    return c.json({
      valid: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        companyName: invitation.company.name,
      },
    });
  } catch (error) {
    console.error('Validate invitation error:', error);
    return c.json(
      { valid: false, error: error instanceof Error ? error.message : 'Invalid invitation' },
      400
    );
  }
});

// POST /api/auth/accept-invitation - Accept invitation and create user
authRoutes.post('/accept-invitation', async (c) => {
  try {
    const body = await c.req.json();
    const validation = acceptInvitationSchema.safeParse(body);

    if (!validation.success) {
      return c.json(
        { error: 'Validation Error', message: validation.error.issues[0].message },
        400
      );
    }

    const { token, name, password } = validation.data;
    const user = await acceptInvitation(token, name, password);

    return c.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    return c.json(
      { error: 'Failed', message: error instanceof Error ? error.message : 'Failed to accept invitation' },
      400
    );
  }
});
