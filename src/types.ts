/**
 * Type Definitions
 * 
 * This module contains all TypeScript type definitions for the media service.
 * It includes environment bindings, media types, API request/response types, and validation schemas.
 * 
 * @module types
 */

import { z } from "zod";
import type { Context } from "hono";

// ============================================
// Environment Bindings Type
// ============================================

/**
 * Cloudflare Workers environment bindings
 * These are configured in wrangler.jsonc and .dev.vars
 */
export interface Env {
	// R2 Bucket for storing media files
	MEDIA_BUCKET: R2Bucket;

	// D1 Database for metadata
	DB: D1Database;

	// KV Namespace for caching
	MEDIA_CACHE: KVNamespace;

	// Environment Variables
	/** Base URL for CDN (e.g., https://example.com/cdn) */
	CDN_BASE_URL: string;
	
	/** Maximum upload size in bytes */
	MAX_UPLOAD_BYTES: string;
	
	/** Rate limit per minute */
	RATE_LIMIT_PER_MIN: string;
	
	/** Environment name (development, production, etc.) */
	ENVIRONMENT: string;

	// Secrets (set via wrangler secret or .dev.vars)
	/** Admin API key for authenticated endpoints */
	ADMIN_API_KEY: string;
}

/**
 * Hono context with typed bindings
 * @deprecated Use HonoEnv instead
 */
export type AppContext = Context<{ 
	Bindings: Env;
	Variables: {
		isAuthenticated?: boolean;
	};
}>;

/**
 * Hono environment type with proper bindings and variables
 * This is the main type used throughout the application
 */
export type HonoEnv = {
	Bindings: Env;
	Variables: {
		/** Whether the request is authenticated */
		isAuthenticated?: boolean;
		/** Request ID for tracing */
		requestId?: string;
		/** Request-scoped logger */
		logger?: any;
	};
};

// ============================================
// Media Types
// ============================================

/**
 * Media file type classification
 */
export type FileType = "image" | "video" | "file";

/**
 * Media record as returned from the database
 * This represents a stored media file with all metadata
 */
export interface MediaRecord {
	/** Unique identifier */
	id: number;
	
	/** Storage key in R2 (e.g., "images/blog/1741300000000-x7k3p-cat.png") */
	file_key: string;
	
	/** Public CDN URL (e.g., "https://cdn.yourdomain.com/images/blog/...") */
	public_url: string;
	
	/** Media type classification */
	file_type: FileType;
	
	/** MIME type (e.g., "image/png") */
	mime_type: string;
	
	/** File size in bytes */
	size: number;
	
	/** Folder name (e.g., "blog", "products") */
	folder: string;
	
	/** Array of tags for categorization */
	tags: string[];
	
	/** ISO 8601 timestamp of upload */
	uploaded_at: string;
	
	/** Optional uploader identifier */
	uploader_id: string | null;
}

/**
 * Raw D1 database row
 * Tags are stored as JSON string in the database
 */
export interface MediaRow {
	id: number;
	file_key: string;
	public_url: string;
	file_type: FileType;
	mime_type: string;
	size: number;
	folder: string;
	/** JSON string representation of tags array */
	tags: string;
	uploaded_at: string;
	uploader_id: string | null;
}

// ============================================
// API Request/Response Types
// ============================================

/**
 * Upload endpoint request body (multipart/form-data)
 */
export interface UploadRequest {
	/** Media file to upload */
	file: File;
	
	/** Optional folder name (default: "root") */
	folder?: string;
	
	/** Optional type override (auto-detected if not provided) */
	type?: FileType;
	
	/** Optional comma-separated tags */
	tags?: string;
}

/**
 * Upload endpoint success response
 */
export interface UploadResponse {
	success: true;
	/** Storage key in R2 */
	file_key: string;
	/** Public CDN URL */
	public_url: string;
	/** MIME type */
	mime_type: string;
	/** File size in bytes */
	size: number;
}

/**
 * List endpoint query parameters
 */
export interface ListQueryParams {
	/** Filter by media type */
	type?: FileType;
	
	/** Filter by folder name */
	folder?: string;
	
	/** Items per page (1-100, default: 50) */
	limit?: number;
	
	/** Page number (default: 1) */
	page?: number;
}

/**
 * List endpoint success response
 */
export interface ListResponse {
	success: true;
	/** Array of media records */
	files: MediaRecord[];
	/** Total number of files matching filters */
	total: number;
	/** Current page number */
	page: number;
	/** Items per page */
	limit: number;
	/** Total number of pages */
	pages: number;
	/** Whether result was served from cache */
	from_cache: boolean;
}

/**
 * Delete endpoint request body
 */
export interface DeleteRequest {
	/** R2 storage key of file to delete */
	file_key: string;
}

/**
 * Delete endpoint success response
 */
export interface DeleteResponse {
	success: true;
	/** Deleted file key */
	file_key: string;
	/** Confirmation message */
	message: string;
}

/**
 * Error response format
 */
export interface ErrorResponse {
	success: false;
	/** Error message */
	error: string;
	/** Optional error code */
	code?: string;
}

// ============================================
// Cache Types
// ============================================

/**
 * Cached gallery list result
 * Includes timestamp for cache validation
 */
export interface CachedGalleryResult {
	/** Array of media records */
	files: MediaRecord[];
	/** Total count */
	total: number;
	/** Page number */
	page: number;
	/** Items per page */
	limit: number;
	/** ISO 8601 timestamp when cached */
	cached_at: string;
}

// ============================================
// Zod Schemas for Validation
// ============================================

/**
 * Media record validation schema
 */
export const MediaSchema = z.object({
	id: z.number(),
	file_key: z.string(),
	public_url: z.string().url(),
	file_type: z.enum(["image", "video", "file"]),
	mime_type: z.string(),
	size: z.number().positive(),
	folder: z.string(),
	tags: z.array(z.string()),
	uploaded_at: z.string(),
	uploader_id: z.string().nullable(),
});

/**
 * Upload request validation schema
 */
export const UploadRequestSchema = z.object({
	folder: z.string().optional().default("root"),
	type: z.enum(["image", "video", "file"]).optional(),
	tags: z.string().optional(),
});

/**
 * List query parameters validation schema
 */
export const ListQuerySchema = z.object({
	type: z.enum(["image", "video", "file"]).optional(),
	folder: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).optional().default(50),
	page: z.coerce.number().min(1).optional().default(1),
});

/**
 * Delete request validation schema
 */
export const DeleteRequestSchema = z.object({
	file_key: z.string().min(1),
});
