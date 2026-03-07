// ===========================================================================
// Authentication Middleware
// ===========================================================================

import type { Context, Next } from 'hono';
import type { HonoEnv } from '../types';
import { AuthenticationError, RateLimitError } from '../lib/errors';
import { RATE_LIMIT } from '../constants';

// ===========================================================================
// Timing-Safe Comparison (Prevents Timing Attacks)
// ===========================================================================

const timingSafeEqual = (a: string, b: string): boolean => {
	if (a.length !== b.length) {
		let result = 0;
		for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ (b.charCodeAt(i % b.length) || 0);
		return false;
	}
	let result = 0;
	for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return result === 0;
};

// ===========================================================================
// API Key Extraction (x-api-key or Authorization: Bearer)
// ===========================================================================

const extractApiKey = (c: Context): string | null => {
	const apiKey = c.req.header('x-api-key');
	if (apiKey) return apiKey;
	const auth = c.req.header('Authorization');
	return auth?.startsWith('Bearer ') ? auth.substring(7) : null;
};

// ===========================================================================
// Auth Middleware (Required Authentication)
// ===========================================================================

export const authMiddleware = async (c: Context<HonoEnv>, next: Next): Promise<void> => {
	const logger = c.get('logger');
	const providedKey = extractApiKey(c);
	const expectedKey = c.env.ADMIN_API_KEY;

	logger?.debug('Authenticating request', { hasKey: !!providedKey });

	if (!expectedKey) {
		logger?.error('ADMIN_API_KEY is not configured in environment');
		throw new AuthenticationError('Server configuration error: API key not configured');
	}

	if (!providedKey) {
		logger?.warn('Authentication failed: No API key provided');
		throw new AuthenticationError('API key is required. Include x-api-key header or Authorization: Bearer header.');
	}

	if (!timingSafeEqual(providedKey, expectedKey)) {
		logger?.warn('Authentication failed: Invalid API key');
		throw new AuthenticationError('Invalid API key');
	}

	logger?.debug('Authentication successful');
	c.set('isAuthenticated', true);
	await next();
};

// ===========================================================================
// Optional Auth Middleware (Sets Auth Status, Doesn't Block)
// ===========================================================================

export const optionalAuthMiddleware = async (c: Context<HonoEnv>, next: Next): Promise<void> => {
	const providedKey = extractApiKey(c);
	const expectedKey = c.env.ADMIN_API_KEY;
	c.set('isAuthenticated', providedKey && expectedKey && timingSafeEqual(providedKey, expectedKey));
	await next();
};

// ===========================================================================
// Rate Limiting Middleware (D1-Based Sliding Window)
// ===========================================================================

export const rateLimitMiddleware = async (c: Context<HonoEnv>, next: Next): Promise<void> => {
	const logger = c.get('logger');
	const db = c.env.DB;
	const limitPerMin = parseInt(c.env.RATE_LIMIT_PER_MIN || String(RATE_LIMIT.REQUESTS_PER_WINDOW), 10);

	const clientIP = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown';
	const currentWindow = Math.floor(Date.now() / RATE_LIMIT.WINDOW_MS);

	try {
		const result = await db.prepare('SELECT count FROM rate_limits WHERE ip = ? AND window = ?').bind(clientIP, currentWindow).first<{ count: number }>();
		const currentCount = result?.count ?? 0;

		if (currentCount >= limitPerMin) {
			logger?.warn('Rate limit exceeded', { clientIP, currentCount, limit: limitPerMin, window: currentWindow });
			throw new RateLimitError(`Rate limit exceeded. Maximum ${limitPerMin} requests per minute.`, { clientIP, currentCount, limit: limitPerMin });
		}

		await db.prepare('INSERT INTO rate_limits (ip, window, count) VALUES (?, ?, 1) ON CONFLICT(ip, window) DO UPDATE SET count = count + 1').bind(clientIP, currentWindow).run();
		logger?.debug('Rate limit check passed', { clientIP, count: currentCount + 1, limit: limitPerMin });

		const cleanupWindow = currentWindow - RATE_LIMIT.CLEANUP_WINDOWS;
		c.executionCtx?.waitUntil(db.prepare('DELETE FROM rate_limits WHERE window < ?').bind(cleanupWindow).run().catch((err) => logger?.warn('Rate limit cleanup failed (non-critical)', { error: err })));

		await next();
	} catch (error) {
		if (error instanceof RateLimitError) throw error;
		logger?.error('Rate limit check failed (non-critical, allowing request)', error instanceof Error ? error : undefined, { clientIP });
		await next();
	}
};
