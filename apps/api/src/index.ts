import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/users/users.routes.js';
import { companyRoutes } from './modules/companies/companies.routes.js';
import { analysisRoutes } from './modules/analysis/analysis.routes.js';
import { tokenRoutes } from './modules/tokens/tokens.routes.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: process.env.WEB_URL || 'http://localhost:3000',
  credentials: true,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API Routes
app.route('/api/auth', authRoutes);
app.route('/api/users', userRoutes);
app.route('/api/companies', companyRoutes);
app.route('/api/analysis', analysisRoutes);
app.route('/api/tokens', tokenRoutes);

// Dashboard routes are handled by analysis routes
// Stats and recent are fetched via /api/analysis with additional query params

// Super Admin routes
app.get('/api/admin/companies', async (c) => {
  // TODO: Implement super admin company list
  return c.json({ message: 'Admin companies endpoint' });
});

app.get('/api/admin/metrics', async (c) => {
  // TODO: Implement super admin metrics
  return c.json({ message: 'Admin metrics endpoint' });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', message: 'The requested resource was not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Server error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  }, 500);
});

const port = parseInt(process.env.PORT || '3001');

console.log(`
  ╔═══════════════════════════════════════════╗
  ║         AuditEng API Server               ║
  ╠───────────────────────────────────────────╣
  ║  Running on: http://localhost:${port}        ║
  ║  Environment: ${process.env.NODE_ENV || 'development'}             ║
  ╚═══════════════════════════════════════════╝
`);

// Start the server
serve({
  fetch: app.fetch,
  port,
});

export default app;
