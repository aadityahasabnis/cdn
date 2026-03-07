/**
 * D1 Database Service
 *
 * This module handles all interactions with Cloudflare D1 database for media metadata.
 * It provides functions for inserting, querying, updating, and deleting media records
 * with proper error handling and logging.
 * 
 * @module services/database
 */

import type { MediaRecord, MediaRow, FileType, ListQueryParams } from "../types";
import { DatabaseError, NotFoundError } from "../lib/errors";
import { Logger } from "../lib/logger";
import { PAGINATION } from "../constants";

/**
 * Convert D1 row to MediaRecord (parse JSON tags)
 * 
 * @param row - Raw database row
 * @returns Parsed media record with tags array
 */
function rowToRecord(row: MediaRow): MediaRecord {
	let tags: string[] = [];
	try {
		tags = JSON.parse(row.tags);
	} catch {
		tags = [];
	}

	return {
		...row,
		tags,
	};
}

/**
 * Insert a new media record into the database
 * 
 * @param db - D1 database binding
 * @param record - Media record to insert
 * @param logger - Optional logger for operation tracking
 * @returns Inserted record ID
 * @throws {DatabaseError} If insert fails
 * 
 * @example
 * const id = await insertMedia(db, {
 *   file_key: "images/blog/cat.png",
 *   public_url: "https://cdn.example.com/images/blog/cat.png",
 *   file_type: "image",
 *   mime_type: "image/png",
 *   size: 123456,
 *   folder: "blog",
 *   tags: ["animals", "cute"]
 * }, logger);
 */
export async function insertMedia(
	db: D1Database,
	record: {
		file_key: string;
		public_url: string;
		file_type: FileType;
		mime_type: string;
		size: number;
		folder: string;
		tags: string[];
		uploader_id?: string;
	},
	logger?: Logger
): Promise<number> {
	try {
		logger?.info("Inserting media record into database", { 
			file_key: record.file_key,
			file_type: record.file_type,
			folder: record.folder 
		});

		const result = await db
			.prepare(
				`INSERT INTO media (file_key, public_url, file_type, mime_type, size, folder, tags, uploader_id)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.bind(
				record.file_key,
				record.public_url,
				record.file_type,
				record.mime_type,
				record.size,
				record.folder,
				JSON.stringify(record.tags),
				record.uploader_id || null
			)
			.run();

		if (!result.success) {
			throw new DatabaseError("Insert operation failed", { file_key: record.file_key });
		}

		const id = result.meta.last_row_id as number;
		
		logger?.info("Media record inserted successfully", { id, file_key: record.file_key });
		
		return id;
	} catch (error) {
		if (error instanceof DatabaseError) {
			throw error;
		}
		
		const message = error instanceof Error ? error.message : "Unknown error";
		logger?.error("Database insert failed", error instanceof Error ? error : undefined, { 
			file_key: record.file_key 
		});
		
		throw new DatabaseError(
			`Failed to insert media record: ${message}`,
			{ file_key: record.file_key, originalError: message }
		);
	}
}

/**
 * Query media records with filters and pagination
 * 
 * @param db - D1 database binding
 * @param params - Query parameters (type, folder, page, limit)
 * @param logger - Optional logger for operation tracking
 * @returns Paginated media records
 * @throws {DatabaseError} If query fails
 * 
 * @example
 * const result = await queryMedia(db, {
 *   type: "image",
 *   folder: "blog",
 *   page: 1,
 *   limit: 50
 * }, logger);
 */
export async function queryMedia(
	db: D1Database,
	params: ListQueryParams,
	logger?: Logger
): Promise<{
	files: MediaRecord[];
	total: number;
	page: number;
	limit: number;
}> {
	const { type, folder, limit = PAGINATION.DEFAULT_LIMIT, page = PAGINATION.DEFAULT_PAGE } = params;
	const offset = (page - 1) * limit;

	logger?.info("Querying media records", { type, folder, page, limit });

	// Build WHERE conditions
	const conditions: string[] = [];
	const bindings: (string | number)[] = [];

	if (type) {
		conditions.push("file_type = ?");
		bindings.push(type);
	}

	if (folder) {
		conditions.push("folder = ?");
		bindings.push(folder);
	}

	const whereClause =
		conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

	try {
		// Get total count
		const countQuery = `SELECT COUNT(*) as count FROM media ${whereClause}`;
		const countResult = await db
			.prepare(countQuery)
			.bind(...bindings)
			.first<{ count: number }>();
		const total = countResult?.count ?? 0;

		// Get paginated results
		const dataQuery = `
			SELECT id, file_key, public_url, file_type, mime_type, size, folder, tags, uploaded_at, uploader_id
			FROM media
			${whereClause}
			ORDER BY uploaded_at DESC
			LIMIT ? OFFSET ?
		`;
		const dataResult = await db
			.prepare(dataQuery)
			.bind(...bindings, limit, offset)
			.all<MediaRow>();

		const files = (dataResult.results || []).map(rowToRecord);

		logger?.info("Media query completed", { 
			total, 
			returned: files.length,
			page,
			limit 
		});

		return {
			files,
			total,
			page,
			limit,
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		logger?.error("Database query failed", error instanceof Error ? error : undefined, { 
			type, 
			folder, 
			page, 
			limit 
		});
		
		throw new DatabaseError(
			`Failed to query media records: ${message}`,
			{ type, folder, page, limit, originalError: message }
		);
	}
}

/**
 * Get a single media record by file_key
 * 
 * @param db - D1 database binding
 * @param fileKey - R2 file key
 * @param logger - Optional logger for operation tracking
 * @returns Media record or null if not found
 * @throws {DatabaseError} If query fails
 */
export async function getMediaByKey(
	db: D1Database,
	fileKey: string,
	logger?: Logger
): Promise<MediaRecord | null> {
	try {
		logger?.debug("Getting media record by key", { fileKey });
		
		const result = await db
			.prepare(
				`SELECT id, file_key, public_url, file_type, mime_type, size, folder, tags, uploaded_at, uploader_id
				 FROM media WHERE file_key = ?`
			)
			.bind(fileKey)
			.first<MediaRow>();

		if (!result) {
			logger?.debug("Media record not found", { fileKey });
			return null;
		}
		
		logger?.debug("Media record found", { fileKey, id: result.id });
		
		return rowToRecord(result);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		logger?.error("Database get by key failed", error instanceof Error ? error : undefined, { fileKey });
		
		throw new DatabaseError(
			`Failed to get media record: ${message}`,
			{ fileKey, originalError: message }
		);
	}
}

/**
 * Get a single media record by ID
 * 
 * @param db - D1 database binding
 * @param id - Media record ID
 * @param logger - Optional logger for operation tracking
 * @returns Media record or null if not found
 * @throws {DatabaseError} If query fails
 */
export async function getMediaById(
	db: D1Database,
	id: number,
	logger?: Logger
): Promise<MediaRecord | null> {
	try {
		logger?.debug("Getting media record by ID", { id });
		
		const result = await db
			.prepare(
				`SELECT id, file_key, public_url, file_type, mime_type, size, folder, tags, uploaded_at, uploader_id
				 FROM media WHERE id = ?`
			)
			.bind(id)
			.first<MediaRow>();

		if (!result) {
			logger?.debug("Media record not found", { id });
			return null;
		}
		
		logger?.debug("Media record found", { id, file_key: result.file_key });
		
		return rowToRecord(result);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		logger?.error("Database get by ID failed", error instanceof Error ? error : undefined, { id });
		
		throw new DatabaseError(
			`Failed to get media record: ${message}`,
			{ id, originalError: message }
		);
	}
}

/**
 * Delete a media record by file_key
 * 
 * @param db - D1 database binding
 * @param fileKey - R2 file key
 * @param logger - Optional logger for operation tracking
 * @throws {DatabaseError} If delete fails
 * @throws {NotFoundError} If record not found
 */
export async function deleteMedia(
	db: D1Database,
	fileKey: string,
	logger?: Logger
): Promise<void> {
	try {
		logger?.info("Deleting media record", { fileKey });
		
		const result = await db
			.prepare("DELETE FROM media WHERE file_key = ?")
			.bind(fileKey)
			.run();

		if (!result.success) {
			throw new DatabaseError("Delete operation failed", { fileKey });
		}

		const changes = result.meta.changes ?? 0;
		if (changes === 0) {
			throw new NotFoundError("Media record not found", { fileKey });
		}

		logger?.info("Media record deleted successfully", { fileKey });
	} catch (error) {
		if (error instanceof DatabaseError || error instanceof NotFoundError) {
			throw error;
		}
		
		const message = error instanceof Error ? error.message : "Unknown error";
		logger?.error("Database delete failed", error instanceof Error ? error : undefined, { fileKey });
		
		throw new DatabaseError(
			`Failed to delete media record: ${message}`,
			{ fileKey, originalError: message }
		);
	}
}

/**
 * Delete a media record by ID
 * 
 * @param db - D1 database binding
 * @param id - Media record ID
 * @param logger - Optional logger for operation tracking
 * @throws {DatabaseError} If delete fails
 * @throws {NotFoundError} If record not found
 */
export async function deleteMediaById(
	db: D1Database,
	id: number,
	logger?: Logger
): Promise<void> {
	try {
		logger?.info("Deleting media record by ID", { id });
		
		const result = await db
			.prepare("DELETE FROM media WHERE id = ?")
			.bind(id)
			.run();

		if (!result.success) {
			throw new DatabaseError("Delete operation failed", { id });
		}

		const changes = result.meta.changes ?? 0;
		if (changes === 0) {
			throw new NotFoundError("Media record not found", { id });
		}

		logger?.info("Media record deleted successfully", { id });
	} catch (error) {
		if (error instanceof DatabaseError || error instanceof NotFoundError) {
			throw error;
		}
		
		const message = error instanceof Error ? error.message : "Unknown error";
		logger?.error("Database delete by ID failed", error instanceof Error ? error : undefined, { id });
		
		throw new DatabaseError(
			`Failed to delete media record: ${message}`,
			{ id, originalError: message }
		);
	}
}

/**
 * Get all unique folders in the database
 * 
 * @param db - D1 database binding
 * @param logger - Optional logger for operation tracking
 * @returns Array of folder names
 * @throws {DatabaseError} If query fails
 */
export async function getFolders(
	db: D1Database,
	logger?: Logger
): Promise<string[]> {
	try {
		logger?.debug("Getting unique folders");
		
		const result = await db
			.prepare("SELECT DISTINCT folder FROM media ORDER BY folder")
			.all<{ folder: string }>();

		const folders = (result.results || []).map((r) => r.folder);
		
		logger?.debug("Folders retrieved", { count: folders.length });
		
		return folders;
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		logger?.error("Database get folders failed", error instanceof Error ? error : undefined);
		
		throw new DatabaseError(
			`Failed to get folders: ${message}`,
			{ originalError: message }
		);
	}
}

/**
 * Get media statistics
 * 
 * @param db - D1 database binding
 * @param logger - Optional logger for operation tracking
 * @returns Statistics including totals by type and size
 * @throws {DatabaseError} If query fails
 */
export async function getStats(
	db: D1Database,
	logger?: Logger
): Promise<{
	total: number;
	images: number;
	videos: number;
	files: number;
	totalSize: number;
}> {
	try {
		logger?.debug("Getting media statistics");
		
		const result = await db
			.prepare(
				`SELECT 
					COUNT(*) as total,
					SUM(CASE WHEN file_type = 'image' THEN 1 ELSE 0 END) as images,
					SUM(CASE WHEN file_type = 'video' THEN 1 ELSE 0 END) as videos,
					SUM(CASE WHEN file_type = 'file' THEN 1 ELSE 0 END) as files,
					SUM(size) as totalSize
				 FROM media`
			)
			.first<{
				total: number;
				images: number;
				videos: number;
				files: number;
				totalSize: number;
			}>();

		const stats = {
			total: result?.total ?? 0,
			images: result?.images ?? 0,
			videos: result?.videos ?? 0,
			files: result?.files ?? 0,
			totalSize: result?.totalSize ?? 0,
		};
		
		logger?.info("Statistics retrieved", stats);
		
		return stats;
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		logger?.error("Database get stats failed", error instanceof Error ? error : undefined);
		
		throw new DatabaseError(
			`Failed to get statistics: ${message}`,
			{ originalError: message }
		);
	}
}
