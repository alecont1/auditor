import { Hono } from 'hono';
import { z } from 'zod';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { getTokenBalance, getTransactionHistory, addTokens } from './tokens.service';
import { stripe, isStripeConfigured, PACKAGES, isValidPackageId } from '../../lib/stripe';

export const tokenRoutes = new Hono();

// Webhook route doesn't need auth - it's called by Stripe
tokenRoutes.post('/webhook', async (c) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.log('Stripe webhook called but Stripe not configured');
    return c.json({ error: 'Stripe not configured' }, 500);
  }

  const sig = c.req.header('stripe-signature');
  if (!sig) {
    return c.json({ error: 'Missing signature' }, 400);
  }

  try {
    // Get raw body for signature verification
    const rawBody = await c.req.text();

    const event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Handle the event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Extract metadata
      const companyId = session.metadata?.companyId;
      const userId = session.metadata?.userId;
      const packageId = session.metadata?.packageId;

      if (!companyId || !userId || !packageId || !isValidPackageId(packageId)) {
        console.error('Missing or invalid metadata in Stripe session:', session.metadata);
        return c.json({ error: 'Invalid session metadata' }, 400);
      }

      const pkg = PACKAGES[packageId];

      // Add tokens to company
      await addTokens(
        companyId,
        userId,
        pkg.tokens,
        `Purchased ${pkg.name} package`,
        pkg.name,
        session.id
      );

      console.log(`Stripe payment completed: ${pkg.name} for company ${companyId}`);
    }

    return c.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: `Webhook Error: ${message}` }, 400);
  }
});

// Apply auth middleware to remaining token routes
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
  // Return predefined packages with Stripe availability info
  const packages = Object.entries(PACKAGES).map(([id, pkg]) => ({
    id,
    name: pkg.name,
    tokens: pkg.tokens,
    price: pkg.price,
  }));

  return c.json({
    packages,
    stripeEnabled: isStripeConfigured(),
  });
});

const purchaseSchema = z.object({
  packageId: z.enum(['starter', 'basic', 'professional', 'business', 'enterprise']),
});

// POST /api/tokens/purchase - Purchase tokens (simulated for dev, ADMIN only)
tokenRoutes.post('/purchase', requireRole('ADMIN'), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    const validation = purchaseSchema.safeParse(body);
    if (!validation.success) {
      return c.json({ error: 'Validation Error', message: 'Invalid package selected' }, 400);
    }

    const packageId = validation.data.packageId;
    if (!isValidPackageId(packageId)) {
      return c.json({ error: 'Package not found' }, 404);
    }

    const pkg = PACKAGES[packageId];

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
tokenRoutes.post('/checkout', requireRole('ADMIN'), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    const validation = purchaseSchema.safeParse(body);
    if (!validation.success) {
      return c.json({ error: 'Validation Error', message: 'Invalid package selected' }, 400);
    }

    const packageId = validation.data.packageId;
    if (!isValidPackageId(packageId)) {
      return c.json({ error: 'Package not found' }, 404);
    }

    // Check if Stripe is configured
    if (!stripe) {
      // Fall back to simulated purchase for development
      return c.json({
        error: 'Stripe not configured',
        message: 'Use /api/tokens/purchase for development mode',
        useFallback: true,
      }, 503);
    }

    const pkg = PACKAGES[packageId];
    const webUrl = process.env.WEB_URL || 'http://localhost:3000';

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${pkg.name} Token Package`,
              description: `${pkg.tokens.toLocaleString()} tokens for AuditEng analysis`,
            },
            unit_amount: pkg.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${webUrl}/tokens?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${webUrl}/tokens?canceled=true`,
      metadata: {
        companyId: user.companyId,
        userId: user.userId,
        packageId: packageId,
      },
    });

    return c.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create checkout session';
    return c.json({ error: 'Checkout Error', message }, 500);
  }
});
