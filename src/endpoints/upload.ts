// ===========================================================================
// Media Upload Endpoint (POST /api/media/upload)
// ===========================================================================

import type { Context } from 'hono';
import type { Env, HonoEnv, UploadResponse } from '../types';
import { generateFileKey, buildPublicUrl } from '../utils/fileName';
import { validateMimeType, validateFileSize, determineFileType, parseTags, validateFolder } from '../utils/validation';
import { jsonOk } from '../utils/response';
import { uploadObject } from '../services/r2';
import { insertMedia } from '../services/database';
import { invalidateAllCache } from '../services/cache';
import { FILE_SIZE } from '../constants';
import { ValidationError, StorageError, DatabaseError } from '../lib/errors';

// ===========================================================================
// Upload Handler
// ===========================================================================

export const handleUpload = async (c: Context<HonoEnv>): Promise<Response> => {
	const logger = c.get('logger');
	logger.info('Processing upload request');

	const maxUploadBytes = parseInt(c.env.MAX_UPLOAD_BYTES || String(FILE_SIZE.MAX_UPLOAD_BYTES), 10);

	let formData: FormData;
	try { formData = await c.req.formData(); } 
	catch (error) { logger.warn('Failed to parse form data', { error }); throw new ValidationError('Invalid form data. Request must be multipart/form-data.'); }

	const file = formData.get('file');
	if (!file || !(file instanceof File)) { logger.warn('No file provided in upload request'); throw new ValidationError('No file provided. Include a \'file\' field in form data.'); }

	logger.debug('File received', { name: file.name, size: file.size, type: file.type });

	const mimeType = file.type;
	validateMimeType(mimeType);
	validateFileSize(file.size, maxUploadBytes);

	const folderInput = formData.get('folder');
	const typeInput = formData.get('type');
	const tagsInput = formData.get('tags');

	const folder = validateFolder(typeof folderInput === 'string' ? folderInput : undefined);
	const fileType = determineFileType(mimeType, typeof typeInput === 'string' ? (typeInput as 'image' | 'video' | 'file') : undefined);
	const tags = parseTags(typeof tagsInput === 'string' ? tagsInput : undefined);

	logger.debug('Upload parameters validated', { folder, fileType, tags });

	const fileKey = generateFileKey(file.name, folder, fileType);
	const publicUrl = buildPublicUrl(c.env.CDN_BASE_URL, fileKey);

	logger.info('Uploading to R2', { fileKey });
	await uploadObject(c.env.MEDIA_BUCKET, fileKey, await file.arrayBuffer(), mimeType, { originalName: file.name, folder, type: fileType }, logger);

	logger.info('R2 upload successful, inserting metadata', { fileKey });

	try {
		await insertMedia(c.env.DB, { file_key: fileKey, public_url: publicUrl, file_type: fileType, mime_type: mimeType, size: file.size, folder, tags }, logger);
	} catch (error) {
		logger.error('Database insert failed, attempting R2 cleanup', { fileKey, error });
		c.executionCtx.waitUntil(c.env.MEDIA_BUCKET.delete(fileKey).catch((cleanupError) => logger.warn('R2 cleanup failed', { fileKey, error: cleanupError })));
		throw error;
	}

	logger.info('Upload completed successfully', { fileKey, publicUrl, size: file.size });
	c.executionCtx.waitUntil(invalidateAllCache(c.env.MEDIA_CACHE, folder, logger));

	const response: UploadResponse = { success: true, file_key: fileKey, public_url: publicUrl, mime_type: mimeType, size: file.size };
	return jsonOk(response);
};
