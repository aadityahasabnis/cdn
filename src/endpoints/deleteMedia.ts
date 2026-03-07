// ===========================================================================
// Media Delete Endpoint (DELETE /api/media/delete)
// ===========================================================================

import type { Context } from 'hono';
import type { Env, HonoEnv, DeleteResponse } from '../types';
import { jsonOk } from '../utils/response';
import { deleteObject } from '../services/r2';
import { deleteMedia, deleteMediaById, getMediaByKey, getMediaById } from '../services/database';
import { invalidateCache } from '../services/cache';
import { ValidationError, NotFoundError } from '../lib/errors';

// ===========================================================================
// Delete Handler (By File Key)
// ===========================================================================

export const handleDelete = async (c: Context<HonoEnv>): Promise<Response> => {
	const logger = c.get('logger');
	logger.info('Processing delete request');

	let body: { file_key?: string };
	try { body = await c.req.json(); } 
	catch (error) { logger.warn('Invalid JSON body', { error }); throw new ValidationError('Invalid JSON body. Expected: { "file_key": "path/to/file" }'); }

	const { file_key } = body;
	if (!file_key || typeof file_key !== 'string') { logger.warn('Missing file_key in request body'); throw new ValidationError('Missing required field: file_key'); }

	logger.debug('Delete requested', { file_key });
	const mediaRecord = await getMediaByKey(c.env.DB, file_key, logger);
	logger.info('File found, deleting from R2', { file_key });

	try { await deleteObject(c.env.MEDIA_BUCKET, file_key, logger); } 
	catch (error) { logger.warn('R2 delete failed, continuing with DB delete', { file_key, error }); }

	logger.info('Deleting from database', { file_key });
	await deleteMedia(c.env.DB, file_key, logger);
	logger.info('File deleted successfully', { file_key });

	c.executionCtx.waitUntil(invalidateCache(c.env.MEDIA_CACHE, logger));

	const response: DeleteResponse = { success: true, file_key, message: 'File deleted successfully' };
	return jsonOk(response);
};

// ===========================================================================
// Delete Handler (By ID)
// ===========================================================================

export const handleDeleteById = async (c: Context<HonoEnv>): Promise<Response> => {
	const logger = c.get('logger');
	logger.info('Processing delete by ID request');

	const idParam = c.req.param('id');
	const id = parseInt(idParam, 10);
	if (isNaN(id) || id <= 0) { logger.warn('Invalid ID parameter', { idParam }); throw new ValidationError('Invalid ID parameter'); }

	logger.debug('Delete by ID requested', { id });
	const mediaRecord = await getMediaById(c.env.DB, id, logger);
	logger.info('File found, deleting from R2', { id, file_key: mediaRecord.file_key });

	try { await deleteObject(c.env.MEDIA_BUCKET, mediaRecord.file_key, logger); } 
	catch (error) { logger.warn('R2 delete failed, continuing with DB delete', { file_key: mediaRecord.file_key, error }); }

	logger.info('Deleting from database', { id, file_key: mediaRecord.file_key });
	await deleteMediaById(c.env.DB, id, logger);
	logger.info('File deleted successfully', { id, file_key: mediaRecord.file_key });

	c.executionCtx.waitUntil(invalidateCache(c.env.MEDIA_CACHE, logger));

	const response: DeleteResponse = { success: true, file_key: mediaRecord.file_key, message: 'File deleted successfully' };
	return jsonOk(response);
};
