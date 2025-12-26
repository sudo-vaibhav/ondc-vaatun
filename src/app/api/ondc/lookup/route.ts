import { NextResponse } from "next/server";
import { createONDCHandler } from "@/lib/context";
import {
  createErrorResponse,
  createRequestBody,
  createResponse,
  type RouteConfig,
} from "@/lib/openapi";
import { z } from "@/lib/zod";

/**
 * Schema for lookup request body
 * Based on Beckn Registry API specification
 * @see https://developers.becknprotocol.io/docs/registry-api-reference/registry/lookup
 */
export const LookupRequestSchema = z
  .object({
    subscriber_id: z
      .string()
      .optional()
      .openapi({ example: "ondc-staging.vaatun.com" }),
    country: z.string().optional().openapi({ example: "IND" }),
    city: z.string().optional().openapi({ example: "*" }),
    domain: z.string().optional().openapi({ example: "ONDC:FIS13" }),
    type: z
      .enum(["bg", "bap", "bpp", "BAP", "BPP", "BG"])
      .optional()
      .openapi({ example: "bap" }),
  })
  .openapi("LookupRequest");

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

export type LookupRequest = z.infer<typeof LookupRequestSchema>;
export type SubscriberDetails = z.infer<typeof SubscriberSchema>;

/**
 * OpenAPI route configuration - uses Zod schemas directly.
 * The generator auto-generates $ref references and includes
 * field-level examples from .openapi({ example: ... })
 */
export const routeConfig: RouteConfig = {
  method: "post",
  path: "/api/ondc/lookup",
  summary: "Lookup Subscribers",
  description: `Look up subscriber(s) in the ONDC registry by various filters.

This endpoint queries the ONDC Registry to find registered network participants (BAPs, BPPs, or Gateways). You can filter by subscriber ID, type, domain, country, or city.

**Use Cases:**
- Find a specific subscriber by ID
- List all BAPs in the insurance domain
- Discover BPPs in a specific city
- Retrieve public keys for signature verification`,
  tags: ["Registry"],
  operationId: "lookup",
  externalDocs: {
    description: "Beckn Registry API - Lookup Specification",
    url: "https://developers.becknprotocol.io/docs/registry-api-reference/registry/lookup",
  },
  security: [{ Ed25519Signature: [] }],
  request: createRequestBody(LookupRequestSchema),
  responses: {
    200: createResponse(LookupResponseSchema, {
      description: "Successful lookup",
    }),
    400: createErrorResponse("Invalid request parameters"),
    500: createErrorResponse("Server error"),
  },
};

/**
 * POST /api/ondc/lookup
 *
 * Look up subscriber(s) in the ONDC registry.
 * Forwards the lookup request to the configured registry URL.
 *
 * @see https://developers.becknprotocol.io/docs/registry-api-reference/registry/lookup
 */
export const POST = createONDCHandler(
  async (request, { tenant, ondcClient }) => {
    try {
      const body = await request.json();

      // Validate request body
      const parseResult = LookupRequestSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          {
            error: "Invalid request body",
            details: parseResult.error.flatten(),
          },
          { status: 400 },
        );
      }

      const lookupPayload: LookupRequest = parseResult.data;
      const registryUrl = new URL("/v2.0/lookup", tenant.registryUrl);

      console.log("[Lookup] Sending request to:", registryUrl.toString());
      console.log("[Lookup] Payload:", JSON.stringify(lookupPayload, null, 2));

      const response = await ondcClient.send<SubscriberDetails[]>(
        registryUrl,
        "GET",
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
