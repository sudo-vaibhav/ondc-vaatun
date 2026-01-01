import { NextResponse } from "next/server";
import { createONDCHandler } from "@/lib/context";
import { z } from "@/lib/zod";

/**
 * Schema for subscriber details in response
 * Uses passthrough() to allow additional undocumented ONDC fields
 */
export const SubscriberSchema = z
  .object({
    subscriber_id: z.string(),
    subscriber_url: z.string().optional(),
    type: z.string(),
    domain: z.string(),
    city: z.string().optional(),
    country: z.string().optional(),
    signing_public_key: z.string(),
    encr_public_key: z.string(),
    valid_from: z.string(),
    valid_until: z.string(),
    status: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
  })
  .passthrough();

export const LookupResponseSchema = z.array(SubscriberSchema);

export type SubscriberDetails = z.infer<typeof SubscriberSchema>;

/*
 * OpenAPI route configuration - DISABLED
 *
 * NOTE: OpenAPI spec generation has been disabled.
 * The zod-to-openapi integration was not working in a type-safe way with Zod v4,
 * and the technical benefit of generating OpenAPI specs from Zod schemas
 * did not justify the complexity and type gymnastics required.
 *
 * export const routeConfig: RouteConfig = { ... };
 */

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
