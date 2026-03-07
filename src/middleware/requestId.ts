// ===========================================================================
// Request ID Middleware - Unique ID generation for request tracing
// ===========================================================================

import type { Context, Next } from 'hono';
import type { HonoEnv } from '../types';
import { createLogger, type Logger } from '../lib/logger';

declare module 'hono' {
	interface ContextVariableMap {
		requestId: string;
		logger: Logger;
	}
}

// ===========================================================================
// Request ID Generation
// ===========================================================================

const generateRequestId = (): string =>
	crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

// ===========================================================================
// Middleware
// ===========================================================================

export const requestIdMiddleware = async (c: Context<HonoEnv>, next: Next): Promise<void> => {
	const requestId = c.req.header('X-Request-ID') || generateRequestId();
	const logger = createLogger(requestId, { path: c.req.path, method: c.req.method });
	const startTime = Date.now();

	c.set('requestId', requestId);
	c.set('logger', logger);
	c.header('X-Request-ID', requestId);

	logger.info('Request started', { userAgent: c.req.header('User-Agent') });

	try {
		await next();
		logger.info('Request completed', { statusCode: c.res.status, duration: Date.now() - startTime });
	} catch (error) {
		logger.error('Request failed', error instanceof Error ? error : undefined, { duration: Date.now() - startTime });
		throw error;
	}
};
