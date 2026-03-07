// ===========================================================================
// Type Definitions
// ===========================================================================

import { z } from 'zod';
import type { Context } from 'hono';
import type { Logger } from './lib/logger';

// ===========================================================================
// Environment Bindings
// ===========================================================================

export interface Env {
	MEDIA_BUCKET: R2Bucket;
	DB: D1Database;
	MEDIA_CACHE: KVNamespace;
	CDN_BASE_URL: string;
	MAX_UPLOAD_BYTES: string;
	RATE_LIMIT_PER_MIN: string;
	ENVIRONMENT: string;
	ADMIN_API_KEY: string;
}

export type AppContext = Context<{ Bindings: Env; Variables: { isAuthenticated?: boolean } }>;

export type HonoEnv = {
	Bindings: Env;
	Variables: {
		isAuthenticated?: boolean;
		requestId?: string;
		logger?: Logger;
	};
};

// ===========================================================================
// Media Types
// ===========================================================================

export type FileType = 'image' | 'video' | 'file';

export interface MediaRecord {
	id: number;
	file_key: string;
	public_url: string;
	file_type: FileType;
	mime_type: string;
	size: number;
	folder: string;
	tags: string[];
	uploaded_at: string;
	uploader_id: string | null;
}

export interface MediaRow {
	id: number;
	file_key: string;
	public_url: string;
	file_type: FileType;
	mime_type: string;
	size: number;
	folder: string;
	tags: string;
	uploaded_at: string;
	uploader_id: string | null;
}

// ===========================================================================
// API Request/Response Types
// ===========================================================================

export interface UploadRequest {
	file: File;
	folder?: string;
	type?: FileType;
	tags?: string;
}

export interface UploadResponse extends Record<string, unknown> {
	success: true;
	file_key: string;
	public_url: string;
	mime_type: string;
	size: number;
}

export interface ListQueryParams {
	type?: FileType;
	folder?: string;
	limit?: number;
	page?: number;
}

export interface ListResponse extends Record<string, unknown> {
	success: true;
	files: MediaRecord[];
	total: number;
	page: number;
	limit: number;
	pages: number;
	from_cache: boolean;
}

export interface DeleteRequest {
	file_key: string;
}

export interface DeleteResponse extends Record<string, unknown> {
	success: true;
	file_key: string;
	message: string;
}

export interface ErrorResponse {
	success: false;
	error: string;
	code?: string;
}

// ===========================================================================
// Cache Types
// ===========================================================================

export interface CachedGalleryResult {
	files: MediaRecord[];
	total: number;
	page: number;
	limit: number;
	cached_at: string;
}

// ===========================================================================
// Zod Validation Schemas
// ===========================================================================

export const MediaSchema = z.object({
	id: z.number(),
	file_key: z.string(),
	public_url: z.string().url(),
	file_type: z.enum(['image', 'video', 'file']),
	mime_type: z.string(),
	size: z.number().positive(),
	folder: z.string(),
	tags: z.array(z.string()),
	uploaded_at: z.string(),
	uploader_id: z.string().nullable(),
});

export const UploadRequestSchema = z.object({
	folder: z.string().optional().default('root'),
	type: z.enum(['image', 'video', 'file']).optional(),
	tags: z.string().optional(),
});

export const ListQuerySchema = z.object({
	type: z.enum(['image', 'video', 'file']).optional(),
	folder: z.string().optional(),
	limit: z.coerce.number().min(1).max(100).optional().default(50),
	page: z.coerce.number().min(1).optional().default(1),
});

export const DeleteRequestSchema = z.object({
	file_key: z.string().min(1),
});
