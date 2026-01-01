/**
 * OpenAPI Security Schemes - DISABLED
 *
 * NOTE: OpenAPI spec generation has been disabled.
 * The zod-to-openapi integration was not working in a type-safe way with Zod v4,
 * and the technical benefit of generating OpenAPI specs from Zod schemas
 * did not justify the complexity and type gymnastics required.
 *
 * The Ed25519 signature documentation below is still useful reference material
 * for implementing ONDC authentication, even though it's not used in the OpenAPI spec.
 */

/*
export const securitySchemes = {
  Ed25519Signature: {
    type: "apiKey",
    in: "header",
    name: "Authorization",
    description: `
# ONDC Ed25519 Signature Authentication

All outbound requests to ONDC Registry and Gateway require Ed25519 digital signatures using HTTP Signature standard.

## Authentication Flow

### Step 1: Calculate BLAKE-512 Digest
\`\`\`typescript
import { createHash } from "crypto";

const requestBody = JSON.stringify(payload);
const digest = createHash("blake2b512")
  .update(requestBody)
  .digest("base64");
\`\`\`

### Step 2: Create Signing String
\`\`\`typescript
const created = Math.floor(Date.now() / 1000) - 3; // Clock drift compensation
const expires = created + 300; // 5 minute validity

const signingString =
  \`(created): \${created}\\n\` +
  \`(expires): \${expires}\\n\` +
  \`digest: BLAKE-512=\${digest}\`;
\`\`\`

### Step 3: Sign with Ed25519
\`\`\`typescript
import crypto from "node:crypto";

// Raw key is 64 bytes (32-byte seed + 32-byte public key)
const rawKey = Buffer.from(process.env.SIGNING_PRIVATE_KEY, "base64");

// Create Ed25519 private key from the 32-byte seed
const privateKey = crypto.createPrivateKey({
  key: Buffer.concat([
    Buffer.from("302e020100300506032b657004220420", "hex"), // PKCS8 prefix
    rawKey.subarray(0, 32),
  ]),
  format: "der",
  type: "pkcs8",
});

const signature = crypto.sign(null, Buffer.from(signingString), privateKey);
const signatureBase64 = signature.toString("base64");
\`\`\`

### Step 4: Construct Authorization Header
\`\`\`typescript
const keyId = \`\${subscriberId}|\${uniqueKeyId}|ed25519\`;

const authHeader =
  \`Signature keyId="\${keyId}",\` +
  \`algorithm="ed25519",\` +
  \`created="\${created}",\` +
  \`expires="\${expires}",\` +
  \`headers="(created) (expires) digest",\` +
  \`signature="\${signatureBase64}"\`;
\`\`\`

## Clock Drift Compensation

The implementation subtracts 3 seconds from the current timestamp to account for clock drift between your server and ONDC servers:

\`\`\`typescript
const created = Math.floor(Date.now() / 1000) - 3; // Subtract 3 seconds
\`\`\`

This prevents authentication failures due to slight time differences.

## Key Management

### Environment Variables Required

- \`SIGNING_PRIVATE_KEY\`: Ed25519 private key (base64-encoded, 64 bytes)
- \`UNIQUE_KEY_ID\`: Unique identifier for this key pair (e.g., "custom-key-id")
- \`SUBSCRIBER_ID\`: Your registered ONDC subscriber ID (e.g., "ondc-staging.vaatun.com")

## Implementation Reference

See full implementation in:
- \`/src/lib/ondc/client.ts\` - ONDCClient.createAuthorizationHeader()
- \`/src/lib/ondc/signing.ts\` - Ed25519 signing utilities
- \`/src/entities/tenant.ts\` - Key management

## Inbound vs Outbound Authentication

### Outbound (Your App → ONDC)
- **Routes**: \`/api/ondc/lookup\`, \`/api/ondc/subscribe\`, \`/api/ondc/search\`, \`/api/ondc/select\`
- **You sign**: Using your \`SIGNING_PRIVATE_KEY\`
- **ONDC verifies**: Using your public key from registry

### Inbound (ONDC → Your App)
- **Routes**: \`/api/ondc/on_subscribe\`, \`/api/ondc/on_search\`, \`/api/ondc/on_select\`
- **ONDC signs**: Using their private key
- **You verify**: Using their public key from registry (retrieved via \`/lookup\`)
    `,
  },
};

export const security = [{ Ed25519Signature: [] }];
*/

export const securitySchemes = {};
export const security: unknown[] = [];
