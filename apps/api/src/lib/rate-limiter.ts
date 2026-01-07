/**
 * Simple in-memory rate limiter middleware for Hono
 * Limits requests per IP address within a sliding time window
 */

import type { Context, Next } from 'hono';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limiting
// In production, this should use Redis for distributed rate limiting
const requestCounts = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of requestCounts.entries()) {
    if (entry.resetAt < now) {
      requestCounts.delete(key);
    }
  }
}, 60000); // Clean up every minute

interface RateLimiterOptions {
  /** Maximum number of requests allowed in the time window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional message to return when rate limited */
  message?: string;
}

/**
 * Creates a rate limiting middleware
 * @param options Rate limiter configuration
 */
export function rateLimiter(options: RateLimiterOptions) {
  const { maxRequests, windowMs, message } = options;

  return async (c: Context, next: Next) => {
    // Get client IP from various headers (for proxies) or connection
    const clientIp =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      c.req.header('x-real-ip') ||
      c.req.header('cf-connecting-ip') ||
      'unknown';

    const now = Date.now();
    const key = `${clientIp}:analysis`;

    let entry = requestCounts.get(key);

    // If no entry exists or window has expired, create a new one
    if (!entry || entry.resetAt < now) {
      entry = {
        count: 1,
        resetAt: now + windowMs,
      };
      requestCounts.set(key, entry);

      // Set rate limit headers
      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', (maxRequests - 1).toString());
      c.header('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000).toString());

      return next();
    }

    // Increment the counter
    entry.count += 1;

    // Check if rate limit exceeded
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000).toString());
      c.header('Retry-After', retryAfter.toString());

      return c.json({
        error: 'Too Many Requests',
        message: message || `Rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`,
        retryAfter,
      }, 429);
    }

    // Set rate limit headers
    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', (maxRequests - entry.count).toString());
    c.header('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000).toString());

    return next();
  };
}

/**
 * Pre-configured rate limiter for analysis endpoints
 * 10 requests per minute per IP as per spec
 */
export const analysisRateLimiter = rateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
  message: 'Too many analysis requests. Please wait before submitting another analysis.',
});
