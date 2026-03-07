// ===========================================================================
// D1 Database Service
// ===========================================================================

import type { MediaRecord, MediaRow, FileType, ListQueryParams } from '../types';
import { DatabaseError, NotFoundError } from '../lib/errors';
import { Logger } from '../lib/logger';
import { PAGINATION } from '../constants';

// ===========================================================================
// Helper: Convert Row to Record
// ===========================================================================

const rowToRecord = (row: MediaRow): MediaRecord => {
	let tags: string[] = [];
	try { tags = JSON.parse(row.tags); } catch { tags = []; }
	return { ...row, tags };
};

// ===========================================================================
// Insert Media Record
// ===========================================================================

export const insertMedia = async (db: D1Database, record: { file_key: string; public_url: string; file_type: FileType; mime_type: string; size: number; folder: string; tags: string[]; uploader_id?: string }, logger?: Logger): Promise<number> => {
	try {
		logger?.info('Inserting media record into database', { file_key: record.file_key, file_type: record.file_type, folder: record.folder });
		const result = await db.prepare('INSERT INTO media (file_key, public_url, file_type, mime_type, size, folder, tags, uploader_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(record.file_key, record.public_url, record.file_type, record.mime_type, record.size, record.folder, JSON.stringify(record.tags), record.uploader_id || null).run();
		if (!result.success) throw new DatabaseError('Insert operation failed', { file_key: record.file_key });
		const id = result.meta.last_row_id as number;
		logger?.info('Media record inserted successfully', { id, file_key: record.file_key });
		return id;
	} catch (error) {
		if (error instanceof DatabaseError) throw error;
		const message = error instanceof Error ? error.message : 'Unknown error';
		logger?.error('Database insert failed', error instanceof Error ? error : undefined, { file_key: record.file_key });
		throw new DatabaseError(`Failed to insert media record: ${message}`, { file_key: record.file_key, originalError: message });
	}
};

// ===========================================================================
// Query Media with Filters & Pagination
// ===========================================================================

export const queryMedia = async (db: D1Database, params: ListQueryParams, logger?: Logger): Promise<{ files: MediaRecord[]; total: number; page: number; limit: number }> => {
	const { type, folder, limit = PAGINATION.DEFAULT_LIMIT, page = PAGINATION.DEFAULT_PAGE } = params;
	const offset = (page - 1) * limit;
	logger?.info('Querying media records', { type, folder, page, limit });

	const conditions: string[] = [];
	const bindings: (string | number)[] = [];
	if (type) { conditions.push('file_type = ?'); bindings.push(type); }
	if (folder) { conditions.push('folder = ?'); bindings.push(folder); }
	const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

	try {
		const countResult = await db.prepare(`SELECT COUNT(*) as count FROM media ${whereClause}`).bind(...bindings).first<{ count: number }>();
		const total = countResult?.count ?? 0;
		const dataResult = await db.prepare(`SELECT id, file_key, public_url, file_type, mime_type, size, folder, tags, uploaded_at, uploader_id FROM media ${whereClause} ORDER BY uploaded_at DESC LIMIT ? OFFSET ?`).bind(...bindings, limit, offset).all<MediaRow>();
		const files = (dataResult.results || []).map(rowToRecord);
		logger?.info('Media query completed', { total, returned: files.length, page, limit });
		return { files, total, page, limit };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		logger?.error('Database query failed', error instanceof Error ? error : undefined, { type, folder, page, limit });
		throw new DatabaseError(`Failed to query media records: ${message}`, { type, folder, page, limit, originalError: message });
	}
};

// ===========================================================================
// Get Media by File Key
// ===========================================================================

export const getMediaByKey = async (db: D1Database, fileKey: string, logger?: Logger): Promise<MediaRecord | null> => {
	try {
		logger?.debug('Getting media record by key', { fileKey });
		const result = await db.prepare('SELECT id, file_key, public_url, file_type, mime_type, size, folder, tags, uploaded_at, uploader_id FROM media WHERE file_key = ?').bind(fileKey).first<MediaRow>();
		if (!result) { logger?.debug('Media record not found', { fileKey }); return null; }
		logger?.debug('Media record found', { fileKey, id: result.id });
		return rowToRecord(result);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		logger?.error('Database get by key failed', error instanceof Error ? error : undefined, { fileKey });
		throw new DatabaseError(`Failed to get media record: ${message}`, { fileKey, originalError: message });
	}
};

// ===========================================================================
// Get Media by ID
// ===========================================================================

export const getMediaById = async (db: D1Database, id: number, logger?: Logger): Promise<MediaRecord | null> => {
	try {
		logger?.debug('Getting media record by ID', { id });
		const result = await db.prepare('SELECT id, file_key, public_url, file_type, mime_type, size, folder, tags, uploaded_at, uploader_id FROM media WHERE id = ?').bind(id).first<MediaRow>();
		if (!result) { logger?.debug('Media record not found', { id }); return null; }
		logger?.debug('Media record found', { id, file_key: result.file_key });
		return rowToRecord(result);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		logger?.error('Database get by ID failed', error instanceof Error ? error : undefined, { id });
		throw new DatabaseError(`Failed to get media record: ${message}`, { id, originalError: message });
	}
};

// ===========================================================================
// Delete Media by File Key
// ===========================================================================

export const deleteMedia = async (db: D1Database, fileKey: string, logger?: Logger): Promise<void> => {
	try {
		logger?.info('Deleting media record', { fileKey });
		const result = await db.prepare('DELETE FROM media WHERE file_key = ?').bind(fileKey).run();
		if (!result.success) throw new DatabaseError('Delete operation failed', { fileKey });
		const changes = result.meta.changes ?? 0;
		if (changes === 0) throw new NotFoundError('Media record not found', { fileKey });
		logger?.info('Media record deleted successfully', { fileKey });
	} catch (error) {
		if (error instanceof DatabaseError || error instanceof NotFoundError) throw error;
		const message = error instanceof Error ? error.message : 'Unknown error';
		logger?.error('Database delete failed', error instanceof Error ? error : undefined, { fileKey });
		throw new DatabaseError(`Failed to delete media record: ${message}`, { fileKey, originalError: message });
	}
};

// ===========================================================================
// Delete Media by ID
// ===========================================================================

export const deleteMediaById = async (db: D1Database, id: number, logger?: Logger): Promise<void> => {
	try {
		logger?.info('Deleting media record by ID', { id });
		const result = await db.prepare('DELETE FROM media WHERE id = ?').bind(id).run();
		if (!result.success) throw new DatabaseError('Delete operation failed', { id });
		const changes = result.meta.changes ?? 0;
		if (changes === 0) throw new NotFoundError('Media record not found', { id });
		logger?.info('Media record deleted successfully', { id });
	} catch (error) {
		if (error instanceof DatabaseError || error instanceof NotFoundError) throw error;
		const message = error instanceof Error ? error.message : 'Unknown error';
		logger?.error('Database delete by ID failed', error instanceof Error ? error : undefined, { id });
		throw new DatabaseError(`Failed to delete media record: ${message}`, { id, originalError: message });
	}
};

// ===========================================================================
// Get Unique Folders
// ===========================================================================

export const getFolders = async (db: D1Database, logger?: Logger): Promise<string[]> => {
	try {
		logger?.debug('Getting unique folders');
		const result = await db.prepare('SELECT DISTINCT folder FROM media ORDER BY folder').all<{ folder: string }>();
		const folders = (result.results || []).map((r) => r.folder);
		logger?.debug('Folders retrieved', { count: folders.length });
		return folders;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		logger?.error('Database get folders failed', error instanceof Error ? error : undefined);
		throw new DatabaseError(`Failed to get folders: ${message}`, { originalError: message });
	}
};

// ===========================================================================
// Get Media Statistics
// ===========================================================================

export const getStats = async (db: D1Database, logger?: Logger): Promise<{ total: number; images: number; videos: number; files: number; totalSize: number }> => {
	try {
		logger?.debug('Getting media statistics');
		const result = await db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN file_type = \'image\' THEN 1 ELSE 0 END) as images, SUM(CASE WHEN file_type = \'video\' THEN 1 ELSE 0 END) as videos, SUM(CASE WHEN file_type = \'file\' THEN 1 ELSE 0 END) as files, SUM(size) as totalSize FROM media').first<{ total: number; images: number; videos: number; files: number; totalSize: number }>();
		const stats = { total: result?.total ?? 0, images: result?.images ?? 0, videos: result?.videos ?? 0, files: result?.files ?? 0, totalSize: result?.totalSize ?? 0 };
		logger?.info('Statistics retrieved', stats);
		return stats;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		logger?.error('Database get stats failed', error instanceof Error ? error : undefined);
		throw new DatabaseError(`Failed to get statistics: ${message}`, { originalError: message });
	}
};
