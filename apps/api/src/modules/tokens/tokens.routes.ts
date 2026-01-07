import { Hono } from 'hono';
import { requireAuth } from '../auth/auth.middleware';
import { getTokenBalance, getTransactionHistory } from './tokens.service';

export const tokenRoutes = new Hono();

// Apply auth middleware to all token routes
tokenRoutes.use('*', requireAuth);

// GET /api/tokens/balance - Get token balance
tokenRoutes.get('/balance', async (c) => {
  try {
    const user = c.get('user');
    const balance = await getTokenBalance(user.companyId);
    return c.json({ balance });
  } catch (error) {
    console.error('Get balance error:', error);
    return c.json({ error: 'Failed to get balance' }, 500);
  }
});

// GET /api/tokens/transactions - Get transaction history
tokenRoutes.get('/transactions', async (c) => {
  try {
    const user = c.get('user');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    const { transactions, total } = await getTransactionHistory(user.companyId, { limit, offset });
    return c.json({ transactions, total });
  } catch (error) {
    console.error('Get transactions error:', error);
    return c.json({ error: 'Failed to get transactions' }, 500);
  }
});

// GET /api/tokens/packages - Get available packages
tokenRoutes.get('/packages', async (c) => {
  // Return predefined packages
  const packages = [
    { id: 'starter', name: 'Starter', tokens: 50000, price: 2500 }, // Price in cents
    { id: 'basic', name: 'Basic', tokens: 150000, price: 6500 },
    { id: 'professional', name: 'Professional', tokens: 400000, price: 15000 },
    { id: 'business', name: 'Business', tokens: 1000000, price: 35000 },
    { id: 'enterprise', name: 'Enterprise', tokens: 3000000, price: 90000 },
  ];
  return c.json({ packages });
});

// POST /api/tokens/checkout - Create Stripe checkout session
tokenRoutes.post('/checkout', async (c) => {
  // TODO: Implement Stripe checkout
  return c.json({ message: 'Create checkout session endpoint' });
});

// POST /api/tokens/webhook - Stripe webhook handler
tokenRoutes.post('/webhook', async (c) => {
  // TODO: Implement Stripe webhook
  return c.json({ message: 'Stripe webhook endpoint' });
});
