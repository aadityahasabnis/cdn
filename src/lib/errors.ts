// ===========================================================================
// Custom Error Classes - Structured error handling with HTTP status codes
// ===========================================================================

export class AppError extends Error {
	public readonly statusCode: number;
	public readonly isOperational: boolean;
	public readonly context?: Record<string, unknown>;

	constructor(message: string, statusCode = 500, isOperational = true, context?: Record<string, unknown>) {
		super(message);
		this.name = this.constructor.name;
		this.statusCode = statusCode;
		this.isOperational = isOperational;
		this.context = context;
		if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
	}
}

// ===========================================================================
// Specific Error Types
// ===========================================================================

export class ValidationError extends AppError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, 400, true, context);
	}
}

export class AuthenticationError extends AppError {
	constructor(message = 'Authentication failed', context?: Record<string, unknown>) {
		super(message, 401, true, context);
	}
}

export class AuthorizationError extends AppError {
	constructor(message = 'Insufficient permissions', context?: Record<string, unknown>) {
		super(message, 403, true, context);
	}
}

export class NotFoundError extends AppError {
	constructor(message = 'Resource not found', context?: Record<string, unknown>) {
		super(message, 404, true, context);
	}
}

export class ConflictError extends AppError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, 409, true, context);
	}
}

export class RateLimitError extends AppError {
	constructor(message = 'Rate limit exceeded', context?: Record<string, unknown>) {
		super(message, 429, true, context);
	}
}

export class StorageError extends AppError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, 500, true, context);
	}
}

export class DatabaseError extends AppError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, 500, true, context);
	}
}

export class CacheError extends AppError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, 500, true, context);
	}
}

export class ConfigurationError extends AppError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, 500, false, context);
	}
}

// ===========================================================================
// Error Formatting
// ===========================================================================

export const formatErrorResponse = (error: unknown, showDetails = false) => {
	if (error instanceof AppError) {
		return {
			error: error.message,
			statusCode: error.statusCode,
			...(showDetails && { name: error.name, context: error.context, stack: error.stack }),
		};
	}

	const message = error instanceof Error ? error.message : 'An unexpected error occurred';
	return {
		error: showDetails ? message : 'Internal server error',
		statusCode: 500,
		...(showDetails && error instanceof Error && { name: error.name, stack: error.stack }),
	};
};

export const isOperationalError = (error: unknown): boolean => 
	error instanceof AppError && error.isOperational;
