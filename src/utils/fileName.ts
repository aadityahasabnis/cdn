// ===========================================================================
// File Name Utilities - Collision-safe file naming and URL generation
// ===========================================================================

import type { FileType } from '../types';
import { FILE_NAME, FOLDER } from '../constants';

// ===========================================================================
// Helper Functions
// ===========================================================================

const generateNanoId = (length = FILE_NAME.NANOID_LENGTH): string => {
	const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const randomValues = new Uint8Array(length);
	crypto.getRandomValues(randomValues);
	return Array.from(randomValues).map(v => chars[v % chars.length]).join('');
};

const getTypeFolder = (fileType: FileType): string =>
	({ image: 'images', video: 'videos', file: 'files' }[fileType] || 'files');

// ===========================================================================
// Public API
// ===========================================================================

export const sanitizeFilename = (filename: string): string => {
	const lastDot = filename.lastIndexOf('.');
	const ext = lastDot > 0 ? filename.slice(lastDot) : '';
	const name = lastDot > 0 ? filename.slice(0, lastDot) : filename;
	const sanitized = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, FILE_NAME.MAX_NAME_LENGTH).replace(/^-|-$/g, '');
	return sanitized + ext.toLowerCase();
};

export const generateFileKey = (originalFilename: string, folder: string, fileType: FileType): string => {
	const timestamp = Date.now();
	const nanoid = generateNanoId();
	const sanitized = sanitizeFilename(originalFilename);
	const typeFolder = getTypeFolder(fileType);
	const sanitizedFolder = folder.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || FOLDER.DEFAULT_NAME;
	return `${typeFolder}/${sanitizedFolder}/${timestamp}-${nanoid}-${sanitized}`;
};

export const buildPublicUrl = (cdnBaseUrl: string, fileKey: string): string =>
	`${cdnBaseUrl.replace(/\/$/, '')}/${fileKey}`;

export const extractFolderFromKey = (fileKey: string): string => {
	const parts = fileKey.split('/');
	return parts.length >= 2 ? parts[1] : FOLDER.DEFAULT_NAME;
};

export const buildOptimizedImageUrl = (
	cdnBaseUrl: string,
	fileKey: string,
	options: { width?: number; height?: number; fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad'; quality?: number; format?: 'auto' | 'webp' | 'avif' | 'json' }
): string => {
	const base = cdnBaseUrl.replace(/\/$/, '');
	const transforms = [
		options.width && `width=${options.width}`,
		options.height && `height=${options.height}`,
		options.fit && `fit=${options.fit}`,
		options.quality && `quality=${options.quality}`,
		options.format && `format=${options.format}`,
	].filter(Boolean);
	return transforms.length === 0 ? `${base}/${fileKey}` : `${base}/cdn-cgi/image/${transforms.join(',')}/${fileKey}`;
};
