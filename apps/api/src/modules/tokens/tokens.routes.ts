import { Hono } from 'hono';

export const tokenRoutes = new Hono();

// GET /api/tokens/balance - Get token balance
tokenRoutes.get('/balance', async (c) => {
  // TODO: Implement get balance
  return c.json({ message: 'Token balance endpoint' });
});

// GET /api/tokens/transactions - Get transaction history
tokenRoutes.get('/transactions', async (c) => {
  // TODO: Implement transaction list
  return c.json({ message: 'Token transactions endpoint' });
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
