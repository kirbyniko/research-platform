/**
 * Rate limiting utility for API routes
 * Uses sliding window algorithm with in-memory storage
 * For production with multiple instances, consider Redis
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyGenerator?: (request: NextRequest) => string;  // Custom key generator
  skipSuccessfulRequests?: boolean;  // Only count failed requests
  skipFailedRequests?: boolean;      // Only count successful requests
  message?: string;      // Custom error message
}

// Store rate limit data - in production, use Redis
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupOldEntries(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  const cutoff = now - windowMs * 2; // Keep entries for 2x window
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.windowStart < cutoff) {
      rateLimitStore.delete(key);
    }
  }
}

// Default key generator - uses IP address
function defaultKeyGenerator(request: NextRequest): string {
  // Try various headers for real IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  const ip = cfConnectingIp || realIp || forwarded?.split(',')[0]?.trim() || 'unknown';
  return ip;
}

// Preset configurations for common use cases
export const RateLimitPresets = {
  // Strict: 10 requests per minute (login, registration)
  strict: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: 'Too many attempts. Please try again in a minute.',
  },
  
  // Standard: 60 requests per minute (authenticated APIs)
  standard: {
    windowMs: 60 * 1000,
    maxRequests: 60,
    message: 'Rate limit exceeded. Please slow down.',
  },
  
  // Lenient: 200 requests per minute (read-only public APIs)
  lenient: {
    windowMs: 60 * 1000,
    maxRequests: 200,
    message: 'Too many requests. Please try again shortly.',
  },
  
  // Very strict: 5 requests per hour (password reset, guest submissions)
  veryStrict: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    message: 'Too many attempts. Please try again in an hour.',
  },
  
  // API key creation: 10 per day
  apiKeyCreation: {
    windowMs: 24 * 60 * 60 * 1000,
    maxRequests: 10,
    message: 'API key creation limit reached. Try again tomorrow.',
  },
} as const;

/**
 * Check if a request should be rate limited
 * Returns null if allowed, or a NextResponse if rate limited
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  suffix?: string  // Optional suffix for route-specific limits
): { limited: boolean; remaining: number; resetTime: number } {
  const keyGenerator = config.keyGenerator || defaultKeyGenerator;
  const baseKey = keyGenerator(request);
  const key = suffix ? `${baseKey}:${suffix}` : baseKey;
  
  const now = Date.now();
  const windowMs = config.windowMs;
  
  // Cleanup periodically
  cleanupOldEntries(windowMs);
  
  let entry = rateLimitStore.get(key);
  
  // Reset if window has passed
  if (!entry || now - entry.windowStart >= windowMs) {
    entry = { count: 0, windowStart: now };
  }
  
  entry.count++;
  rateLimitStore.set(key, entry);
  
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const resetTime = entry.windowStart + windowMs;
  
  return {
    limited: entry.count > config.maxRequests,
    remaining,
    resetTime,
  };
}

/**
 * Rate limit middleware - returns error response if limited
 */
export function rateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  suffix?: string
): NextResponse | null {
  const result = checkRateLimit(request, config, suffix);
  
  if (result.limited) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    
    return NextResponse.json(
      { 
        error: config.message || 'Too many requests',
        retryAfter,
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
        },
      }
    );
  }
  
  return null;
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  request: NextRequest,
  config: RateLimitConfig,
  suffix?: string
): NextResponse {
  const result = checkRateLimit(request, { ...config, maxRequests: config.maxRequests + 1 }, suffix);
  
  response.headers.set('X-RateLimit-Limit', String(config.maxRequests));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));
  
  return response;
}

/**
 * Combined key generator for user + IP
 * Use when you want per-user limits but also IP-based for unauthenticated
 */
export function userOrIpKeyGenerator(userId?: number | string) {
  return (request: NextRequest): string => {
    if (userId) {
      return `user:${userId}`;
    }
    return `ip:${defaultKeyGenerator(request)}`;
  };
}

/**
 * Route-specific key generator
 * Creates unique keys per route to prevent cross-route interference
 */
export function routeKeyGenerator(routeName: string) {
  return (request: NextRequest): string => {
    const ip = defaultKeyGenerator(request);
    return `${routeName}:${ip}`;
  };
}
