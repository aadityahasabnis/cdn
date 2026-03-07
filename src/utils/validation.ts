// ===========================================================================
// Validation - Input validation for file uploads and parameters
// ===========================================================================

import type { FileType } from '../types';
import { FILE_SIZE, PAGINATION, FOLDER, TAGS } from '../constants';
import { ValidationError } from '../lib/errors';

// ===========================================================================
// MIME Type Configuration
// ===========================================================================

export const ALLOWED_MIME_TYPES = new Set([
	'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif', 'image/tiff', 'image/bmp', 'image/ico', 'image/x-icon',
	'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/mpeg',
	'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	'text/plain', 'text/csv', 'text/markdown',
	'application/zip', 'application/x-tar', 'application/gzip', 'application/x-rar-compressed', 'application/x-7z-compressed',
	'application/json', 'application/xml', 'text/xml',
]);

const MIME_TO_FILE_TYPE: Record<string, FileType> = {
	'image/jpeg': 'image', 'image/png': 'image', 'image/gif': 'image', 'image/webp': 'image', 
	'image/svg+xml': 'image', 'image/avif': 'image', 'image/tiff': 'image', 'image/bmp': 'image', 
	'image/ico': 'image', 'image/x-icon': 'image',
	'video/mp4': 'video', 'video/webm': 'video', 'video/ogg': 'video', 'video/quicktime': 'video',
	'video/x-msvideo': 'video', 'video/x-matroska': 'video', 'video/mpeg': 'video',
};

// ===========================================================================
// Validation Functions
// ===========================================================================

export const validateMimeType = (mimeType: string): void => {
	if (!mimeType) throw new ValidationError('MIME type is required');
	if (!ALLOWED_MIME_TYPES.has(mimeType)) {
		throw new ValidationError(`MIME type '${mimeType}' is not allowed. Allowed types: images, videos, documents, archives.`, { mimeType, allowed: Array.from(ALLOWED_MIME_TYPES) });
	}
};

export const validateFileSize = (size: number, maxBytes = FILE_SIZE.MAX_UPLOAD_MB * 1024 * 1024): void => {
	if (size <= 0) throw new ValidationError('File size must be greater than 0', { size });
	if (size > maxBytes) {
		const [maxMB, sizeMB] = [Math.round(maxBytes / (1024 * 1024)), Math.round(size / (1024 * 1024))];
		throw new ValidationError(`File size (${sizeMB} MB) exceeds maximum allowed size (${maxMB} MB)`, { size, maxBytes, sizeMB, maxMB });
	}
};

export const determineFileType = (mimeType: string, providedType?: FileType): FileType => {
	if (providedType && ['image', 'video', 'file'].includes(providedType)) return providedType;
	return MIME_TO_FILE_TYPE[mimeType] || (mimeType.startsWith('image/') ? 'image' : mimeType.startsWith('video/') ? 'video' : 'file');
};

export const parseTags = (tagsInput?: string): string[] => {
	if (!tagsInput) return [];
	try {
		const parsed = JSON.parse(tagsInput);
		if (Array.isArray(parsed)) return parsed.map(tag => String(tag).trim()).filter(Boolean).slice(0, TAGS.MAX_COUNT);
	} catch { /* Not JSON, parse as CSV */ }
	return tagsInput.split(',').map(tag => tag.trim()).filter(Boolean).slice(0, TAGS.MAX_COUNT);
};

export const validateFolder = (folder?: string): string => {
	if (!folder) return FOLDER.DEFAULT_NAME;
	const sanitized = folder.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, FOLDER.MAX_NAME_LENGTH);
	return sanitized || FOLDER.DEFAULT_NAME;
};

export const validatePagination = (page?: number, limit?: number): { page: number; limit: number } => ({
	page: Math.max(PAGINATION.MIN_PAGE, Math.floor(page || PAGINATION.DEFAULT_PAGE)),
	limit: Math.min(PAGINATION.MAX_LIMIT, Math.max(PAGINATION.MIN_LIMIT, Math.floor(limit || PAGINATION.DEFAULT_LIMIT))),
});
