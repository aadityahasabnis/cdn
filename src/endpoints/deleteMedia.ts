/**
 * Media Delete Endpoint
 *
 * DELETE /api/media/delete
 *
 * Request body (JSON):
 * - file_key: The R2 object key to delete (required)
 *
 * Also supports:
 * DELETE /api/media/:id (delete by ID)
 */

import type { Context } from "hono";
import type { Env, HonoEnv, DeleteResponse } from "../types";
import { jsonOk } from "../utils/response";
import { deleteObject } from "../services/r2";
import {
	deleteMedia,
	deleteMediaById,
	getMediaByKey,
	getMediaById,
} from "../services/database";
import { invalidateAllCache } from "../services/cache";
import { ValidationError, NotFoundError } from "../lib/errors";

/**
 * Handle media delete by file_key (body)
 * 
 * @param c - Hono context with environment bindings
 * @returns Delete confirmation response
 * @throws {ValidationError} If request body is invalid
 * @throws {NotFoundError} If file doesn't exist
 */
export async function handleDelete(c: Context<HonoEnv>): Promise<Response> {
	const logger = c.get("logger");

	logger.info("Processing delete request");

	// Parse JSON body
	let body: { file_key?: string };
	try {
		body = await c.req.json();
	} catch (error) {
		logger.warn("Invalid JSON body", { error });
		throw new ValidationError(
			'Invalid JSON body. Expected: { "file_key": "path/to/file" }'
		);
	}

	const { file_key } = body;

	if (!file_key || typeof file_key !== "string") {
		logger.warn("Missing file_key in request body");
		throw new ValidationError("Missing required field: file_key");
	}

	logger.debug("Delete requested", { file_key });

	// Check if file exists in database (throws NotFoundError if not found)
	const mediaRecord = await getMediaByKey(c.env.DB, file_key, logger);

	logger.info("File found, deleting from R2", { file_key });

	// Delete from R2 storage
	try {
		await deleteObject(c.env.MEDIA_BUCKET, file_key, logger);
	} catch (error) {
		// Log but continue - R2 delete is idempotent and DB is source of truth
		logger.warn("R2 delete failed, continuing with DB delete", {
			file_key,
			error,
		});
	}

	logger.info("Deleting from database", { file_key });

	// Delete from D1 database (throws DatabaseError on failure)
	await deleteMedia(c.env.DB, file_key, logger);

	logger.info("File deleted successfully", { file_key });

	// Invalidate cache (don't block response)
	c.executionCtx.waitUntil(
		invalidateAllCache(c.env.MEDIA_CACHE, mediaRecord.folder, logger)
	);

	// Return success response
	const response: DeleteResponse = {
		success: true,
		file_key,
		message: "File deleted successfully",
	};

	return jsonOk(response);
}

/**
 * Handle media delete by ID (URL param)
 * 
 * @param c - Hono context with environment bindings
 * @returns Delete confirmation response
 * @throws {ValidationError} If ID parameter is invalid
 * @throws {NotFoundError} If file doesn't exist
 */
export async function handleDeleteById(c: Context<HonoEnv>): Promise<Response> {
	const logger = c.get("logger");

	logger.info("Processing delete by ID request");

	const idParam = c.req.param("id");
	const id = parseInt(idParam, 10);

	if (isNaN(id) || id <= 0) {
		logger.warn("Invalid ID parameter", { idParam });
		throw new ValidationError("Invalid ID parameter");
	}

	logger.debug("Delete by ID requested", { id });

	// Get file info from database (throws NotFoundError if not found)
	const mediaRecord = await getMediaById(c.env.DB, id, logger);

	logger.info("File found, deleting from R2", {
		id,
		file_key: mediaRecord.file_key,
	});

	// Delete from R2 storage
	try {
		await deleteObject(c.env.MEDIA_BUCKET, mediaRecord.file_key, logger);
	} catch (error) {
		// Log but continue - R2 delete is idempotent
		logger.warn("R2 delete failed, continuing with DB delete", {
			file_key: mediaRecord.file_key,
			error,
		});
	}

	logger.info("Deleting from database", {
		id,
		file_key: mediaRecord.file_key,
	});

	// Delete from D1 database (throws DatabaseError on failure)
	await deleteMediaById(c.env.DB, id, logger);

	logger.info("File deleted successfully", {
		id,
		file_key: mediaRecord.file_key,
	});

	// Invalidate cache
	c.executionCtx.waitUntil(
		invalidateAllCache(c.env.MEDIA_CACHE, mediaRecord.folder, logger)
	);

	// Return success response
	const response: DeleteResponse = {
		success: true,
		file_key: mediaRecord.file_key,
		message: "File deleted successfully",
	};

	return jsonOk(response);
}
