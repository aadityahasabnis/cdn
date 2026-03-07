/**
 * Application Constants
 * 
 * Central location for all magic numbers, strings, and configuration values.
 * This improves maintainability and makes the codebase easier to understand.
 */

/**
 * File size limits
 */
export const FILE_SIZE = {
	/** Default maximum upload size: 100 MB */
	DEFAULT_MAX_BYTES: 104_857_600,
	
	/** Maximum upload size in MB for display */
	DEFAULT_MAX_MB: 100,
	
	/** Alias for backward compatibility */
	MAX_UPLOAD_BYTES: 104_857_600,
	MAX_UPLOAD_MB: 100,
} as const;

/**
 * Cache configuration
 */
export const CACHE = {
	/** Default cache TTL: 5 minutes (in seconds) */
	DEFAULT_TTL_SECONDS: 300,
	
	/** Cache TTL for gallery queries (alias for DEFAULT_TTL_SECONDS) */
	GALLERY_TTL_SECONDS: 300,
	
	/** CDN max-age for media files (1 year in seconds) */
	CDN_MAX_AGE_SECONDS: 31536000,
	
	/** Cache key prefix for gallery results */
	GALLERY_PREFIX: 'gallery',
	
	/** Common pagination values for cache pre-generation */
	COMMON_PAGES: [1, 2, 3, 4, 5] as const,
	COMMON_LIMITS: [10, 20, 25, 50, 100] as const,
	
	/** Pagination values for cache invalidation */
	INVALIDATION_PAGES: [1, 2, 3, 4, 5] as const,
	INVALIDATION_LIMITS: [10, 20, 25, 50, 100] as const,
} as const;

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT = {
	/** Default requests per minute */
	DEFAULT_PER_MINUTE: 30,
	
	/** Number of requests allowed per window (alias) */
	REQUESTS_PER_WINDOW: 30,
	
	/** Window duration in milliseconds (1 minute) */
	WINDOW_MS: 60000,
	
	/** Number of minutes to keep rate limit history */
	CLEANUP_WINDOW_MINUTES: 5,
	
	/** Number of cleanup windows to retain */
	CLEANUP_WINDOWS: 5,
} as const;

/**
 * Pagination defaults and limits
 */
export const PAGINATION = {
	/** Default page number */
	DEFAULT_PAGE: 1,
	
	/** Minimum page number */
	MIN_PAGE: 1,
	
	/** Default items per page */
	DEFAULT_LIMIT: 50,
	
	/** Minimum items per page */
	MIN_LIMIT: 1,
	
	/** Maximum items per page */
	MAX_LIMIT: 100,
} as const;

/**
 * File naming configuration
 */
export const FILE_NAME = {
	/** Length of random ID in file names */
	NANOID_LENGTH: 8,
	
	/** Maximum length of sanitized filename */
	MAX_FILENAME_LENGTH: 50,
	
	/** Alias for backward compatibility */
	MAX_NAME_LENGTH: 50,
	
	/** Characters allowed in nano ID */
	NANOID_ALPHABET: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
} as const;

/**
 * Folder configuration
 */
export const FOLDER = {
	/** Maximum length of folder name */
	MAX_LENGTH: 50,
	
	/** Alias for backward compatibility */
	MAX_NAME_LENGTH: 50,
	
	/** Default folder name */
	DEFAULT: 'root',
	
	/** Alias for backward compatibility */
	DEFAULT_NAME: 'root',
} as const;

/**
 * Tags configuration
 */
export const TAGS = {
	/** Maximum length of tags string */
	MAX_LENGTH: 200,
	
	/** Maximum number of tags */
	MAX_COUNT: 20,
	
	/** Tag separator */
	SEPARATOR: ',',
} as const;

/**
 * File naming configuration (legacy export)
 * @deprecated Use FILE_NAME, FOLDER instead
 */
export const FILE_NAMING = {
	/** Length of random ID in file names */
	NANOID_LENGTH: 8,
	
	/** Maximum length of sanitized filename */
	MAX_FILENAME_LENGTH: 50,
	
	/** Maximum length of folder name */
	MAX_FOLDER_LENGTH: 50,
	
	/** Default folder name */
	DEFAULT_FOLDER: 'root',
	
	/** Characters allowed in nano ID */
	NANOID_ALPHABET: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
} as const;

/**
 * File types
 */
export const FILE_TYPES = {
	IMAGE: 'image',
	VIDEO: 'video',
	FILE: 'file',
} as const;

/**
 * Type folder mappings
 */
export const TYPE_FOLDERS = {
	[FILE_TYPES.IMAGE]: 'images',
	[FILE_TYPES.VIDEO]: 'videos',
	[FILE_TYPES.FILE]: 'files',
} as const;

/**
 * HTTP status codes
 */
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

/**
 * Error codes for API responses
 */
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

/**
 * API version
 */
export const API = {
	VERSION: 'v1',
	BASE_PATH: '/api/v1',
} as const;

/**
 * Environment names
 */
export const ENVIRONMENTS = {
	DEVELOPMENT: 'development',
	PRODUCTION: 'production',
	STAGING: 'staging',
} as const;

/**
 * CORS configuration
 */
export const CORS = {
	ALLOW_METHODS: ['GET', 'POST', 'DELETE', 'OPTIONS'] as const,
	ALLOW_HEADERS: ['Content-Type', 'x-api-key', 'Authorization', 'x-request-id'] as const,
	MAX_AGE: 86400, // 24 hours
} as const;

/**
 * Cache control headers
 */
export const CACHE_CONTROL = {
	/** For uploaded media files (immutable) */
	MEDIA_FILES: 'public, max-age=31536000, immutable', // 1 year
	
	/** For API responses */
	API_RESPONSE: 'no-cache, no-store, must-revalidate',
} as const;
