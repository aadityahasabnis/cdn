/**
 * Custom Error Classes
 * 
 * This module defines custom error types for better error handling and clearer error messages.
 * Each error type represents a specific failure scenario in the application.
 * 
 * @module lib/errors
 */

/**
 * Base application error class
 * All custom errors extend from this base class
 */
export class AppError extends Error {
  /** HTTP status code for this error */
  public readonly statusCode: number;
  
  /** Whether this error is considered operational (expected) vs programming error */
  public readonly isOperational: boolean;
  
  /** Additional error context/metadata */
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    
    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Validation error - thrown when input validation fails
 * 
 * @example
 * throw new ValidationError('File type not supported', { fileType: 'exe' });
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, true, context);
  }
}

/**
 * Authentication error - thrown when authentication fails
 * 
 * @example
 * throw new AuthenticationError('Invalid API key');
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', context?: Record<string, any>) {
    super(message, 401, true, context);
  }
}

/**
 * Authorization error - thrown when user lacks permission
 * 
 * @example
 * throw new AuthorizationError('Insufficient permissions');
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', context?: Record<string, any>) {
    super(message, 403, true, context);
  }
}

/**
 * Not found error - thrown when requested resource doesn't exist
 * 
 * @example
 * throw new NotFoundError('Media file not found', { fileId: '123' });
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', context?: Record<string, any>) {
    super(message, 404, true, context);
  }
}

/**
 * Conflict error - thrown when operation conflicts with current state
 * 
 * @example
 * throw new ConflictError('File already exists', { fileName: 'image.jpg' });
 */
export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 409, true, context);
  }
}

/**
 * Rate limit error - thrown when rate limit is exceeded
 * 
 * @example
 * throw new RateLimitError('Too many requests', { limit: 100, window: '1m' });
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', context?: Record<string, any>) {
    super(message, 429, true, context);
  }
}

/**
 * Storage error - thrown when storage operations fail
 * 
 * @example
 * throw new StorageError('Failed to upload to R2', { bucket: 'media-storage' });
 */
export class StorageError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 500, true, context);
  }
}

/**
 * Database error - thrown when database operations fail
 * 
 * @example
 * throw new DatabaseError('Failed to insert record', { table: 'media_files' });
 */
export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 500, true, context);
  }
}

/**
 * Cache error - thrown when cache operations fail
 * Note: Cache errors are usually non-critical and should be handled gracefully
 * 
 * @example
 * throw new CacheError('Failed to invalidate cache', { key: 'media:list' });
 */
export class CacheError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 500, true, context);
  }
}

/**
 * Configuration error - thrown when configuration is invalid
 * This is a non-operational error (programming error)
 * 
 * @example
 * throw new ConfigurationError('Missing required environment variable', { variable: 'API_KEY' });
 */
export class ConfigurationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 500, false, context);
  }
}

/**
 * Formats an error for API response
 * Hides sensitive details in production
 * 
 * @param error - The error to format
 * @param showDetails - Whether to show detailed error information (development mode)
 * @returns Formatted error object for JSON response
 */
export function formatErrorResponse(error: unknown, showDetails: boolean = false) {
  if (error instanceof AppError) {
    return {
      error: error.message,
      statusCode: error.statusCode,
      ...(showDetails && {
        name: error.name,
        context: error.context,
        stack: error.stack,
      }),
    };
  }

  // Unknown error type
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  
  return {
    error: showDetails ? message : 'Internal server error',
    statusCode: 500,
    ...(showDetails && error instanceof Error && {
      name: error.name,
      stack: error.stack,
    }),
  };
}

/**
 * Checks if an error is operational (expected) or a programming error
 * 
 * @param error - The error to check
 * @returns True if error is operational and should be handled gracefully
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}
