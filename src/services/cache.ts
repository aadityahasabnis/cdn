// ===========================================================================
// KV Cache Service - Version-Based Caching (No Deletes Required)
// ===========================================================================

import type { CachedGalleryResult, MediaRecord, ListQueryParams } from '../types';
import { CacheError } from '../lib/errors';
import { Logger } from '../lib/logger';
import { CACHE, PAGINATION } from '../constants';

// ===========================================================================
// Cache Version Management (Stored in KV)
// ===========================================================================

const CACHE_VERSION_KEY = 'cache:version';

export const getCacheVersion = async (kv: KVNamespace): Promise<number> => {
	const version = await kv.get(CACHE_VERSION_KEY);
	return version ? parseInt(version, 10) : 1;
};

export const incrementCacheVersion = async (kv: KVNamespace, logger?: Logger): Promise<number> => {
	const currentVersion = await getCacheVersion(kv);
	const newVersion = currentVersion + 1;
	await kv.put(CACHE_VERSION_KEY, newVersion.toString());
	logger?.info('Cache version incremented', { oldVersion: currentVersion, newVersion });
	return newVersion;
};

// ===========================================================================
// Build Cache Key from Query Params (with version)
// ===========================================================================

export const buildCacheKey = async (params: ListQueryParams, kv: KVNamespace): Promise<string> => {
	const version = await getCacheVersion(kv);
	const parts = ['gallery', `v${version}`];
	if (params.type) parts.push(`type:${params.type}`);
	if (params.folder) parts.push(`folder:${params.folder}`);
	if (parts.length === 2) parts.push('all');
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
// Invalidate Cache Using Version Increment (Zero KV Deletes)
// ===========================================================================

export const invalidateCache = async (kv: KVNamespace, logger?: Logger): Promise<number> => {
	// Simply increment version - all old cache keys become stale automatically
	// Old keys expire naturally via TTL (no deletes needed)
	const newVersion = await incrementCacheVersion(kv, logger);
	logger?.info('Cache invalidated via version bump', { newVersion });
	return newVersion;
};
