// ===========================================================================
// Media List Endpoint (GET /api/media/list)
// ===========================================================================

import type { Context } from 'hono';
import type { Env, HonoEnv, ListResponse, ListQueryParams } from '../types';
import { validatePagination } from '../utils/validation';
import { jsonOk } from '../utils/response';
import { queryMedia } from '../services/database';
import { buildCacheKey, getCached, setCached } from '../services/cache';
import { ValidationError } from '../lib/errors';

// ===========================================================================
// List Handler
// ===========================================================================

export const handleList = async (c: Context<HonoEnv>): Promise<Response> => {
	const logger = c.get('logger');
	const url = new URL(c.req.url);
	const typeParam = url.searchParams.get('type');
	const folderParam = url.searchParams.get('folder');
	const limitParam = url.searchParams.get('limit');
	const pageParam = url.searchParams.get('page');

	logger.debug('List request parameters', { type: typeParam, folder: folderParam, limit: limitParam, page: pageParam });

	const validTypes = ['image', 'video', 'file'];
	const type = typeParam && validTypes.includes(typeParam) ? (typeParam as 'image' | 'video' | 'file') : undefined;
	const folder = folderParam || undefined;
	const { page, limit } = validatePagination(pageParam ? parseInt(pageParam, 10) : undefined, limitParam ? parseInt(limitParam, 10) : undefined);

	const queryParams: ListQueryParams = { type, folder, page, limit };
	const cacheKey = await buildCacheKey(queryParams, c.env.MEDIA_CACHE);
	const cached = await getCached(c.env.MEDIA_CACHE, cacheKey, logger);

	if (cached) {
		logger.info('Cache hit', { cacheKey });
		const response: ListResponse = { success: true, files: cached.files, total: cached.total, page: cached.page, limit: cached.limit, pages: Math.ceil(cached.total / cached.limit), from_cache: true };
		return jsonOk(response);
	}

	logger.info('Cache miss, querying database', { cacheKey });
	const result = await queryMedia(c.env.DB, queryParams, logger);
	logger.info('Database query successful', { total: result.total, returned: result.files.length });

	c.executionCtx.waitUntil(setCached(c.env.MEDIA_CACHE, cacheKey, { files: result.files, total: result.total, page: result.page, limit: result.limit }, undefined, logger));

	const response: ListResponse = { success: true, files: result.files, total: result.total, page: result.page, limit: result.limit, pages: Math.ceil(result.total / result.limit), from_cache: false };
	return jsonOk(response);
};
