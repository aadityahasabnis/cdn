// ===========================================================================
// KV Cache Service
// ===========================================================================

import type { CachedGalleryResult, MediaRecord, ListQueryParams } from '../types';
import { CacheError } from '../lib/errors';
import { Logger } from '../lib/logger';
import { CACHE, PAGINATION } from '../constants';

// ===========================================================================
// Build Cache Key from Query Params
// ===========================================================================

export const buildCacheKey = (params: ListQueryParams): string => {
	const parts = ['gallery'];
	if (params.type) parts.push(`type:${params.type}`);
	if (params.folder) parts.push(`folder:${params.folder}`);
	if (parts.length === 1) parts.push('all');
	parts.push(`p${params.page || PAGINATION.DEFAULT_PAGE}`);
	parts.push(`l${params.limit || PAGINATION.DEFAULT_LIMIT}`);
	return parts.join(':');
};

// ===========================================================================
// Get Cached Gallery Result
// ===========================================================================

export const getCached = async (kv: KVNamespace, key: string, logger?: Logger): Promise<CachedGalleryResult | null> => {
	try {
		logger?.debug('Checking cache', { key });
		const cached = await kv.get(key, 'json');
		if (!cached) { logger?.debug('Cache miss', { key }); return null; }
		logger?.info('Cache hit', { key, filesCount: (cached as CachedGalleryResult).files?.length });
		return cached as CachedGalleryResult;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		logger?.warn('Cache get failed (non-critical)', { key, error: message });
		return null;
	}
};

// ===========================================================================
// Set Cached Gallery Result
// ===========================================================================

export const setCached = async (kv: KVNamespace, key: string, result: { files: MediaRecord[]; total: number; page: number; limit: number }, ttl: number = CACHE.GALLERY_TTL_SECONDS, logger?: Logger): Promise<void> => {
	try {
		const cacheEntry: CachedGalleryResult = { ...result, cached_at: new Date().toISOString() };
		logger?.debug('Setting cache', { key, ttl, filesCount: result.files.length });
		await kv.put(key, JSON.stringify(cacheEntry), { expirationTtl: ttl });
		logger?.info('Cache set successfully', { key, ttl });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		logger?.warn('Cache set failed (non-critical)', { key, error: message });
	}
};

// ===========================================================================
// Delete Cache Key
// ===========================================================================

export const deleteCached = async (kv: KVNamespace, key: string, logger?: Logger): Promise<void> => {
	try {
		logger?.debug('Deleting cache key', { key });
		await kv.delete(key);
		logger?.debug('Cache key deleted', { key });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		logger?.warn('Cache delete failed (non-critical)', { key, error: message });
	}
};

// ===========================================================================
// Invalidate Gallery Cache (Smart Pattern-Based)
// ===========================================================================

export const invalidateGalleryCache = async (kv: KVNamespace, logger?: Logger): Promise<{ success: boolean; keysDeleted: number }> => {
	logger?.info('Invalidating gallery cache');
	const patterns = ['gallery:all', 'gallery:type:image', 'gallery:type:video', 'gallery:type:file'];
	const keysToDelete: string[] = [];
	const pages = CACHE.INVALIDATION_PAGES;
	const limits = CACHE.INVALIDATION_LIMITS;
	for (const pattern of patterns) for (const page of pages) for (const limit of limits) keysToDelete.push(`${pattern}:p${page}:l${limit}`);
	logger?.debug('Deleting cache keys', { count: keysToDelete.length });
	try {
		await Promise.all(keysToDelete.map((key) => kv.delete(key)));
		logger?.info('Gallery cache invalidated successfully', { keysDeleted: keysToDelete.length });
		return { success: true, keysDeleted: keysToDelete.length };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		logger?.error('Gallery cache invalidation failed', error instanceof Error ? error : undefined);
		return { success: false, keysDeleted: 0 };
	}
};

// ===========================================================================
// Invalidate Folder-Specific Cache
// ===========================================================================

export const invalidateFolderCache = async (kv: KVNamespace, folder: string, logger?: Logger): Promise<void> => {
	logger?.info('Invalidating folder cache', { folder });
	const pages = CACHE.INVALIDATION_PAGES;
	const limits = CACHE.INVALIDATION_LIMITS;
	const keysToDelete: string[] = [];
	for (const page of pages) for (const limit of limits) {
		keysToDelete.push(`gallery:folder:${folder}:p${page}:l${limit}`);
		for (const type of ['image', 'video', 'file']) keysToDelete.push(`gallery:type:${type}:folder:${folder}:p${page}:l${limit}`);
	}
	try {
		await Promise.all(keysToDelete.map((key) => kv.delete(key)));
		logger?.info('Folder cache invalidated', { folder, keysDeleted: keysToDelete.length });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		logger?.warn('Folder cache invalidation failed (non-critical)', { folder, error: message });
	}
};

// ===========================================================================
// Invalidate All Cache (Gallery + Optional Folder)
// ===========================================================================

export const invalidateAllCache = async (kv: KVNamespace, folder?: string, logger?: Logger): Promise<void> => {
	logger?.info('Invalidating all cache', { folder });
	const operations: Promise<unknown>[] = [invalidateGalleryCache(kv, logger)];
	if (folder) operations.push(invalidateFolderCache(kv, folder, logger));
	await Promise.all(operations);
	logger?.info('Cache invalidation completed');
};
