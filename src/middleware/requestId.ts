/**
 * Request ID Middleware
 * 
 * This middleware generates unique request IDs for tracing and correlating logs.
 * It also creates a request-scoped logger and attaches it to the context.
 * 
 * @module middleware/requestId
 */

import { Context, Next } from 'hono';
import { HonoEnv } from '../types';
import { createLogger, Logger } from '../lib/logger';

/**
 * Extended context with logger
 * This is used to type the context.get('logger') calls
 */
declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
    logger: Logger;
  }
}

/**
 * Generates a unique request ID
 * Uses crypto.randomUUID() if available, otherwise falls back to timestamp-based ID
 * 
 * @returns Unique request ID string
 */
function generateRequestId(): string {
  // Cloudflare Workers support crypto.randomUUID()
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback: timestamp + random
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Request ID middleware
 * Generates a unique ID for each request and creates a request-scoped logger
 * 
 * Usage:
 * ```typescript
 * app.use('*', requestIdMiddleware);
 * 
 * // In route handlers:
 * const logger = c.get('logger');
 * logger.info('Processing request');
 * ```
 * 
 * @param c - Hono context
 * @param next - Next middleware function
 */
export async function requestIdMiddleware(c: Context<HonoEnv>, next: Next) {
  // Check for existing request ID in header (for request tracing across services)
  const existingRequestId = c.req.header('X-Request-ID');
  const requestId = existingRequestId || generateRequestId();
  
  // Store request ID in context
  c.set('requestId', requestId);
  
  // Create request-scoped logger
  const logger = createLogger(requestId, {
    path: c.req.path,
    method: c.req.method,
  });
  
  c.set('logger', logger);
  
  // Add request ID to response headers for tracing
  c.header('X-Request-ID', requestId);
  
  // Log request start
  logger.info('Request started', {
    userAgent: c.req.header('User-Agent'),
  });
  
  const startTime = Date.now();
  
  try {
    await next();
    
    // Log request completion
    const duration = Date.now() - startTime;
    logger.info('Request completed', {
      statusCode: c.res.status,
      duration,
    });
  } catch (error) {
    // Log request failure
    const duration = Date.now() - startTime;
    logger.error('Request failed', error instanceof Error ? error : undefined, {
      duration,
    });
    
    // Re-throw to let error handler middleware catch it
    throw error;
  }
}
