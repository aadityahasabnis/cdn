/**
 * Media Upload Endpoint
 *
 * POST /api/media/upload
 *
 * Accepts multipart/form-data with:
 * - file: The binary file to upload (required)
 * - folder: Logical folder name (optional, default: "root")
 * - type: image | video | file (optional, auto-detected from MIME)
 * - tags: Comma-separated tags (optional)
 */

import type { Context } from "hono";
import type { Env, HonoEnv, UploadResponse } from "../types";
import { generateFileKey, buildPublicUrl } from "../utils/fileName";
import {
	validateMimeType,
	validateFileSize,
	determineFileType,
	parseTags,
	validateFolder,
} from "../utils/validation";
import { jsonOk } from "../utils/response";
import { uploadObject } from "../services/r2";
import { insertMedia } from "../services/database";
import { invalidateAllCache } from "../services/cache";
import { FILE_SIZE } from "../constants";
import { ValidationError, StorageError, DatabaseError } from "../lib/errors";

/**
 * Handle media upload
 * 
 * @param c - Hono context with environment bindings
 * @returns Upload response with file metadata
 * @throws {ValidationError} If file validation fails
 * @throws {StorageError} If R2 upload fails
 * @throws {DatabaseError} If database insertion fails
 */
export async function handleUpload(c: Context<HonoEnv>): Promise<Response> {
	const logger = c.get("logger");

	logger.info("Processing upload request");

	// Get max upload size from environment
	const maxUploadBytes = parseInt(
		c.env.MAX_UPLOAD_BYTES || String(FILE_SIZE.MAX_UPLOAD_BYTES),
		10
	);

	// Parse multipart form data
	let formData: FormData;
	try {
		formData = await c.req.formData();
	} catch (error) {
		logger.warn("Failed to parse form data", { error });
		throw new ValidationError(
			"Invalid form data. Request must be multipart/form-data."
		);
	}

	const file = formData.get("file");

	// Validate file exists
	if (!file || !(file instanceof File)) {
		logger.warn("No file provided in upload request");
		throw new ValidationError(
			"No file provided. Include a 'file' field in form data."
		);
	}

	logger.debug("File received", {
		name: file.name,
		size: file.size,
		type: file.type,
	});

	// Validate MIME type (throws ValidationError)
	const mimeType = file.type;
	validateMimeType(mimeType);

	// Validate file size (throws ValidationError)
	validateFileSize(file.size, maxUploadBytes);

	// Get optional parameters
	const folderInput = formData.get("folder");
	const typeInput = formData.get("type");
	const tagsInput = formData.get("tags");

	// Validate and process parameters
	const folder = validateFolder(
		typeof folderInput === "string" ? folderInput : undefined
	);

	const fileType = determineFileType(
		mimeType,
		typeof typeInput === "string"
			? (typeInput as "image" | "video" | "file")
			: undefined
	);

	const tags = parseTags(typeof tagsInput === "string" ? tagsInput : undefined);

	logger.debug("Upload parameters validated", {
		folder,
		fileType,
		tags,
	});

	// Generate collision-safe file key
	const fileKey = generateFileKey(file.name, folder, fileType);

	// Build public CDN URL
	const publicUrl = buildPublicUrl(c.env.CDN_BASE_URL, fileKey);

	logger.info("Uploading to R2", { fileKey });

	// Upload to R2 (throws StorageError on failure)
	await uploadObject(
		c.env.MEDIA_BUCKET,
		fileKey,
		await file.arrayBuffer(),
		mimeType,
		{
			originalName: file.name,
			folder,
			type: fileType,
		},
		logger
	);

	logger.info("R2 upload successful, inserting metadata", { fileKey });

	// Insert metadata into D1 (throws DatabaseError on failure)
	try {
		await insertMedia(
			c.env.DB,
			{
				file_key: fileKey,
				public_url: publicUrl,
				file_type: fileType,
				mime_type: mimeType,
				size: file.size,
				folder,
				tags,
			},
			logger
		);
	} catch (error) {
		// Database insert failed - try to clean up R2 object
		logger.error("Database insert failed, attempting R2 cleanup", {
			fileKey,
			error,
		});

		// Best effort cleanup (don't block on this)
		c.executionCtx.waitUntil(
			c.env.MEDIA_BUCKET.delete(fileKey).catch((cleanupError) => {
				logger.warn("R2 cleanup failed", {
					fileKey,
					error: cleanupError,
				});
			})
		);

		// Re-throw the database error
		throw error;
	}

	logger.info("Upload completed successfully", {
		fileKey,
		publicUrl,
		size: file.size,
	});

	// Invalidate cache (don't block response on this)
	c.executionCtx.waitUntil(invalidateAllCache(c.env.MEDIA_CACHE, folder, logger));

	// Return success response
	const response: UploadResponse = {
		success: true,
		file_key: fileKey,
		public_url: publicUrl,
		mime_type: mimeType,
		size: file.size,
	};

	return jsonOk(response);
}
