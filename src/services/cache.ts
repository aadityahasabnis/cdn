/**
 * KV Cache Service
 *
 * This module handles all interactions with Cloudflare KV for caching gallery results.
 * It implements smart cache invalidation strategies to minimize KV operations while
 * maintaining data consistency.
 * 
 * @module services/cache
 */

import type { CachedGalleryResult, MediaRecord, ListQueryParams } from "../types";
import { CacheError } from "../lib/errors";
import { Logger } from "../lib/logger";
import { CACHE, PAGINATION } from "../constants";

/**
 * Build a cache key from query parameters
 *
 * Format: `gallery:{type}:{folder}:p{page}:l{limit}`
 *
 * @param params - List query parameters
 * @returns Cache key string
 * 
 * @example
 * buildCacheKey({ page: 1, limit: 50 })
 * // "gallery:all:p1:l50"
 * 
 * buildCacheKey({ type: "image", page: 1, limit: 50 })
 * // "gallery:type:image:p1:l50"
 * 
 * buildCacheKey({ folder: "blog", page: 1, limit: 50 })
 * // "gallery:folder:blog:p1:l50"
 * 
 * buildCacheKey({ type: "image", folder: "blog", page: 1, limit: 50 })
 * // "gallery:type:image:folder:blog:p1:l50"
 */
export function buildCacheKey(params: ListQueryParams): string {
	const parts = ["gallery"];

	if (params.type) {
		parts.push(`type:${params.type}`);
	}

	if (params.folder) {
		parts.push(`folder:${params.folder}`);
	}

	if (parts.length === 1) {
		parts.push("all");
	}

	parts.push(`p${params.page || PAGINATION.DEFAULT_PAGE}`);
	parts.push(`l${params.limit || PAGINATION.DEFAULT_LIMIT}`);

	return parts.join(":");
}

/**
 * Get cached gallery result from KV
 *
 * @param kv - KV namespace binding
 * @param key - Cache key
 * @param logger - Optional logger for operation tracking
 * @returns Cached result or null if not found/expired
 * 
 * @example
 * const cached = await getCached(kv, "gallery:all:p1:l50", logger);
 * if (cached) {
 *   console.log(`Found ${cached.files.length} files (cached at ${cached.cached_at})`);
 * }
 */
export async function getCached(
	kv: KVNamespace,
	key: string,
	logger?: Logger
): Promise<CachedGalleryResult | null> {
	try {
		logger?.debug("Checking cache", { key });
		
		const cached = await kv.get(key, "json");
		
		if (!cached) {
			logger?.debug("Cache miss", { key });
			return null;
		}

		logger?.info("Cache hit", { key, filesCount: (cached as CachedGalleryResult).files?.length });
		
		return cached as CachedGalleryResult;
	} catch (error) {
		// Cache errors should not break the application - log and return null
		const message = error instanceof Error ? error.message : "Unknown error";
		logger?.warn("Cache get failed (non-critical)", { key, error: message });
		return null;
	}
}

/**
 * Set cached gallery result in KV
 *
 * @param kv - KV namespace binding
 * @param key - Cache key
 * @param result - Result to cache
 * @param ttl - Time to live in seconds (default from constants)
 * @param logger - Optional logger for operation tracking
 * 
 * @example
 * await setCached(kv, "gallery:all:p1:l50", {
 *   files: mediaFiles,
 *   total: 100,
 *   page: 1,
 *   limit: 50
 * }, undefined, logger);
 */
export async function setCached(
	kv: KVNamespace,
	key: string,
	result: {
		files: MediaRecord[];
		total: number;
		page: number;
		limit: number;
	},
	ttl: number = CACHE.GALLERY_TTL_SECONDS,
	logger?: Logger
): Promise<void> {
	try {
		const cacheEntry: CachedGalleryResult = {
			...result,
			cached_at: new Date().toISOString(),
		};

		logger?.debug("Setting cache", { key, ttl, filesCount: result.files.length });

		await kv.put(key, JSON.stringify(cacheEntry), {
			expirationTtl: ttl,
		});

		logger?.info("Cache set successfully", { key, ttl });
	} catch (error) {
		// Cache errors should not break the application - log and continue
		const message = error instanceof Error ? error.message : "Unknown error";
		logger?.warn("Cache set failed (non-critical)", { key, error: message });
	}
}

/**
 * Delete a specific cache key
 *
 * @param kv - KV namespace binding
 * @param key - Cache key to delete
 * @param logger - Optional logger for operation tracking
 * 
 * @example
 * await deleteCached(kv, "gallery:all:p1:l50", logger);
 */
export async function deleteCached(
	kv: KVNamespace,
	key: string,
	logger?: Logger
): Promise<void> {
	try {
		logger?.debug("Deleting cache key", { key });
		
		await kv.delete(key);
		
		logger?.debug("Cache key deleted", { key });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		logger?.warn("Cache delete failed (non-critical)", { key, error: message });
	}
}

/**
 * Invalidate all gallery cache entries
 *
 * This uses a smart invalidation strategy that targets known cache key patterns
 * rather than listing all KV keys (which is expensive).
 *
 * @param kv - KV namespace binding
 * @param logger - Optional logger for operation tracking
 * @returns Summary of invalidation operation
 * 
 * @example
 * const result = await invalidateGalleryCache(kv, logger);
 * console.log(`Invalidated ${result.keysDeleted} cache entries`);
 */
export async function invalidateGalleryCache(
	kv: KVNamespace,
	logger?: Logger
): Promise<{ success: boolean; keysDeleted: number }> {
	logger?.info("Invalidating gallery cache");
	
	// Known gallery cache key patterns
	const patterns = [
		"gallery:all",
		"gallery:type:image",
		"gallery:type:video",
		"gallery:type:file",
	];

	const keysToDelete: string[] = [];

	// Generate all possible cache keys for common pagination values
	// This is more efficient than listing all KV keys
	const pages = CACHE.INVALIDATION_PAGES;
	const limits = CACHE.INVALIDATION_LIMITS;

	for (const pattern of patterns) {
		for (const page of pages) {
			for (const limit of limits) {
				keysToDelete.push(`${pattern}:p${page}:l${limit}`);
			}
		}
	}

	logger?.debug("Deleting cache keys", { count: keysToDelete.length });

	// Delete all keys in parallel (KV delete is idempotent)
	try {
		await Promise.all(keysToDelete.map((key) => kv.delete(key)));
		
		logger?.info("Gallery cache invalidated successfully", { keysDeleted: keysToDelete.length });
		
		return {
			success: true,
			keysDeleted: keysToDelete.length,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		logger?.error("Gallery cache invalidation failed", error instanceof Error ? error : undefined);
		
		// Don't throw - cache invalidation failures should not break uploads/deletes
		return {
			success: false,
			keysDeleted: 0,
		};
	}
}

/**
 * Invalidate cache for a specific folder
 *
 * @param kv - KV namespace binding
 * @param folder - Folder name to invalidate
 * @param logger - Optional logger for operation tracking
 * 
 * @example
 * await invalidateFolderCache(kv, "blog", logger);
 */
export async function invalidateFolderCache(
	kv: KVNamespace,
	folder: string,
	logger?: Logger
): Promise<void> {
	logger?.info("Invalidating folder cache", { folder });
	
	const pages = CACHE.INVALIDATION_PAGES;
	const limits = CACHE.INVALIDATION_LIMITS;
	const keysToDelete: string[] = [];

	for (const page of pages) {
		for (const limit of limits) {
			keysToDelete.push(`gallery:folder:${folder}:p${page}:l${limit}`);
			// Also invalidate combined type+folder keys
			for (const type of ["image", "video", "file"]) {
				keysToDelete.push(
					`gallery:type:${type}:folder:${folder}:p${page}:l${limit}`
				);
			}
		}
	}

	try {
		await Promise.all(keysToDelete.map((key) => kv.delete(key)));
		logger?.info("Folder cache invalidated", { folder, keysDeleted: keysToDelete.length });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		logger?.warn("Folder cache invalidation failed (non-critical)", { folder, error: message });
	}
}

/**
 * Full cache invalidation - clears gallery cache and optional folder-specific caches
 *
 * This is called after uploads and deletes to ensure cache consistency.
 *
 * @param kv - KV namespace binding
 * @param folder - Optional folder to also invalidate
 * @param logger - Optional logger for operation tracking
 * 
 * @example
 * // After uploading to "blog" folder
 * await invalidateAllCache(kv, "blog", logger);
 * 
 * // General invalidation
 * await invalidateAllCache(kv, undefined, logger);
 */
export async function invalidateAllCache(
	kv: KVNamespace,
	folder?: string,
	logger?: Logger
): Promise<void> {
	logger?.info("Invalidating all cache", { folder });
	
	const operations: Promise<unknown>[] = [invalidateGalleryCache(kv, logger)];

	if (folder) {
		operations.push(invalidateFolderCache(kv, folder, logger));
	}

	await Promise.all(operations);
	
	logger?.info("Cache invalidation completed");
}
