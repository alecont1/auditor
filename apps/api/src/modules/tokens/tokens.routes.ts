import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { getTokenBalance, getTransactionHistory, addTokens } from './tokens.service';

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

const purchaseSchema = z.object({
  packageId: z.enum(['starter', 'basic', 'professional', 'business', 'enterprise']),
});

const PACKAGES: Record<string, { name: string; tokens: number; price: number }> = {
  starter: { name: 'Starter', tokens: 50000, price: 2500 },
  basic: { name: 'Basic', tokens: 150000, price: 6500 },
  professional: { name: 'Professional', tokens: 400000, price: 15000 },
  business: { name: 'Business', tokens: 1000000, price: 35000 },
  enterprise: { name: 'Enterprise', tokens: 3000000, price: 90000 },
};

// POST /api/tokens/purchase - Purchase tokens (simulated for dev, ADMIN only)
tokenRoutes.post('/purchase', requireRole('ADMIN'), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    const validation = purchaseSchema.safeParse(body);
    if (!validation.success) {
      return c.json({ error: 'Validation Error', message: 'Invalid package selected' }, 400);
    }

    const pkg = PACKAGES[validation.data.packageId];
    if (!pkg) {
      return c.json({ error: 'Package not found' }, 404);
    }

    // In production, this would be triggered by Stripe webhook after payment
    // For development, we directly add tokens
    const transaction = await addTokens(
      user.companyId,
      user.userId,
      pkg.tokens,
      `Purchased ${pkg.name} package`,
      pkg.name,
      `sim_${Date.now()}` // Simulated Stripe session ID
    );

    return c.json({
      success: true,
      message: `Successfully purchased ${pkg.name} package`,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        balance: transaction.balance,
        createdAt: transaction.createdAt,
      },
    });
  } catch (error) {
    console.error('Purchase error:', error);
    return c.json({ error: 'Failed to complete purchase' }, 500);
  }
});

// POST /api/tokens/checkout - Create Stripe checkout session
tokenRoutes.post('/checkout', async (c) => {
  // TODO: Implement actual Stripe checkout
  return c.json({ message: 'Create checkout session endpoint - use /api/tokens/purchase for dev' });
});

// POST /api/tokens/webhook - Stripe webhook handler
tokenRoutes.post('/webhook', async (c) => {
  // TODO: Implement Stripe webhook
  return c.json({ message: 'Stripe webhook endpoint' });
});
