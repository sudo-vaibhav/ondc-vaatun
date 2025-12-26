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
// This automatically:
// 1. Registers the Zod schemas as components
// 2. Creates the path definitions with proper $ref references
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
