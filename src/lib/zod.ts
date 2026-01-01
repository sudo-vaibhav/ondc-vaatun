/**
 * Zod re-export for runtime validation.
 *
 * NOTE: OpenAPI extension has been disabled.
 * The zod-to-openapi integration was not working in a type-safe way with Zod v4,
 * and the technical benefit of generating OpenAPI specs from Zod schemas
 * did not justify the complexity and type gymnastics required.
 *
 * Zod schemas are still used for runtime validation of requests/responses.
 */

// import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// OpenAPI extension disabled - see note above
// extendZodWithOpenApi(z);
/**
 * @deprecated use direct zod import from zod library itself
 */
export { z };
