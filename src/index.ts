/**
 * Media Service API
 *
 * A professional Cloudflare Worker-based media hosting backend for blogging platforms.
 * Handles image, video, and file uploads with metadata management and CDN delivery.
 *
 * @module index
 * 
 * Key Features:
 * - Multi-format media upload (images, videos, documents)
 * - R2 storage with CDN delivery
 * - D1 database for metadata
 * - KV caching for performance
 * - Rate limiting and authentication
 * - Structured logging and error handling
 *
 * Endpoints:
 * - POST   /api/media/upload  - Upload media files (auth required)
 * - GET    /api/media/list    - List media with filters & pagination
 * - DELETE /api/media/delete  - Delete media by file_key (auth required)
 * - DELETE /api/media/:id     - Delete media by ID (auth required)
 * - GET    /api/media/stats   - Get media statistics
 * - GET    /api/media/folders - List all folders
 * - POST   /api/media/cache/clear - Clear cache (auth required)
 * - GET    /cdn/*             - Serve files from R2
 * - GET    /health            - Health check endpoint
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import type { HonoEnv } from "./types";
import { authMiddleware, rateLimitMiddleware } from "./middleware/auth";
import { requestIdMiddleware } from "./middleware/requestId";
import { handleUpload } from "./endpoints/upload";
import { handleList } from "./endpoints/listMedia";
import { handleDelete, handleDeleteById } from "./endpoints/deleteMedia";
import { getStats, getFolders } from "./services/database";
import { jsonOk, Errors, handleOptions } from "./utils/response";
import { testUIHTML } from "./ui/testUI";
import { validateEnvironment } from "./config";
import { AppError, formatErrorResponse, DatabaseError, StorageError } from "./lib/errors";
import { logger } from "./lib/logger";

// Create Hono app with typed bindings
const app = new Hono<HonoEnv>();

// ============================================
// Environment Validation
// ============================================

/**
 * Validates environment on app initialization
 * This ensures the app doesn't start with missing configuration
 */
app.use("*", async (c, next) => {
  try {
    validateEnvironment(c.env);
    await next();
  } catch (error) {
    logger.error("Environment validation failed", error instanceof Error ? error : undefined);
    return c.json(
      {
        error: "Configuration error: Missing required environment variables",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// ============================================
// Global Middleware
// ============================================

// Request ID and logging middleware - must be first for tracing
app.use("*", requestIdMiddleware);

// CORS middleware - allow cross-origin requests
app.use(
	"*",
	cors({
		origin: "*", // In production, set to your specific domain
		allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
		allowHeaders: ["Content-Type", "x-api-key", "Authorization", "X-Request-ID"],
		exposeHeaders: ["X-Request-ID"],
		maxAge: 86400,
	})
);

// Rate limiting middleware for all routes
app.use("*", rateLimitMiddleware);

// ============================================
// Health Check Endpoint
// ============================================

app.get("/health", (c) => {
	return jsonOk({
		success: true,
		status: "healthy",
		service: "media-service",
		timestamp: new Date().toISOString(),
	});
});

// Test UI endpoint - serves the HTML test interface
app.get("/", (c) => {
	return c.html(testUIHTML);
});

// API info endpoint
app.get("/api", (c) => {
	return jsonOk({
		success: true,
		name: "Media Service API",
		version: "1.0.0",
		description: "Cloudflare-based media hosting backend",
		endpoints: {
			upload: "POST /api/media/upload",
			list: "GET /api/media/list",
			delete: "DELETE /api/media/delete",
			deleteById: "DELETE /api/media/:id",
			stats: "GET /api/media/stats",
			folders: "GET /api/media/folders",
			health: "GET /health",
		},
		documentation: {
			upload: {
				method: "POST",
				path: "/api/media/upload",
				auth: "Required (x-api-key header)",
				contentType: "multipart/form-data",
				fields: {
					file: "File (required) - The file to upload",
					folder: "String (optional) - Folder name (default: root)",
					type: "String (optional) - image|video|file (auto-detected)",
					tags: "String (optional) - Comma-separated tags",
				},
			},
			list: {
				method: "GET",
				path: "/api/media/list",
				auth: "Not required",
				params: {
					type: "Filter by type (image|video|file)",
					folder: "Filter by folder name",
					limit: "Items per page (1-100, default: 50)",
					page: "Page number (default: 1)",
				},
			},
			delete: {
				method: "DELETE",
				path: "/api/media/delete",
				auth: "Required (x-api-key header)",
				body: '{ "file_key": "path/to/file" }',
			},
		},
	});
});

// ============================================
// Media API Routes
// ============================================

// Upload endpoint - requires authentication
app.post("/api/media/upload", authMiddleware, handleUpload);

// List endpoint - public, no auth required
app.get("/api/media/list", handleList);

// Delete endpoints - require authentication
app.delete("/api/media/delete", authMiddleware, handleDelete);
app.delete("/api/media/:id", authMiddleware, handleDeleteById);

// Stats endpoint - public
app.get("/api/media/stats", async (c) => {
	const logger = c.get('logger');
	try {
		const stats = await getStats(c.env.DB);
		logger.info("Stats retrieved", { stats });
		return jsonOk({
			success: true,
			...stats,
		});
	} catch (error) {
		logger.error("Stats error", error instanceof Error ? error : undefined);
		throw new DatabaseError("Failed to get statistics");
	}
});

// Folders endpoint - public
app.get("/api/media/folders", async (c) => {
	const logger = c.get('logger');
	try {
		const folders = await getFolders(c.env.DB);
		logger.info("Folders retrieved", { count: folders.length });
		return jsonOk({
			success: true,
			folders,
		});
	} catch (error) {
		logger.error("Folders error", error instanceof Error ? error : undefined);
		throw new DatabaseError("Failed to get folders");
	}
});

// Clear cache endpoint - admin only
app.post("/api/media/cache/clear", authMiddleware, async (c) => {
	const logger = c.get('logger');
	try {
		// List all keys in KV and delete them
		const list = await c.env.MEDIA_CACHE.list();
		let deleted = 0;
		
		for (const key of list.keys) {
			await c.env.MEDIA_CACHE.delete(key.name);
			deleted++;
		}
		
		logger.info("Cache cleared", { deleted });
		
		return jsonOk({
			success: true,
			message: `Cleared ${deleted} cache entries`,
			deleted,
		});
	} catch (error) {
		logger.error("Cache clear error", error instanceof Error ? error : undefined);
		throw new DatabaseError("Failed to clear cache");
	}
});

// ============================================
// CDN Route - Serve files from R2
// ============================================

// Serve files from R2 bucket (public access)
app.get("/cdn/*", async (c) => {
	const logger = c.get('logger');
	try {
		// Extract file path from URL (remove /cdn/ prefix)
		const filePath = c.req.path.substring(5); // Remove "/cdn/"
		
		if (!filePath) {
			throw new StorageError("File path is required");
		}

		// Get file from R2
		const object = await c.env.MEDIA_BUCKET.get(filePath);
		
		if (!object) {
			throw new StorageError(`File not found: ${filePath}`);
		}

		logger.info("File served from CDN", { filePath, size: object.size });

		// Get file metadata
		const headers = new Headers();
		object.writeHttpMetadata(headers);
		headers.set("etag", object.httpEtag);
		headers.set("cache-control", "public, max-age=31536000, immutable");
		
		// Return file with appropriate headers
		return new Response(object.body, {
			headers,
		});
	} catch (error) {
		logger.error("CDN error", error instanceof Error ? error : undefined);
		throw error instanceof AppError ? error : new StorageError("Failed to serve file");
	}
});

// ============================================
// Handle OPTIONS preflight for all routes
// ============================================

app.options("*", () => handleOptions());

// ============================================
// 404 Handler
// ============================================

app.notFound((c) => {
	return Errors.notFound(`Endpoint not found: ${c.req.method} ${c.req.path}`);
});

// ============================================
// Error Handler
// ============================================

/**
 * Global error handler
 * Catches all unhandled errors and formats them appropriately
 */
app.onError((err, c) => {
	const logger = c.get('logger');
	const showDetails = c.env.ENVIRONMENT === "development";
	
	logger.error("Unhandled error", err instanceof Error ? err : undefined);
	
	// Format error response
	const errorResponse = formatErrorResponse(err, showDetails);
	
	return c.json(errorResponse, errorResponse.statusCode as any);
});

// Export the Hono app as the default export
export default app;
