import {
  type RouteConfig as BaseRouteConfig,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import type { z } from "./zod";

// Re-export registry for use in routes
export { OpenAPIRegistry };

/**
 * Configuration for displaying a route in the API Directory page.
 * Routes with this config will be shown in the directory UI.
 */
export interface DirectoryConfig {
  /** Display title for the directory card */
  title: string;
  /** Short description for the directory card */
  description: string;
  /** Default payload for POST requests (optional) */
  payload?: object;
}

/**
 * Extended RouteConfig with optional directory display settings.
 * Extends the base RouteConfig from zod-to-openapi.
 */
export interface RouteConfig extends BaseRouteConfig {
  /** If present, route will be shown in the API Directory page */
  directoryConfig?: DirectoryConfig;
}

/**
 * Create a typed request body configuration for RouteConfig.
 * Returns the structure expected by registerPath's request property.
 *
 * Field-level examples come from the Zod schema's .openapi({ example: ... })
 */
export function createRequestBody<T extends z.ZodType>(
  schema: T,
  options?: {
    required?: boolean;
    description?: string;
  },
): RouteConfig["request"] {
  return {
    body: {
      required: options?.required ?? true,
      description: options?.description,
      content: {
        "application/json": {
          schema,
        },
      },
    },
  };
}

/**
 * Create a typed response configuration.
 *
 * Field-level examples come from the Zod schema's .openapi({ example: ... })
 */
export function rcreateResponse<T extends z.ZodType>(
  schema: T,
  options?: {
    description?: string;
  },
) {
  return {
    description: options?.description ?? "Success",
    content: {
      "application/json": {
        schema,
      },
    },
  };
}

/**
 * Create a simple response without a schema (for errors, etc.)
 */
export function createErrorResponse(description: string) {
  return { description };
}
