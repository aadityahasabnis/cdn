/**
 * Media List Endpoint
 *
 * GET /api/media/list
 *
 * Query parameters:
 * - type: image | video | file (optional filter)
 * - folder: folder name (optional filter)
 * - limit: items per page, 1-100 (default: 50)
 * - page: page number, 1+ (default: 1)
 *
 * Returns cached results when available (KV cache with 5-minute TTL)
 */

import type { Context } from "hono";
import type { Env, HonoEnv, ListResponse, ListQueryParams } from "../types";
import { validatePagination } from "../utils/validation";
import { jsonOk } from "../utils/response";
import { queryMedia } from "../services/database";
import { buildCacheKey, getCached, setCached } from "../services/cache";
import { ValidationError } from "../lib/errors";

/**
 * Handle media list request
 * 
 * @param c - Hono context with environment bindings
 * @returns Paginated list of media files with metadata
 * @throws {ValidationError} If query parameters are invalid
 */
export async function handleList(c: Context<HonoEnv>): Promise<Response> {
	const logger = c.get("logger");

	// Parse query parameters
	const url = new URL(c.req.url);
	const typeParam = url.searchParams.get("type");
	const folderParam = url.searchParams.get("folder");
	const limitParam = url.searchParams.get("limit");
	const pageParam = url.searchParams.get("page");

	logger.debug("List request parameters", {
		type: typeParam,
		folder: folderParam,
		limit: limitParam,
		page: pageParam,
	});

	// Validate type parameter
	const validTypes = ["image", "video", "file"];
	const type =
		typeParam && validTypes.includes(typeParam)
			? (typeParam as "image" | "video" | "file")
			: undefined;

	// Get folder (or undefined)
	const folder = folderParam || undefined;

	// Validate pagination (throws ValidationError on invalid input)
	const { page, limit } = validatePagination(
		pageParam ? parseInt(pageParam, 10) : undefined,
		limitParam ? parseInt(limitParam, 10) : undefined
	);

	// Build query params object
	const queryParams: ListQueryParams = {
		type,
		folder,
		page,
		limit,
	};

	// Check KV cache first
	const cacheKey = buildCacheKey(queryParams);
	const cached = await getCached(c.env.MEDIA_CACHE, cacheKey, logger);

	if (cached) {
		logger.info("Cache hit", { cacheKey });

		// Return cached result
		const response: ListResponse = {
			success: true,
			files: cached.files,
			total: cached.total,
			page: cached.page,
			limit: cached.limit,
			pages: Math.ceil(cached.total / cached.limit),
			from_cache: true,
		};

		return jsonOk(response);
	}

	logger.info("Cache miss, querying database", { cacheKey });

	// Cache miss - query D1 database
	const result = await queryMedia(c.env.DB, queryParams, logger);

	logger.info("Database query successful", {
		total: result.total,
		returned: result.files.length,
	});

	// Store in cache (don't block response)
	c.executionCtx.waitUntil(
		setCached(
			c.env.MEDIA_CACHE,
			cacheKey,
			{
				files: result.files,
				total: result.total,
				page: result.page,
				limit: result.limit,
			},
			logger
		)
	);

	// Return response
	const response: ListResponse = {
		success: true,
		files: result.files,
		total: result.total,
		page: result.page,
		limit: result.limit,
		pages: Math.ceil(result.total / result.limit),
		from_cache: false,
	};

	return jsonOk(response);
}
