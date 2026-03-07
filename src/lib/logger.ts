/**
 * Structured Logging Utility
 * 
 * This module provides structured logging with context support for better observability.
 * Logs include request IDs, timestamps, and contextual data for easier debugging.
 * 
 * @module lib/logger
 */

/** Log level enumeration */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

/** Log entry structure */
export interface LogEntry {
  /** Timestamp in ISO format */
  timestamp: string;
  
  /** Log level */
  level: LogLevel;
  
  /** Log message */
  message: string;
  
  /** Request ID for tracing */
  requestId?: string;
  
  /** Additional context data */
  context?: Record<string, any>;
  
  /** Error object if applicable */
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private requestId?: string;
  private baseContext: Record<string, any>;

  /**
   * Creates a new logger instance
   * 
   * @param requestId - Optional request ID for tracing
   * @param baseContext - Optional base context to include in all logs
   */
  constructor(requestId?: string, baseContext: Record<string, any> = {}) {
    this.requestId = requestId;
    this.baseContext = baseContext;
  }

  /**
   * Creates a child logger with additional context
   * 
   * @param context - Additional context to merge with base context
   * @returns New logger instance with merged context
   */
  child(context: Record<string, any>): Logger {
    return new Logger(this.requestId, { ...this.baseContext, ...context });
  }

  /**
   * Logs a debug message
   * 
   * @param message - Log message
   * @param context - Additional context data
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Logs an info message
   * 
   * @param message - Log message
   * @param context - Additional context data
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Logs a warning message
   * 
   * @param message - Log message
   * @param context - Additional context data
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Logs an error message
   * 
   * @param message - Log message
   * @param error - Error object
   * @param context - Additional context data
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  /**
   * Core logging method
   * 
   * @param level - Log level
   * @param message - Log message
   * @param context - Additional context data
   * @param error - Error object if applicable
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: this.requestId,
      context: { ...this.baseContext, ...context },
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    // Output to console with appropriate method
    const output = JSON.stringify(entry);
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      case LogLevel.INFO:
        console.info(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
        console.error(output);
        break;
    }
  }
}

/**
 * Creates a logger instance for a request
 * 
 * @param requestId - Request ID for tracing
 * @param baseContext - Optional base context
 * @returns Logger instance
 */
export function createLogger(requestId?: string, baseContext?: Record<string, any>): Logger {
  return new Logger(requestId, baseContext);
}

/**
 * Global default logger (no request context)
 */
export const logger = new Logger();
