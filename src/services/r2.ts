// ===========================================================================
// R2 Object Storage Service
// ===========================================================================

import { StorageError } from '../lib/errors';
import { Logger } from '../lib/logger';
import { CACHE } from '../constants';

// ===========================================================================
// Types
// ===========================================================================

export interface UploadResult {
	success: boolean;
	key: string;
	size: number;
	etag?: string;
}

export interface DeleteResult {
	success: boolean;
	key: string;
}

// ===========================================================================
// Upload Object to R2
// ===========================================================================

export const uploadObject = async (bucket: R2Bucket, key: string, body: ArrayBuffer | ReadableStream<Uint8Array> | string | Blob, contentType: string, metadata?: Record<string, string>, logger?: Logger): Promise<UploadResult> => {
	try {
		logger?.info('Uploading object to R2', { key, contentType, metadataKeys: metadata ? Object.keys(metadata) : [] });
		const object = await bucket.put(key, body, { httpMetadata: { contentType, cacheControl: `public, max-age=${CACHE.CDN_MAX_AGE_SECONDS}, immutable` }, customMetadata: metadata });
		logger?.info('Object uploaded successfully', { key, size: object.size, etag: object.etag });
		return { success: true, key, size: object.size, etag: object.etag };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		logger?.error('R2 upload failed', error instanceof Error ? error : undefined, { key, contentType });
		throw new StorageError(`Failed to upload file to R2: ${message}`, { key, contentType, originalError: message });
	}
};

// ===========================================================================
// Delete Object from R2
// ===========================================================================

export const deleteObject = async (bucket: R2Bucket, key: string, logger?: Logger): Promise<DeleteResult> => {
	try {
		logger?.info('Deleting object from R2', { key });
		await bucket.delete(key);
		logger?.info('Object deleted successfully', { key });
		return { success: true, key };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		logger?.error('R2 delete failed', error instanceof Error ? error : undefined, { key });
		throw new StorageError(`Failed to delete file from R2: ${message}`, { key, originalError: message });
	}
};

// ===========================================================================
// Check if Object Exists
// ===========================================================================

export const objectExists = async (bucket: R2Bucket, key: string, logger?: Logger): Promise<boolean> => {
	try {
		const head = await bucket.head(key);
		const exists = head !== null;
		logger?.debug('Object existence check', { key, exists });
		return exists;
	} catch (error) {
		logger?.warn('Object existence check failed', { key });
		return false;
	}
};

// ===========================================================================
// Get Object Metadata
// ===========================================================================

export const getObjectMetadata = async (bucket: R2Bucket, key: string, logger?: Logger): Promise<R2Object | null> => {
	try {
		const metadata = await bucket.head(key);
		logger?.debug('Object metadata retrieved', { key, found: metadata !== null, size: metadata?.size });
		return metadata;
	} catch (error) {
		logger?.warn('Failed to get object metadata', { key });
		return null;
	}
};

// ===========================================================================
// List Objects with Prefix Filtering
// ===========================================================================

export const listObjects = async (bucket: R2Bucket, prefix?: string, limit: number = 1000, logger?: Logger): Promise<R2Objects> => {
	try {
		logger?.debug('Listing objects from R2', { prefix, limit });
		const result = await bucket.list({ prefix, limit });
		logger?.info('Objects listed successfully', { prefix, count: result.objects.length, truncated: result.truncated });
		return result;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		logger?.error('R2 list failed', error instanceof Error ? error : undefined, { prefix, limit });
		throw new StorageError(`Failed to list objects from R2: ${message}`, { prefix, limit, originalError: message });
	}
};

// ===========================================================================
// Delete Multiple Objects (Parallel)
// ===========================================================================

export const deleteObjects = async (bucket: R2Bucket, keys: string[], logger?: Logger): Promise<{ success: boolean; deleted: string[]; failed: string[] }> => {
	logger?.info('Deleting multiple objects from R2', { count: keys.length });
	const deleted: string[] = [];
	const failed: string[] = [];
	const results = await Promise.allSettled(keys.map(async (key) => { await bucket.delete(key); return key; }));
	for (let i = 0; i < results.length; i++) {
		const result = results[i];
		if (result.status === 'fulfilled') deleted.push(result.value);
		else { failed.push(keys[i]); logger?.warn('Failed to delete object', { key: keys[i], error: result.reason }); }
	}
	logger?.info('Batch delete completed', { total: keys.length, deleted: deleted.length, failed: failed.length });
	return { success: failed.length === 0, deleted, failed };
};
