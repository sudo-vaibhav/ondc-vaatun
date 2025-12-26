/**
 * OpenAPI tag organization
 *
 * Current tags in /public/openapi.json:
 * - Registry (ONDC registry operations)
 * - Beckn Protocol (transaction flows)
 * - Callbacks (callback endpoints)
 * - Verification (domain verification)
 * - Health (health monitoring)
 *
 * New organization (3 groups per user requirements):
 * - Registry: All registry operations + callbacks (lookup, subscribe, on_subscribe)
 * - Gateway: All gateway operations + callbacks (search, select, on_search, on_select)
 * - Internal: Utilities (health, search-results, select-results)
 */
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
