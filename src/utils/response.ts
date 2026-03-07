/**
 * HTTP Response Utilities
 * 
 * This module provides utilities for creating consistent HTTP responses
 * with proper CORS headers and error handling.
 * 
 * @module utils/response
 * @deprecated This module is deprecated in favor of using custom error classes.
 * Use the error classes from lib/errors.ts instead of the Errors object.
 */

import type { ErrorResponse } from "../types";
import { RATE_LIMIT } from "../constants";

/**
 * Get CORS headers for cross-origin requests
 * 
 * @param origin - Optional specific origin (default: *)
 * @returns CORS headers object
 */
export function corsHeaders(origin?: string): Record<string, string> {
	return {
		"Access-Control-Allow-Origin": origin || "*",
		"Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization, X-Request-ID",
		"Access-Control-Expose-Headers": "X-Request-ID",
		"Access-Control-Max-Age": "86400",
	};
}

/**
 * Create a successful JSON response
 * 
 * @param data - Response data object
 * @param status - HTTP status code (default: 200)
 * @param headers - Additional headers
 * @returns HTTP Response object
 */
export function jsonOk<T extends Record<string, any>>(
	data: T,
	status: number = 200,
	headers?: Record<string, string>
): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"Content-Type": "application/json",
			...corsHeaders(),
			...headers,
		},
	});
}

/**
 * Create an error JSON response
 * 
 * @deprecated Use custom error classes instead
 * @param error - Error message
 * @param status - HTTP status code
 * @param code - Optional error code
 * @param headers - Additional headers
 * @returns HTTP Response object
 */
export function jsonError(
	error: string,
	status: number = 400,
	code?: string,
	headers?: Record<string, string>
): Response {
	const body: ErrorResponse = {
		success: false,
		error,
		...(code && { code }),
	};

	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			...corsHeaders(),
			...headers,
		},
	});
}

/**
 * Common HTTP error responses
 * 
 * @deprecated Use custom error classes from lib/errors.ts instead
 * This object is kept for backward compatibility during migration
 */
export const Errors = {
	/** 400 Bad Request */
	badRequest: (message: string = "Bad request") => jsonError(message, 400),

	/** 401 Unauthorized */
	unauthorized: (message: string = "Unauthorized - Invalid or missing API key") =>
		jsonError(message, 401, "UNAUTHORIZED"),

	/** 403 Forbidden */
	forbidden: (message: string = "Forbidden") =>
		jsonError(message, 403, "FORBIDDEN"),

	/** 404 Not Found */
	notFound: (message: string = "Resource not found") =>
		jsonError(message, 404, "NOT_FOUND"),

	/** 413 Payload Too Large */
	payloadTooLarge: (message: string = "File size exceeds maximum limit") =>
		jsonError(message, 413, "PAYLOAD_TOO_LARGE"),

	/** 415 Unsupported Media Type */
	unsupportedMediaType: (message: string = "Unsupported file type") =>
		jsonError(message, 415, "UNSUPPORTED_MEDIA_TYPE"),

	/** 429 Too Many Requests */
	tooManyRequests: (message: string = `Rate limit exceeded. Maximum ${RATE_LIMIT.REQUESTS_PER_WINDOW} requests per minute.`) =>
		jsonError(message, 429, "RATE_LIMIT_EXCEEDED"),

	/** 500 Internal Server Error */
	internalError: (message: string = "Internal server error") =>
		jsonError(message, 500, "INTERNAL_ERROR"),
};

/**
 * Handle OPTIONS preflight request
 * 
 * @returns Response with CORS headers
 */
export function handleOptions(): Response {
	return new Response(null, {
		status: 204,
		headers: corsHeaders(),
	});
}

/**
 * Format file size for human-readable display
 * 
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 * 
 * @example
 * formatFileSize(1024) // "1 KB"
 * formatFileSize(1536000) // "1.46 MB"
 * formatFileSize(0) // "0 Bytes"
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes";

	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
