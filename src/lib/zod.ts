import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// Enable OpenAPI extensions on Zod globally
extendZodWithOpenApi(z);

// Re-export the extended Zod instance
export { z };
