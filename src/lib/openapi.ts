/**
 * OpenAPI utilities - DISABLED
 *
 * NOTE: OpenAPI spec generation has been disabled.
 * The zod-to-openapi integration was not working in a type-safe way with Zod v4,
 * and the technical benefit of generating OpenAPI specs from Zod schemas
 * did not justify the complexity and type gymnastics required.
 *
 * If OpenAPI documentation is needed in the future, consider:
 * - Writing OpenAPI specs manually
 * - Using a different approach that doesn't rely on Zod type augmentation
 * - Waiting for better Zod v4 support in zod-to-openapi
 */

/*
import {
  type RouteConfig as BaseRouteConfig,
  OpenAPIRegistry,
  type ResponseConfig,
} from "@asteasolutions/zod-to-openapi";

// Re-export registry for use in routes
export { OpenAPIRegistry };

export interface DirectoryConfig {
  title: string;
  description: string;
  payload?: object;
}

export interface RouteConfig extends BaseRouteConfig {
  directoryConfig?: DirectoryConfig;
}

export function createRequestBody(
  schema: any,
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
  } as RouteConfig["request"];
}

export function createResponse(
  schema: any,
  options?: {
    description?: string;
  },
): ResponseConfig {
  return {
    description: options?.description ?? "Success",
    content: {
      "application/json": {
        schema,
      },
    },
  } as ResponseConfig;
}

export function createErrorResponse(description: string) {
  return { description };
}
*/

// Stub exports to prevent import errors during transition
// These can be removed once all route files are updated
export type RouteConfig = Record<string, unknown>;
export type DirectoryConfig = Record<string, unknown>;
export const createRequestBody = () => ({});
export const createResponse = () => ({});
export const createErrorResponse = () => ({});
