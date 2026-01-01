/**
 * OpenAPI Base Document - DISABLED
 *
 * NOTE: OpenAPI spec generation has been disabled.
 * The zod-to-openapi integration was not working in a type-safe way with Zod v4,
 * and the technical benefit of generating OpenAPI specs from Zod schemas
 * did not justify the complexity and type gymnastics required.
 */

/*
export const baseDocument = {
  openapi: "3.1.0",
  info: {
    title: "ONDC Integration API",
    version: "1.0.0",
    description: `
# ONDC Integration API

This API provides integration endpoints for the Open Network for Digital Commerce (ONDC) platform.

## What is ONDC?

ONDC (Open Network for Digital Commerce) is a Government of India initiative to democratize e-commerce by creating an open, interoperable network. It allows buyers and sellers to transact across different platforms without being locked into a single marketplace.

## API Organization

This API is organized into three groups:

- **Registry**: Endpoints that communicate with the ONDC Registry for subscriber management
- **Gateway**: Endpoints that communicate with the ONDC Gateway for transaction flows
- **Internal**: Utility endpoints for health checks and result polling

## Authentication

This API uses two different authentication patterns:

### Outbound Requests (Your App → ONDC)
Routes: \`/api/ondc/lookup\`, \`/api/ondc/subscribe\`, \`/api/ondc/search\`, \`/api/ondc/select\`

Uses **Ed25519 HTTP Signatures** with BLAKE-512 digest. See the "Ed25519Signature" security scheme for detailed implementation guide.

### Inbound Callbacks (ONDC → Your App)
Routes: \`/api/ondc/on_subscribe\`, \`/api/ondc/on_search\`, \`/api/ondc/on_select\`

ONDC/BPPs sign their requests to you. Your app should verify their signatures using their public keys from the registry.

## External Documentation

- [ONDC Official Website](https://ondc.org/)
- [Beckn Protocol Documentation](https://developers.becknprotocol.io/)
- [ONDC FIS Specifications (Insurance)](https://github.com/ONDC-Official/ONDC-FIS-Specifications)
    `,
    contact: {
      name: "Vaatun Technologies",
      email: "vaibhav@vaatun.com",
    },
    license: {
      name: "MIT",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development",
    },
    {
      url: "https://ondc-staging.vaatun.com",
      description: "Staging environment",
    },
  ],
};
*/

export const baseDocument = {};
