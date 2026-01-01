/**
 * OpenAPI Generator - DISABLED
 *
 * NOTE: OpenAPI spec generation has been disabled.
 * The zod-to-openapi integration was not working in a type-safe way with Zod v4,
 * and the technical benefit of generating OpenAPI specs from Zod schemas
 * did not justify the complexity and type gymnastics required.
 *
 * If you need to run this in the future, uncomment the code below.
 * You'll also need to re-enable the OpenAPI extensions in:
 * - src/lib/zod.ts
 * - src/lib/openapi.ts
 * - src/lib/routes-registry.ts
 * - All route files that export routeConfig
 */

/*
import { writeFileSync } from "node:fs";
import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
import { routeConfigs } from "../lib/routes-registry";
import { baseDocument } from "./base";
import { securitySchemes } from "./security";
import { tags } from "./tags";

// Create OpenAPI registry
const registry = new OpenAPIRegistry();

// Register all routes from the centralized registry
for (const route of routeConfigs) {
  registry.registerPath(route);
}

// Create the OpenAPI generator and generate the full document
const generator = new OpenApiGeneratorV31(registry.definitions);
const document = generator.generateDocument(baseDocument);

// Build the complete OpenAPI document with our customizations
const openapi = {
  ...document,
  tags,
  components: {
    ...document.components,
    securitySchemes,
  },
};

// Write to public directory
const outputPath = "./public/openapi.json";

writeFileSync(outputPath, JSON.stringify(openapi, null, 2), "utf-8");

console.log(`✅ OpenAPI spec generated at ${outputPath}`);
console.log(`📊 Total endpoints: ${Object.keys(openapi.paths || {}).length}`);
console.log(`🏷️  Total tags: ${tags.length}`);
console.log(
  `📦 Total schemas: ${Object.keys(openapi.components?.schemas || {}).length}`,
);
*/

console.log("OpenAPI generation is disabled. See comment at top of file.");
