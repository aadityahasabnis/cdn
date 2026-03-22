// ===========================================================================
// Imports
// ===========================================================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { StatusCode } from 'hono/utils/http-status';
import type { HonoEnv } from './types';
import { authMiddleware, rateLimitMiddleware } from './middleware/auth';
import { requestIdMiddleware } from './middleware/requestId';
import { handleUpload } from './endpoints/upload';
import { handleList } from './endpoints/listMedia';
import { handleDelete, handleDeleteById } from './endpoints/deleteMedia';
import { getStats, getFolders } from './services/database';
import { jsonOk, Errors, handleOptions } from './utils/response';
import { renderTestUIHTML } from './ui/testUI';
import { validateEnvironment } from './config';
import { AppError, formatErrorResponse, DatabaseError, StorageError } from './lib/errors';
import { logger } from './lib/logger';

const app = new Hono<HonoEnv>();

// ===========================================================================
// Environment Validation
// ===========================================================================

app.use('*', async (c, next) => {
	try { validateEnvironment(c.env); await next(); } 
	catch (error) { logger.error('Environment validation failed', error instanceof Error ? error : undefined); return c.json({ error: 'Configuration error: Missing required environment variables', details: error instanceof Error ? error.message : 'Unknown error' }, 500); }
});

// ===========================================================================
// Global Middleware
// ===========================================================================

app.use('*', requestIdMiddleware);
app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'], allowHeaders: ['Content-Type', 'x-api-key', 'Authorization', 'X-Request-ID'], exposeHeaders: ['X-Request-ID'], maxAge: 86400 }));
app.use('*', rateLimitMiddleware);

// ===========================================================================
// Health & Info Endpoints
// ===========================================================================

app.get('/health', (c) => jsonOk({ success: true, status: 'healthy', service: 'media-service', timestamp: new Date().toISOString() }));
app.get('/', (c) => {
	const uiAccessPassword = c.env.UI_ACCESS_PASSWORD || c.env.ADMIN_API_KEY;
	return c.html(renderTestUIHTML(uiAccessPassword));
});
app.get('/api', (c) => jsonOk({ success: true, name: 'Media Service API', version: '1.0.0', description: 'Cloudflare-based media hosting backend', endpoints: { upload: 'POST /api/media/upload', list: 'GET /api/media/list', delete: 'DELETE /api/media/delete', deleteById: 'DELETE /api/media/:id', stats: 'GET /api/media/stats', folders: 'GET /api/media/folders', health: 'GET /health' }, documentation: { upload: { method: 'POST', path: '/api/media/upload', auth: 'Required (x-api-key header)', contentType: 'multipart/form-data', fields: { file: 'File (required) - The file to upload', folder: 'String (optional) - Folder name (default: root)', type: 'String (optional) - image|video|file (auto-detected)', tags: 'String (optional) - Comma-separated tags' } }, list: { method: 'GET', path: '/api/media/list', auth: 'Not required', params: { type: 'Filter by type (image|video|file)', folder: 'Filter by folder name', limit: 'Items per page (1-100, default: 50)', page: 'Page number (default: 1)' } }, delete: { method: 'DELETE', path: '/api/media/delete', auth: 'Required (x-api-key header)', body: '{ "file_key": "path/to/file" }' } } }));

// ===========================================================================
// Media API Routes
// ===========================================================================

app.post('/api/media/upload', authMiddleware, handleUpload);
app.get('/api/media/list', handleList);
app.delete('/api/media/delete', authMiddleware, handleDelete);
app.delete('/api/media/:id', authMiddleware, handleDeleteById);

app.get('/api/media/stats', async (c) => {
	const logger = c.get('logger');
	try { const stats = await getStats(c.env.DB); logger.info('Stats retrieved', { stats }); return jsonOk({ success: true, ...stats }); } 
	catch (error) { logger.error('Stats error', error instanceof Error ? error : undefined); throw new DatabaseError('Failed to get statistics'); }
});

app.get('/api/media/folders', async (c) => {
	const logger = c.get('logger');
	try { const folders = await getFolders(c.env.DB); logger.info('Folders retrieved', { count: folders.length }); return jsonOk({ success: true, folders }); } 
	catch (error) { logger.error('Folders error', error instanceof Error ? error : undefined); throw new DatabaseError('Failed to get folders'); }
});

app.post('/api/media/cache/clear', authMiddleware, async (c) => {
	const logger = c.get('logger');
	try {
		const list = await c.env.MEDIA_CACHE.list();
		let deleted = 0;
		for (const key of list.keys) { await c.env.MEDIA_CACHE.delete(key.name); deleted++; }
		logger.info('Cache cleared', { deleted });
		return jsonOk({ success: true, message: `Cleared ${deleted} cache entries`, deleted });
	} catch (error) { logger.error('Cache clear error', error instanceof Error ? error : undefined); throw new DatabaseError('Failed to clear cache'); }
});

// ===========================================================================
// CDN Route (Serve Files from R2)
// ===========================================================================

app.get('/cdn/*', async (c) => {
	const logger = c.get('logger');
	try {
		const filePath = c.req.path.substring(5);
		if (!filePath) throw new StorageError('File path is required');
		const object = await c.env.MEDIA_BUCKET.get(filePath);
		if (!object) throw new StorageError(`File not found: ${filePath}`);
		logger.info('File served from CDN', { filePath, size: object.size });
		const headers = new Headers();
		object.writeHttpMetadata(headers);
		headers.set('etag', object.httpEtag);
		headers.set('cache-control', 'public, max-age=31536000, immutable');
		return new Response(object.body, { headers });
	} catch (error) { logger.error('CDN error', error instanceof Error ? error : undefined); throw error instanceof AppError ? error : new StorageError('Failed to serve file'); }
});

// ===========================================================================
// Handlers
// ===========================================================================

app.options('*', () => handleOptions());
app.notFound((c) => Errors.notFound(`Endpoint not found: ${c.req.method} ${c.req.path}`));
app.onError((err, c) => {
	const logger = c.get('logger');
	const showDetails = c.env.ENVIRONMENT === 'development';
	logger.error('Unhandled error', err instanceof Error ? err : undefined);
	const errorResponse = formatErrorResponse(err, showDetails);
	return c.json(errorResponse, errorResponse.statusCode as 400 | 401 | 403 | 404 | 409 | 413 | 415 | 429 | 500);
});

export default app;
