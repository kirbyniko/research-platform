/**
 * Security utilities for API responses
 * Ensures no sensitive information leaks in error messages
 */

import { NextResponse } from 'next/server';

// Generic error messages that don't leak implementation details
export const SafeErrors = {
  unauthorized: 'Authentication required',
  forbidden: 'Access denied',
  notFound: 'Resource not found',
  badRequest: 'Invalid request',
  serverError: 'An error occurred. Please try again.',
  rateLimit: 'Too many requests. Please slow down.',
  validation: 'Invalid input provided',
} as const;

// Patterns that might indicate sensitive info in error messages
const sensitivePatterns = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /credential/i,
  /database/i,
  /postgres/i,
  /sql/i,
  /connection/i,
  /ECONNREFUSED/i,
  /stack/i,
  /at\s+\w+\s+\(/i,  // Stack trace pattern
  /node_modules/i,
  /\.ts:\d+/i,       // TypeScript file references
  /\.js:\d+/i,       // JavaScript file references
];

/**
 * Check if an error message contains sensitive information
 */
function containsSensitiveInfo(message: string): boolean {
  return sensitivePatterns.some(pattern => pattern.test(message));
}

/**
 * Sanitize an error message for safe client display
 */
export function sanitizeErrorMessage(error: unknown, fallback: string = SafeErrors.serverError): string {
  if (!error) return fallback;
  
  let message: string;
  
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else {
    return fallback;
  }
  
  // If message contains sensitive info, return generic error
  if (containsSensitiveInfo(message)) {
    return fallback;
  }
  
  // Truncate very long messages
  if (message.length > 200) {
    return message.slice(0, 200) + '...';
  }
  
  return message;
}

/**
 * Create a safe JSON error response
 */
export function safeErrorResponse(
  error: unknown, 
  status: number = 500,
  fallbackMessage?: string
): NextResponse {
  const message = sanitizeErrorMessage(error, fallbackMessage);
  
  // In development, include more details
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json(
      { 
        error: message,
        _debug: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined
      },
      { status }
    );
  }
  
  return NextResponse.json({ error: message }, { status });
}

/**
 * Log error securely (full details to server, sanitized to client)
 */
export function logAndRespond(
  error: unknown,
  context: string,
  status: number = 500
): NextResponse {
  // Full error to server logs
  console.error(`[${context}]`, error);
  
  // Sanitized error to client
  return safeErrorResponse(error, status);
}

/**
 * Validate and sanitize user input
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') return '';
  
  return input
    .slice(0, maxLength)
    .replace(/[<>]/g, '')  // Remove potential HTML/XML tags
    .trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Redact sensitive fields from objects for logging
 */
export function redactSensitive<T extends Record<string, unknown>>(obj: T): T {
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'cookie'];
  const redacted = { ...obj };
  
  for (const key of Object.keys(redacted)) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      (redacted as Record<string, unknown>)[key] = '[REDACTED]';
    }
  }
  
  return redacted;
}
