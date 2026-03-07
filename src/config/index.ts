/**
 * Centralized Configuration
 * 
 * This module provides type-safe access to environment variables and application configuration.
 * All environment-dependent values should be accessed through this module.
 * 
 * @module config
 */

import { HonoEnv } from '../types';

/**
 * Application configuration interface
 * Defines all configuration values used across the application
 */
export interface AppConfig {
  /** Environment name (development, production, etc.) */
  environment: string;
  
  /** Base URL for CDN routes */
  cdnBaseUrl: string;
  
  /** API authentication key */
  apiKey: string;
  
  /** Whether detailed error messages should be shown */
  showDetailedErrors: boolean;
  
  /** Maximum concurrent cache operations */
  maxConcurrentCacheOps: number;
  
  /** Enable request logging */
  enableRequestLogging: boolean;
  
  /** Enable performance metrics */
  enableMetrics: boolean;
}

/**
 * Validates that all required environment variables are present
 * 
 * @param env - The environment bindings from Cloudflare Workers
 * @throws {Error} If any required environment variable is missing
 */
export function validateEnvironment(env: HonoEnv['Bindings']): void {
  const required = ['ADMIN_API_KEY', 'DB', 'MEDIA_BUCKET', 'MEDIA_CACHE'];
  const missing: string[] = [];

  for (const key of required) {
    if (!(key in env) || !env[key as keyof typeof env]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your wrangler.jsonc and .dev.vars configuration.'
    );
  }
}
// ===========================================================================
// Comment
// ===========================================================================
/**
 * Creates application configuration from environment
 * 
 * @param env - The environment bindings from Cloudflare Workers
 * @param cdnBaseUrl - Base URL for CDN routes (auto-detected from request)
 * @returns Typed configuration object
 */
export function createConfig(env: HonoEnv['Bindings'], cdnBaseUrl: string): AppConfig {
  return {
    environment: env.ENVIRONMENT || 'production',
    cdnBaseUrl,
    apiKey: env.ADMIN_API_KEY,
    showDetailedErrors: env.ENVIRONMENT === 'development',
    maxConcurrentCacheOps: 10,
    enableRequestLogging: (env as any).ENABLE_REQUEST_LOGGING === 'true' || env.ENVIRONMENT === 'development',
    enableMetrics: (env as any).ENABLE_METRICS === 'true' || true,
  };
}

/**
 * Gets the CDN base URL from the request
 * Automatically detects whether running locally or in production
 * 
 * @param request - The incoming request
 * @returns CDN base URL (e.g., 'https://example.com/cdn' or 'http://localhost:8787/cdn')
 */
export function getCdnBaseUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}/cdn`;
}

/**
 * Type guard to check if environment is properly configured
 * 
 * @param env - The environment bindings to check
 * @returns True if environment has all required bindings
 */
export function isEnvironmentValid(env: any): env is HonoEnv['Bindings'] {
  return (
    env &&
    typeof env.ADMIN_API_KEY === 'string' &&
    env.DB &&
    env.MEDIA_BUCKET &&
    env.MEDIA_CACHE
  );
}
