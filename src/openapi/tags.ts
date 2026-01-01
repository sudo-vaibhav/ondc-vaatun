/**
 * OpenAPI Tags - DISABLED
 *
 * NOTE: OpenAPI spec generation has been disabled.
 * The zod-to-openapi integration was not working in a type-safe way with Zod v4,
 * and the technical benefit of generating OpenAPI specs from Zod schemas
 * did not justify the complexity and type gymnastics required.
 */

/*
export const tags = [
  {
    name: "Registry",
    description:
      "Endpoints that communicate with the ONDC Registry for subscriber management, lookup, and verification. Includes both outbound requests (lookup, subscribe) and inbound callbacks (on_subscribe).",
    externalDocs: {
      description: "Beckn Registry API Reference",
      url: "https://developers.becknprotocol.io/docs/registry-api-reference/",
    },
  },
  {
    name: "Gateway",
    description:
      "Endpoints that communicate with the ONDC Gateway for transaction flows (search, select, etc.). Includes both outbound requests and inbound callbacks from BPPs (on_search, on_select).",
    externalDocs: {
      description: "Beckn Core Specification",
      url: "https://developers.becknprotocol.io/docs/core-specification/",
    },
  },
  {
    name: "Internal",
    description:
      "Utility endpoints for health checks, result polling, and internal operations. These endpoints are not part of the ONDC protocol.",
  },
];
*/

export const tags: unknown[] = [];
