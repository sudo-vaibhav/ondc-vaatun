import { NextResponse } from "next/server";
import { createONDCHandler } from "@/lib/context";
import {
  createErrorResponse,
  createResponse,
  type RouteConfig,
} from "@/lib/openapi";
import { z } from "@/lib/zod";

/**
 * Schema for subscriber details in response
 * Uses passthrough() to allow additional undocumented ONDC fields
 */
export const SubscriberSchema = z
  .object({
    subscriber_id: z.string().openapi({ example: "ondc-staging.vaatun.com" }),
    subscriber_url: z.string().optional(),
    type: z.string().openapi({ example: "bap" }),
    domain: z.string().openapi({ example: "ONDC:FIS13" }),
    city: z.string().optional().openapi({ example: "std:080" }),
    country: z.string().optional().openapi({ example: "IND" }),
    signing_public_key: z.string().openapi({ example: "MCowBQYDK2VwAyEA..." }),
    encr_public_key: z.string().openapi({ example: "MCowBQYDK2VuAyEA..." }),
    valid_from: z.string().openapi({ example: "2024-01-01T00:00:00.000Z" }),
    valid_until: z.string().openapi({ example: "2025-12-31T23:59:59.999Z" }),
    status: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
  })
  .passthrough()
  .openapi("Subscriber");

export const LookupResponseSchema = z
  .array(SubscriberSchema)
  .openapi("LookupResponse");

export type SubscriberDetails = z.infer<typeof SubscriberSchema>;

/**
 * OpenAPI route configuration
 */
export const routeConfig: RouteConfig = {
  method: "get",
  path: "/api/ondc/lookup",
  summary: "Lookup Tenant Subscription",
  description: `Look up the current tenant's subscription in the ONDC registry.

This endpoint queries the ONDC Registry using the configured tenant's subscriber ID and domain code to retrieve registration details.

**Use Cases:**
- Verify tenant registration status
- Retrieve public keys for the tenant
- Check subscription validity`,
  tags: ["Registry"],
  operationId: "lookup",
  externalDocs: {
    description: "Beckn Registry API - Lookup Specification",
    url: "https://developers.becknprotocol.io/docs/registry-api-reference/registry/lookup",
  },
  responses: {
    200: createResponse(LookupResponseSchema, {
      description: "Successful lookup",
    }),
    500: createErrorResponse("Server error"),
  },
  directoryConfig: {
    title: "Registry Lookup",
    description: "Look up tenant subscription in the ONDC registry",
  },
};

/**
 * GET /api/ondc/lookup
 *
 * Look up the tenant's subscription in the ONDC registry.
 * Uses tenant's subscriber_id and domain code from environment config.
 *
 * @see https://developers.becknprotocol.io/docs/registry-api-reference/registry/lookup
 */
export const GET = createONDCHandler(
  async (_request, { tenant, ondcClient }) => {
    try {
      // Build lookup payload from tenant config
      const lookupPayload = {
        subscriber_id: tenant.subscriberId,
        domain: tenant.domainCode,
      };

      const registryUrl = new URL("/v2.0/lookup", tenant.registryUrl);

      console.log("[Lookup] Sending request to:", registryUrl.toString());
      console.log("[Lookup] Payload:", JSON.stringify(lookupPayload, null, 2));

      const response = await ondcClient.send<SubscriberDetails[]>(
        registryUrl,
        "POST",
        lookupPayload,
      );

      console.log(
        "[Lookup] Registry Response:",
        JSON.stringify(response, null, 2),
      );

      return NextResponse.json(response);
    } catch (error) {
      console.error("[Lookup] Error:", error);
      return NextResponse.json(
        {
          error: "Failed to lookup subscriber",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      );
    }
  },
);
