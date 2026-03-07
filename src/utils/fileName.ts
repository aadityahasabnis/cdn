/**
 * File Name Utilities
 * 
 * This module provides utilities for generating safe, collision-resistant file names
 * and building CDN URLs for media files.
 * 
 * @module utils/fileName
 */

import type { FileType } from "../types";
import { FILE_NAME, FOLDER } from "../constants";

/**
 * Generate a cryptographically random ID using browser/worker crypto API
 * 
 * @param length - Length of the ID (default: 8)
 * @returns Random alphanumeric string
 */
function generateNanoId(length: number = FILE_NAME.NANOID_LENGTH): string {
	const chars =
		"0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
	let result = "";
	const randomValues = new Uint8Array(length);
	crypto.getRandomValues(randomValues);
	for (let i = 0; i < length; i++) {
		result += chars[randomValues[i] % chars.length];
	}
	return result;
}

/**
 * Sanitize filename to be URL-safe and collision-resistant
 * 
 * Transformations:
 * - Remove special characters (keep only alphanumeric, spaces, and hyphens)
 * - Replace spaces with hyphens
 * - Convert to lowercase
 * - Limit length to prevent issues
 * - Preserve file extension
 * 
 * @param filename - Original filename
 * @returns Sanitized, URL-safe filename
 * 
 * @example
 * sanitizeFilename("My Photo (1).JPG") // "my-photo-1.jpg"
 * sanitizeFilename("déjà vu!.png") // "dj-vu.png"
 */
export function sanitizeFilename(filename: string): string {
	// Get extension
	const lastDot = filename.lastIndexOf(".");
	const ext = lastDot > 0 ? filename.slice(lastDot) : "";
	const name = lastDot > 0 ? filename.slice(0, lastDot) : filename;

	// Sanitize name
	const sanitized = name
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "") // Remove special chars
		.replace(/\s+/g, "-") // Spaces to hyphens
		.replace(/-+/g, "-") // Multiple hyphens to single
		.slice(0, FILE_NAME.MAX_NAME_LENGTH) // Limit length
		.replace(/^-|-$/g, ""); // Remove leading/trailing hyphens

	return sanitized + ext.toLowerCase();
}

/**
 * Get folder path prefix based on file type
 * 
 * @param fileType - The media file type
 * @returns Folder name for the file type
 * 
 * @example
 * getTypeFolder("image") // "images"
 * getTypeFolder("video") // "videos"
 */
function getTypeFolder(fileType: FileType): string {
	switch (fileType) {
		case "image":
			return "images";
		case "video":
			return "videos";
		case "file":
			return "files";
		default:
			return "files";
	}
}

/**
 * Generate a collision-safe file key for R2 storage
 *
 * Format: `{type}/{folder}/{timestamp}-{nanoid}-{sanitizedFilename}`
 *
 * @param originalFilename - Original uploaded filename
 * @param folder - Logical folder name (will be sanitized)
 * @param fileType - Media file type (image, video, file)
 * @returns Collision-safe file key for R2
 * 
 * @example
 * generateFileKey("cat.png", "blog", "image")
 * // "images/blog/1741300000000-x7k3p2m9-cat.png"
 * 
 * generateFileKey("Docker Intro.mp4", "tutorial", "video")
 * // "videos/tutorial/1741300000001-m2q9r5t8-docker-intro.mp4"
 */
export function generateFileKey(
	originalFilename: string,
	folder: string,
	fileType: FileType
): string {
	const timestamp = Date.now();
	const nanoid = generateNanoId();
	const sanitized = sanitizeFilename(originalFilename);
	const typeFolder = getTypeFolder(fileType);

	// Sanitize folder name
	const sanitizedFolder = folder
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "") || FOLDER.DEFAULT_NAME;

	return `${typeFolder}/${sanitizedFolder}/${timestamp}-${nanoid}-${sanitized}`;
}

/**
 * Build public CDN URL from file key
 * 
 * @param cdnBaseUrl - Base CDN URL (e.g., "https://example.com/cdn")
 * @param fileKey - R2 file key
 * @returns Full public CDN URL
 * 
 * @example
 * buildPublicUrl("https://cdn.example.com/cdn", "images/blog/file.png")
 * // "https://cdn.example.com/cdn/images/blog/file.png"
 */
export function buildPublicUrl(cdnBaseUrl: string, fileKey: string): string {
	// Remove trailing slash from base URL
	const base = cdnBaseUrl.replace(/\/$/, "");
	return `${base}/${fileKey}`;
}

/**
 * Extract folder name from file key
 * 
 * @param fileKey - R2 file key
 * @returns Folder name (default: "root")
 * 
 * @example
 * extractFolderFromKey("images/blog/cat.png") // "blog"
 * extractFolderFromKey("videos/tutorial/intro.mp4") // "tutorial"
 */
export function extractFolderFromKey(fileKey: string): string {
	const parts = fileKey.split("/");
	if (parts.length >= 2) {
		return parts[1]; // Return the folder portion
	}
	return FOLDER.DEFAULT_NAME;
}

/**
 * Build optimized image URL using Cloudflare Image Resizing
 * 
 * This uses Cloudflare's built-in image transformation API to serve
 * optimized versions of images on-the-fly.
 * 
 * @param cdnBaseUrl - Base CDN URL
 * @param fileKey - R2 file key
 * @param options - Image transformation options
 * @returns Optimized image URL
 * 
 * @see https://developers.cloudflare.com/images/image-resizing/
 * 
 * @example
 * buildOptimizedImageUrl(cdnUrl, "images/blog/cat.png", { width: 800 })
 * // "/cdn-cgi/image/width=800/images/blog/cat.png"
 * 
 * buildOptimizedImageUrl(cdnUrl, fileKey, { width: 200, height: 200, fit: "cover" })
 * // "/cdn-cgi/image/width=200,height=200,fit=cover/images/blog/cat.png"
 */
export function buildOptimizedImageUrl(
	cdnBaseUrl: string,
	fileKey: string,
	options: {
		width?: number;
		height?: number;
		fit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
		quality?: number;
		format?: "auto" | "webp" | "avif" | "json";
	}
): string {
	const base = cdnBaseUrl.replace(/\/$/, "");
	const transforms: string[] = [];

	if (options.width) transforms.push(`width=${options.width}`);
	if (options.height) transforms.push(`height=${options.height}`);
	if (options.fit) transforms.push(`fit=${options.fit}`);
	if (options.quality) transforms.push(`quality=${options.quality}`);
	if (options.format) transforms.push(`format=${options.format}`);

	if (transforms.length === 0) {
		return `${base}/${fileKey}`;
	}

	return `${base}/cdn-cgi/image/${transforms.join(",")}/${fileKey}`;
}
