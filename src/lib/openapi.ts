import {
  OpenAPIRegistry,
  type RouteConfig,
} from "@asteasolutions/zod-to-openapi";
import type { z } from "./zod";

// Re-export registry for use in routes
export { OpenAPIRegistry };
export type { RouteConfig };

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
export function createResponse<T extends z.ZodType>(
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
