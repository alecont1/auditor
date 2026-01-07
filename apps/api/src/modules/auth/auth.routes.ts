import { Hono } from 'hono';
import { z } from 'zod';
import { login, changePassword } from './auth.service';
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
