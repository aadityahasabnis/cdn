// ===========================================================================
// Application Constants - Centralized configuration values
// ===========================================================================

export const FILE_SIZE = {
	DEFAULT_MAX_BYTES: 104_857_600,
	DEFAULT_MAX_MB: 100,
	MAX_UPLOAD_BYTES: 104_857_600,
	MAX_UPLOAD_MB: 100,
} as const;

export const CACHE = {
	DEFAULT_TTL_SECONDS: 300,
	GALLERY_TTL_SECONDS: 120,
	CDN_MAX_AGE_SECONDS: 31_536_000,
	GALLERY_PREFIX: 'gallery',
} as const;

export const RATE_LIMIT = {
	DEFAULT_PER_MINUTE: 30,
	REQUESTS_PER_WINDOW: 30,
	WINDOW_MS: 60_000,
	CLEANUP_WINDOW_MINUTES: 5,
	CLEANUP_WINDOWS: 5,
} as const;

export const PAGINATION = {
	DEFAULT_PAGE: 1,
	MIN_PAGE: 1,
	DEFAULT_LIMIT: 50,
	MIN_LIMIT: 1,
	MAX_LIMIT: 100,
} as const;

export const FILE_NAME = {
	NANOID_LENGTH: 8,
	MAX_FILENAME_LENGTH: 50,
	MAX_NAME_LENGTH: 50,
	NANOID_ALPHABET: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
} as const;

export const FOLDER = {
	MAX_LENGTH: 50,
	MAX_NAME_LENGTH: 50,
	DEFAULT: 'root',
	DEFAULT_NAME: 'root',
} as const;

export const TAGS = {
	MAX_LENGTH: 200,
	MAX_COUNT: 20,
	SEPARATOR: ',',
} as const;

export const FILE_NAMING = {
	NANOID_LENGTH: 8,
	MAX_FILENAME_LENGTH: 50,
	MAX_FOLDER_LENGTH: 50,
	DEFAULT_FOLDER: 'root',
	NANOID_ALPHABET: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
} as const;

export const FILE_TYPES = {
	IMAGE: 'image',
	VIDEO: 'video',
	FILE: 'file',
} as const;

export const TYPE_FOLDERS = {
	[FILE_TYPES.IMAGE]: 'images',
	[FILE_TYPES.VIDEO]: 'videos',
	[FILE_TYPES.FILE]: 'files',
} as const;

export const HTTP_STATUS = {
	OK: 200,
	CREATED: 201,
	NO_CONTENT: 204,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	PAYLOAD_TOO_LARGE: 413,
	UNSUPPORTED_MEDIA_TYPE: 415,
	TOO_MANY_REQUESTS: 429,
	INTERNAL_SERVER_ERROR: 500,
} as const;

export const ERROR_CODES = {
	UNAUTHORIZED: 'UNAUTHORIZED',
	FORBIDDEN: 'FORBIDDEN',
	NOT_FOUND: 'NOT_FOUND',
	PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
	UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
	RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
	INTERNAL_ERROR: 'INTERNAL_ERROR',
	VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

export const API = {
	VERSION: 'v1',
	BASE_PATH: '/api/v1',
} as const;

export const ENVIRONMENTS = {
	DEVELOPMENT: 'development',
	PRODUCTION: 'production',
	STAGING: 'staging',
} as const;

export const CORS = {
	ALLOW_METHODS: ['GET', 'POST', 'DELETE', 'OPTIONS'] as const,
	ALLOW_HEADERS: ['Content-Type', 'x-api-key', 'Authorization', 'x-request-id'] as const,
	MAX_AGE: 86_400,
} as const;

export const CACHE_CONTROL = {
	MEDIA_FILES: 'public, max-age=31536000, immutable',
	API_RESPONSE: 'no-cache, no-store, must-revalidate',
} as const;
