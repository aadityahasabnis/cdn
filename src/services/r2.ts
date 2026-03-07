/**
 * R2 Object Storage Service
 *
 * This module handles all interactions with Cloudflare R2 bucket for storing media files.
 * It provides functions for uploading, deleting, and managing media objects with proper
 * error handling and logging.
 * 
 * @module services/r2
 */

import { StorageError } from "../lib/errors";
import { Logger } from "../lib/logger";
import { CACHE } from "../constants";

/**
 * Result of an upload operation
 */
export interface UploadResult {
	success: boolean;
	key: string;
	size: number;
	etag?: string;
}

/**
 * Result of a delete operation
 */
export interface DeleteResult {
	success: boolean;
	key: string;
}

/**
 * Upload a file to R2 bucket with proper error handling
 *
 * @param bucket - R2 bucket binding
 * @param key - Object key (path in bucket)
 * @param body - File content as ArrayBuffer, ReadableStream, string, or Blob
 * @param contentType - MIME type of the file
 * @param metadata - Optional custom metadata
 * @param logger - Optional logger for operation tracking
 * @returns Upload result with success status and metadata
 * @throws {StorageError} If upload fails
 * 
 * @example
 * const result = await uploadObject(
 *   bucket,
 *   "images/blog/cat.png",
 *   fileBuffer,
 *   "image/png",
 *   { originalName: "cat.png" },
 *   logger
 * );
 */
export async function uploadObject(
	bucket: R2Bucket,
	key: string,
	body: ArrayBuffer | ReadableStream<Uint8Array> | string | Blob,
	contentType: string,
	metadata?: Record<string, string>,
	logger?: Logger
): Promise<UploadResult> {
	try {
		logger?.info("Uploading object to R2", { key, contentType, metadataKeys: metadata ? Object.keys(metadata) : [] });

		const object = await bucket.put(key, body, {
			httpMetadata: {
				contentType,
				// Cache for 1 year (CDN will serve this)
				cacheControl: `public, max-age=${CACHE.CDN_MAX_AGE_SECONDS}, immutable`,
			},
			customMetadata: metadata,
		});

		logger?.info("Object uploaded successfully", { key, size: object.size, etag: object.etag });

		return {
			success: true,
			key,
			size: object.size,
			etag: object.etag,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		logger?.error("R2 upload failed", error instanceof Error ? error : undefined, { key, contentType });
		
		throw new StorageError(
			`Failed to upload file to R2: ${message}`,
			{ key, contentType, originalError: message }
		);
	}
}

/**
 * Delete an object from R2 bucket
 *
 * @param bucket - R2 bucket binding
 * @param key - Object key to delete
 * @param logger - Optional logger for operation tracking
 * @returns Delete result with success status
 * @throws {StorageError} If delete fails
 * 
 * @example
 * const result = await deleteObject(bucket, "images/blog/cat.png", logger);
 */
export async function deleteObject(
	bucket: R2Bucket,
	key: string,
	logger?: Logger
): Promise<DeleteResult> {
	try {
		logger?.info("Deleting object from R2", { key });
		
		await bucket.delete(key);
		
		logger?.info("Object deleted successfully", { key });
		
		return {
			success: true,
			key,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		logger?.error("R2 delete failed", error instanceof Error ? error : undefined, { key });
		
		throw new StorageError(
			`Failed to delete file from R2: ${message}`,
			{ key, originalError: message }
		);
	}
}

/**
 * Check if an object exists in R2 bucket
 *
 * @param bucket - R2 bucket binding
 * @param key - Object key to check
 * @param logger - Optional logger for operation tracking
 * @returns True if object exists, false otherwise
 * 
 * @example
 * const exists = await objectExists(bucket, "images/blog/cat.png");
 */
export async function objectExists(
	bucket: R2Bucket,
	key: string,
	logger?: Logger
): Promise<boolean> {
	try {
		const head = await bucket.head(key);
		const exists = head !== null;
		
		logger?.debug("Object existence check", { key, exists });
		
		return exists;
	} catch (error) {
		logger?.warn("Object existence check failed", { key });
		return false;
	}
}

/**
 * Get object metadata from R2 without fetching the entire object
 *
 * @param bucket - R2 bucket binding
 * @param key - Object key
 * @param logger - Optional logger for operation tracking
 * @returns Object metadata or null if not found
 * 
 * @example
 * const metadata = await getObjectMetadata(bucket, "images/blog/cat.png");
 * console.log(metadata?.size, metadata?.etag);
 */
export async function getObjectMetadata(
	bucket: R2Bucket,
	key: string,
	logger?: Logger
): Promise<R2Object | null> {
	try {
		const metadata = await bucket.head(key);
		
		logger?.debug("Object metadata retrieved", { 
			key, 
			found: metadata !== null,
			size: metadata?.size 
		});
		
		return metadata;
	} catch (error) {
		logger?.warn("Failed to get object metadata", { key });
		return null;
	}
}

/**
 * List objects in R2 bucket with optional prefix filtering
 *
 * @param bucket - R2 bucket binding
 * @param prefix - Optional prefix to filter objects
 * @param limit - Maximum number of objects to return (default: 1000)
 * @param logger - Optional logger for operation tracking
 * @returns List of objects matching the criteria
 * @throws {StorageError} If listing fails
 * 
 * @example
 * // List all images in blog folder
 * const objects = await listObjects(bucket, "images/blog/", 100);
 */
export async function listObjects(
	bucket: R2Bucket,
	prefix?: string,
	limit: number = 1000,
	logger?: Logger
): Promise<R2Objects> {
	try {
		logger?.debug("Listing objects from R2", { prefix, limit });
		
		const result = await bucket.list({
			prefix,
			limit,
		});
		
		logger?.info("Objects listed successfully", { 
			prefix, 
			count: result.objects.length,
			truncated: result.truncated 
		});
		
		return result;
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		logger?.error("R2 list failed", error instanceof Error ? error : undefined, { prefix, limit });
		
		throw new StorageError(
			`Failed to list objects from R2: ${message}`,
			{ prefix, limit, originalError: message }
		);
	}
}

/**
 * Delete multiple objects from R2 bucket in parallel
 *
 * Note: R2 delete operations are idempotent, so deleting non-existent objects
 * will not cause errors.
 *
 * @param bucket - R2 bucket binding
 * @param keys - Array of object keys to delete
 * @param logger - Optional logger for operation tracking
 * @returns Summary of deletion results
 * 
 * @example
 * const result = await deleteObjects(bucket, [
 *   "images/old/file1.png",
 *   "images/old/file2.png"
 * ]);
 * console.log(`Deleted: ${result.deleted.length}, Failed: ${result.failed.length}`);
 */
export async function deleteObjects(
	bucket: R2Bucket,
	keys: string[],
	logger?: Logger
): Promise<{ success: boolean; deleted: string[]; failed: string[] }> {
	logger?.info("Deleting multiple objects from R2", { count: keys.length });
	
	const deleted: string[] = [];
	const failed: string[] = [];

	// R2 delete is idempotent, so we can run in parallel
	const results = await Promise.allSettled(
		keys.map(async (key) => {
			await bucket.delete(key);
			return key;
		})
	);

	for (let i = 0; i < results.length; i++) {
		const result = results[i];
		if (result.status === "fulfilled") {
			deleted.push(result.value);
		} else {
			failed.push(keys[i]);
			logger?.warn("Failed to delete object", { key: keys[i], error: result.reason });
		}
	}

	logger?.info("Batch delete completed", { 
		total: keys.length,
		deleted: deleted.length,
		failed: failed.length 
	});

	return {
		success: failed.length === 0,
		deleted,
		failed,
	};
}
