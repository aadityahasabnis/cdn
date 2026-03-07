// ===========================================================================
// Configuration - Type-safe environment variable access
// ===========================================================================

import type { HonoEnv } from '../types';

export interface AppConfig {
	environment: string;
	cdnBaseUrl: string;
	apiKey: string;
	showDetailedErrors: boolean;
	maxConcurrentCacheOps: number;
	enableRequestLogging: boolean;
	enableMetrics: boolean;
}

// ===========================================================================
// Environment Validation
// ===========================================================================

export const validateEnvironment = (env: HonoEnv['Bindings']): void => {
	const required = ['ADMIN_API_KEY', 'DB', 'MEDIA_BUCKET', 'MEDIA_CACHE'];
	const missing = required.filter(key => !(key in env) || !env[key as keyof typeof env]);
	
	if (missing.length > 0) {
		throw new Error(`Missing required environment variables: ${missing.join(', ')}\nPlease check your wrangler.jsonc and .dev.vars configuration.`);
	}
};

export const createConfig = (env: HonoEnv['Bindings'], cdnBaseUrl: string): AppConfig => ({
	environment: env.ENVIRONMENT || 'production',
	cdnBaseUrl,
	apiKey: env.ADMIN_API_KEY,
	showDetailedErrors: env.ENVIRONMENT === 'development',
	maxConcurrentCacheOps: 10,
	enableRequestLogging: (env as unknown as Record<string, unknown>).ENABLE_REQUEST_LOGGING === 'true' || env.ENVIRONMENT === 'development',
	enableMetrics: (env as unknown as Record<string, unknown>).ENABLE_METRICS === 'true' || true,
});

export const getCdnBaseUrl = (request: Request): string => {
	const { protocol, host } = new URL(request.url);
	return `${protocol}//${host}/cdn`;
};

export const isEnvironmentValid = (env: unknown): env is HonoEnv['Bindings'] =>
	!!env &&
	typeof (env as HonoEnv['Bindings']).ADMIN_API_KEY === 'string' &&
	!!(env as HonoEnv['Bindings']).DB &&
	!!(env as HonoEnv['Bindings']).MEDIA_BUCKET &&
	!!(env as HonoEnv['Bindings']).MEDIA_CACHE;
