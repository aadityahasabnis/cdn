/**
 * Authentication Middleware
 *
 * This module provides authentication and rate limiting middleware for the API.
 * It validates API keys using constant-time comparison to prevent timing attacks
 * and implements rate limiting based on client IP address.
 * 
 * @module middleware/auth
 */

import type { Context, Next } from "hono";
import type { HonoEnv } from "../types";
import { AuthenticationError, RateLimitError } from "../lib/errors";
import { RATE_LIMIT } from "../constants";

/**
 * Constant-time string comparison to prevent timing attacks
 * 
 * This implementation ensures that comparison always takes the same amount of time
 * regardless of where the strings differ, preventing attackers from using timing
 * information to guess API keys character by character.
 * 
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns True if strings are equal
 * 
 * @see https://en.wikipedia.org/wiki/Timing_attack
 */
function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) {
		// Still do a comparison to maintain constant time
		// but we know the result is false
		let result = 0;
		for (let i = 0; i < a.length; i++) {
			result |= a.charCodeAt(i) ^ (b.charCodeAt(i % b.length) || 0);
		}
		return false;
	}

	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

/**
 * Extract API key from request headers
 * 
 * Supports both `x-api-key` header and `Authorization: Bearer` header
 * for flexibility in client implementations.
 * 
 * @param c - Hono context
 * @returns API key or null if not found
 * 
 * @example
 * // Using x-api-key header
 * curl -H "x-api-key: your-key-here" ...
 * 
 * // Using Authorization header
 * curl -H "Authorization: Bearer your-key-here" ...
 */
function extractApiKey(c: Context): string | null {
	// Try x-api-key header first (preferred)
	const apiKey = c.req.header("x-api-key");
	if (apiKey) return apiKey;

	// Try Authorization header (Bearer token)
	const auth = c.req.header("Authorization");
	if (auth && auth.startsWith("Bearer ")) {
		return auth.substring(7);
	}

	return null;
}

/**
 * Authentication middleware for Hono
 *
 * Validates the API key against ADMIN_API_KEY environment variable.
 * Must be applied to protected routes (upload, delete, etc.).
 * 
 * @param c - Hono context
 * @param next - Next middleware function
 * @throws {AuthenticationError} If authentication fails
 * 
 * @example
 * app.post("/api/media/upload", authMiddleware, handleUpload);
 * app.delete("/api/media/delete", authMiddleware, handleDelete);
 */
export async function authMiddleware(
	c: Context<HonoEnv>,
	next: Next
): Promise<void> {
	const logger = c.get('logger');
	const providedKey = extractApiKey(c);
	const expectedKey = c.env.ADMIN_API_KEY;

	logger?.debug("Authenticating request", { hasKey: !!providedKey });

	// Check if API key is configured
	if (!expectedKey) {
		logger?.error("ADMIN_API_KEY is not configured in environment");
		throw new AuthenticationError("Server configuration error: API key not configured");
	}

	// Check if API key is provided
	if (!providedKey) {
		logger?.warn("Authentication failed: No API key provided");
		throw new AuthenticationError("API key is required. Include x-api-key header or Authorization: Bearer header.");
	}

	// Validate API key using constant-time comparison
	if (!timingSafeEqual(providedKey, expectedKey)) {
		logger?.warn("Authentication failed: Invalid API key");
		throw new AuthenticationError("Invalid API key");
	}

	// API key is valid
	logger?.debug("Authentication successful");
	c.set("isAuthenticated", true);
	
	await next();
}

/**
 * Optional auth middleware - doesn't block but sets auth status
 * 
 * Useful for routes that behave differently for authenticated users
 * without requiring authentication.
 * 
 * @param c - Hono context
 * @param next - Next middleware function
 * 
 * @example
 * app.get("/api/media/list", optionalAuthMiddleware, handleList);
 * // Then in handler:
 * const isAuth = c.get('isAuthenticated');
 * if (isAuth) {
 *   // Show private files too
 * }
 */
export async function optionalAuthMiddleware(
	c: Context<HonoEnv>,
	next: Next
): Promise<void> {
	const providedKey = extractApiKey(c);
	const expectedKey = c.env.ADMIN_API_KEY;

	// Set authentication status on context
	const isAuthenticated =
		providedKey && expectedKey && timingSafeEqual(providedKey, expectedKey);

	c.set("isAuthenticated", isAuthenticated);

	await next();
}

/**
 * Rate limiting middleware using D1 database
 *
 * Implements a sliding window rate limiter based on client IP address.
 * Rate limit is configurable via RATE_LIMIT_PER_MIN environment variable.
 * 
 * Implementation:
 * - Tracks requests per IP per minute window
 * - Window is based on current minute (timestamp / 60000)
 * - Old entries are cleaned up automatically
 * - Uses D1 UPSERT for atomic increment
 * 
 * @param c - Hono context
 * @param next - Next middleware function
 * @throws {RateLimitError} If rate limit is exceeded
 * 
 * @example
 * app.use("*", rateLimitMiddleware);
 */
export async function rateLimitMiddleware(
	c: Context<HonoEnv>,
	next: Next
): Promise<void> {
	const logger = c.get('logger');
	const db = c.env.DB;
	const limitPerMin = parseInt(c.env.RATE_LIMIT_PER_MIN || String(RATE_LIMIT.REQUESTS_PER_WINDOW), 10);

	// Get client IP from Cloudflare headers
	const clientIP =
		c.req.header("CF-Connecting-IP") ||
		c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ||
		"unknown";

	// Current minute bucket (timestamp in minutes)
	const currentWindow = Math.floor(Date.now() / RATE_LIMIT.WINDOW_MS);

	try {
		// Check current request count for this IP in this window
		const result = await db
			.prepare(
				"SELECT count FROM rate_limits WHERE ip = ? AND window = ?"
			)
			.bind(clientIP, currentWindow)
			.first<{ count: number }>();

		const currentCount = result?.count ?? 0;

		if (currentCount >= limitPerMin) {
			logger?.warn("Rate limit exceeded", { 
				clientIP, 
				currentCount, 
				limit: limitPerMin,
				window: currentWindow 
			});
			
			throw new RateLimitError(
				`Rate limit exceeded. Maximum ${limitPerMin} requests per minute.`,
				{ clientIP, currentCount, limit: limitPerMin }
			);
		}

		// Increment counter (upsert pattern)
		await db
			.prepare(
				`INSERT INTO rate_limits (ip, window, count) VALUES (?, ?, 1)
				 ON CONFLICT(ip, window) DO UPDATE SET count = count + 1`
			)
			.bind(clientIP, currentWindow)
			.run();

		logger?.debug("Rate limit check passed", { 
			clientIP, 
			count: currentCount + 1,
			limit: limitPerMin 
		});

		// Clean up old entries asynchronously (don't block the request)
		// Keep last 5 minutes for safety margin
		const cleanupWindow = currentWindow - RATE_LIMIT.CLEANUP_WINDOWS;
		c.executionCtx?.waitUntil(
			db
				.prepare("DELETE FROM rate_limits WHERE window < ?")
				.bind(cleanupWindow)
				.run()
				.catch((err) => {
					logger?.warn("Rate limit cleanup failed (non-critical)", { error: err });
				})
		);

		await next();
	} catch (error) {
		// If it's our rate limit error, re-throw it
		if (error instanceof RateLimitError) {
			throw error;
		}

		// Don't block request on rate limit check errors - log and continue
		// This ensures availability even if D1 has issues
		logger?.error("Rate limit check failed (non-critical, allowing request)", 
			error instanceof Error ? error : undefined,
			{ clientIP }
		);
		
		await next();
	}
}
