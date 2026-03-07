// ===========================================================================
// HTTP Response Utilities (Deprecated - Use lib/errors.ts)
// ===========================================================================

import type { ErrorResponse } from '../types';
import { RATE_LIMIT } from '../constants';

// ===========================================================================
// CORS Headers
// ===========================================================================

export const corsHeaders = (origin?: string): Record<string, string> => ({
	'Access-Control-Allow-Origin': origin || '*',
	'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization, X-Request-ID',
	'Access-Control-Expose-Headers': 'X-Request-ID',
	'Access-Control-Max-Age': '86400',
});

// ===========================================================================
// JSON Response Helpers
// ===========================================================================

export const jsonOk = <T extends Record<string, unknown>>(data: T, status: number = 200, headers?: Record<string, string>): Response => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders(), ...headers } });

export const jsonError = (error: string, status: number = 400, code?: string, headers?: Record<string, string>): Response => {
	const body: ErrorResponse = { success: false, error, ...(code && { code }) };
	return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders(), ...headers } });
};

// ===========================================================================
// Common Error Responses (Deprecated)
// ===========================================================================

export const Errors = {
	badRequest: (message: string = 'Bad request') => jsonError(message, 400),
	unauthorized: (message: string = 'Unauthorized - Invalid or missing API key') => jsonError(message, 401, 'UNAUTHORIZED'),
	forbidden: (message: string = 'Forbidden') => jsonError(message, 403, 'FORBIDDEN'),
	notFound: (message: string = 'Resource not found') => jsonError(message, 404, 'NOT_FOUND'),
	payloadTooLarge: (message: string = 'File size exceeds maximum limit') => jsonError(message, 413, 'PAYLOAD_TOO_LARGE'),
	unsupportedMediaType: (message: string = 'Unsupported file type') => jsonError(message, 415, 'UNSUPPORTED_MEDIA_TYPE'),
	tooManyRequests: (message: string = `Rate limit exceeded. Maximum ${RATE_LIMIT.REQUESTS_PER_WINDOW} requests per minute.`) => jsonError(message, 429, 'RATE_LIMIT_EXCEEDED'),
	internalError: (message: string = 'Internal server error') => jsonError(message, 500, 'INTERNAL_ERROR'),
};

// ===========================================================================
// OPTIONS Preflight Handler
// ===========================================================================

export const handleOptions = (): Response => new Response(null, { status: 204, headers: corsHeaders() });

// ===========================================================================
// Format File Size for Display
// ===========================================================================

export const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
