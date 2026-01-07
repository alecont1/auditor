import { Context, Next } from 'hono';
import { verifyToken, TokenPayload } from '../../lib/jwt';

// Extend Hono's context to include the user
declare module 'hono' {
  interface ContextVariableMap {
    user: TokenPayload;
  }
}

// Middleware to require authentication
export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' }, 401);
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const payload = await verifyToken(token);

  if (!payload) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or expired token' }, 401);
  }

  // Attach user to context
  c.set('user', payload);

  await next();
}

// Middleware to require specific roles
export function requireRole(...roles: Array<'SUPER_ADMIN' | 'ADMIN' | 'ANALYST'>) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Unauthorized', message: 'Authentication required' }, 401);
    }

    if (!roles.includes(user.role)) {
      return c.json({ error: 'Forbidden', message: 'Insufficient permissions' }, 403);
    }

    await next();
  };
}

// Optional auth - adds user to context if present, but doesn't require it
export async function optionalAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = await verifyToken(token);
    if (payload) {
      c.set('user', payload);
    }
  }

  await next();
}
