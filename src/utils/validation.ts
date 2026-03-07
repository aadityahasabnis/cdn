/**
 * Validation Utilities
 * 
 * This module provides validation functions for file uploads, MIME types,
 * file sizes, folders, and pagination parameters.
 * 
 * @module utils/validation
 */

import type { FileType } from "../types";
import { FILE_SIZE, PAGINATION, FOLDER, TAGS } from "../constants";
import { ValidationError } from "../lib/errors";

/**
 * Allowed MIME types for upload
 * Organized by category for easier maintenance
 */
export const ALLOWED_MIME_TYPES = new Set([
	// Images
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"image/svg+xml",
	"image/avif",
	"image/tiff",
	"image/bmp",
	"image/ico",
	"image/x-icon",

	// Videos
	"video/mp4",
	"video/webm",
	"video/ogg",
	"video/quicktime",
	"video/x-msvideo",
	"video/x-matroska",
	"video/mpeg",

	// Documents
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.ms-powerpoint",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation",
	"text/plain",
	"text/csv",
	"text/markdown",

	// Archives
	"application/zip",
	"application/x-tar",
	"application/gzip",
	"application/x-rar-compressed",
	"application/x-7z-compressed",

	// Other
	"application/json",
	"application/xml",
	"text/xml",
]);

/**
 * MIME type to file type mapping
 * Used for auto-detection of file types from MIME types
 */
const MIME_TO_FILE_TYPE: Record<string, FileType> = {
	// Images
	"image/jpeg": "image",
	"image/png": "image",
	"image/gif": "image",
	"image/webp": "image",
	"image/svg+xml": "image",
	"image/avif": "image",
	"image/tiff": "image",
	"image/bmp": "image",
	"image/ico": "image",
	"image/x-icon": "image",

	// Videos
	"video/mp4": "video",
	"video/webm": "video",
	"video/ogg": "video",
	"video/quicktime": "video",
	"video/x-msvideo": "video",
	"video/x-matroska": "video",
	"video/mpeg": "video",
};

/**
 * Validate MIME type against allowlist
 * 
 * @param mimeType - The MIME type to validate
 * @returns True if valid, otherwise throws ValidationError
 * @throws {ValidationError} If MIME type is invalid or not allowed
 */
export function validateMimeType(mimeType: string): void {
	if (!mimeType) {
		throw new ValidationError("MIME type is required");
	}

	if (!ALLOWED_MIME_TYPES.has(mimeType)) {
		throw new ValidationError(
			`MIME type '${mimeType}' is not allowed. Allowed types: images, videos, documents, archives.`,
			{ mimeType, allowed: Array.from(ALLOWED_MIME_TYPES) }
		);
	}
}

/**
 * Validate file size against maximum
 * 
 * @param size - File size in bytes
 * @param maxBytes - Maximum allowed size in bytes
 * @throws {ValidationError} If file size is invalid
 */
export function validateFileSize(
	size: number,
	maxBytes: number = FILE_SIZE.MAX_UPLOAD_MB * 1024 * 1024
): void {
	if (size <= 0) {
		throw new ValidationError("File size must be greater than 0", { size });
	}

	if (size > maxBytes) {
		const maxMB = Math.round(maxBytes / (1024 * 1024));
		const sizeMB = Math.round(size / (1024 * 1024));
		throw new ValidationError(
			`File size (${sizeMB} MB) exceeds maximum allowed size (${maxMB} MB)`,
			{ size, maxBytes, sizeMB, maxMB }
		);
	}
}

/**
 * Determine file type from MIME type
 * This consolidates file type detection logic used across the codebase
 * 
 * @param mimeType - The MIME type to analyze
 * @param providedType - Optional user-provided type override
 * @returns The determined file type (image, video, or file)
 */
export function determineFileType(
	mimeType: string,
	providedType?: FileType
): FileType {
	// If provided type is valid, use it
	if (providedType && ["image", "video", "file"].includes(providedType)) {
		return providedType;
	}

	// Try exact MIME match first
	const detected = MIME_TO_FILE_TYPE[mimeType];
	if (detected) {
		return detected;
	}

	// Fallback to prefix matching
	if (mimeType.startsWith("image/")) {
		return "image";
	}
	if (mimeType.startsWith("video/")) {
		return "video";
	}

	// Default to "file" for documents and other types
	return "file";
}

/**
 * Parse tags from comma-separated string or JSON array
 * 
 * @param tagsInput - Tags as comma-separated string or JSON array
 * @returns Array of trimmed, non-empty tags (max 10 tags)
 */
export function parseTags(tagsInput?: string): string[] {
	if (!tagsInput) return [];

	// Try to parse as JSON array first
	try {
		const parsed = JSON.parse(tagsInput);
		if (Array.isArray(parsed)) {
			return parsed
				.map((tag) => String(tag).trim())
				.filter(Boolean)
				.slice(0, TAGS.MAX_COUNT);
		}
	} catch {
		// Not JSON, treat as comma-separated
	}

	// Parse as comma-separated string
	return tagsInput
		.split(",")
		.map((tag) => tag.trim())
		.filter(Boolean)
		.slice(0, TAGS.MAX_COUNT);
}

/**
 * Validate and sanitize folder name
 * 
 * @param folder - Raw folder name from user input
 * @returns Sanitized folder name (default: "root")
 */
export function validateFolder(folder?: string): string {
	if (!folder) return FOLDER.DEFAULT_NAME;

	// Sanitize and validate folder name
	const sanitized = folder
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, FOLDER.MAX_NAME_LENGTH);

	return sanitized || FOLDER.DEFAULT_NAME;
}

/**
 * Validate and normalize pagination parameters
 * 
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 * @returns Validated pagination parameters
 */
export function validatePagination(
	page?: number,
	limit?: number
): { page: number; limit: number } {
	const validPage = Math.max(PAGINATION.MIN_PAGE, Math.floor(page || PAGINATION.DEFAULT_PAGE));
	const validLimit = Math.min(
		PAGINATION.MAX_LIMIT,
		Math.max(PAGINATION.MIN_LIMIT, Math.floor(limit || PAGINATION.DEFAULT_LIMIT))
	);

	return { page: validPage, limit: validLimit };
}
