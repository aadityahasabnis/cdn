// ===========================================================================
// Structured Logger - JSON logging with request ID tracing
// ===========================================================================

export enum LogLevel {
	DEBUG = 'DEBUG',
	INFO = 'INFO',
	WARN = 'WARN',
	ERROR = 'ERROR',
}

export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	message: string;
	requestId?: string;
	context?: Record<string, unknown>;
	error?: { name: string; message: string; stack?: string };
}

// ===========================================================================
// Logger Class
// ===========================================================================

export class Logger {
	constructor(
		private readonly requestId?: string,
		private readonly baseContext: Record<string, unknown> = {}
	) {}

	child = (context: Record<string, unknown>): Logger =>
		new Logger(this.requestId, { ...this.baseContext, ...context });

	debug = (message: string, context?: Record<string, unknown>): void =>
		this.log(LogLevel.DEBUG, message, context);

	info = (message: string, context?: Record<string, unknown>): void =>
		this.log(LogLevel.INFO, message, context);

	warn = (message: string, context?: Record<string, unknown>): void =>
		this.log(LogLevel.WARN, message, context);

	error = (message: string, errorOrContext?: Error | Record<string, unknown>, context?: Record<string, unknown>): void => {
		const err = errorOrContext instanceof Error ? errorOrContext : undefined;
		const ctx = errorOrContext instanceof Error ? context : errorOrContext;
		this.log(LogLevel.ERROR, message, ctx, err);
	};

	private log = (level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void => {
		const entry: LogEntry = {
			timestamp: new Date().toISOString(),
			level,
			message,
			requestId: this.requestId,
			context: { ...this.baseContext, ...context },
			...(error && { error: { name: error.name, message: error.message, stack: error.stack } }),
		};

		const output = JSON.stringify(entry);
		const logFn = { [LogLevel.DEBUG]: console.debug, [LogLevel.INFO]: console.info, [LogLevel.WARN]: console.warn, [LogLevel.ERROR]: console.error }[level];
		logFn(output);
	};
}

export const createLogger = (requestId?: string, baseContext?: Record<string, unknown>): Logger =>
	new Logger(requestId, baseContext);

export const logger = new Logger();
