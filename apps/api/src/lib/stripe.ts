import Stripe from 'stripe';

// Initialize Stripe - will be null if API key not configured
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10',
    })
  : null;

// Check if Stripe is configured
export function isStripeConfigured(): boolean {
  return !!stripe && !!process.env.STRIPE_WEBHOOK_SECRET;
}

// Package definitions matching the tokens routes
export const PACKAGES = {
  starter: { name: 'Starter', tokens: 50000, price: 2500 }, // Price in cents
  basic: { name: 'Basic', tokens: 150000, price: 6500 },
  professional: { name: 'Professional', tokens: 400000, price: 15000 },
  business: { name: 'Business', tokens: 1000000, price: 35000 },
  enterprise: { name: 'Enterprise', tokens: 3000000, price: 90000 },
} as const;

export type PackageId = keyof typeof PACKAGES;

export function isValidPackageId(id: string): id is PackageId {
  return id in PACKAGES;
}
