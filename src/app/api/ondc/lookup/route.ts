import { NextResponse } from "next/server";
import { z } from "zod";
import { createONDCHandler } from "@/lib/context";

/**
 * Schema for lookup request body
 * Based on Beckn Registry API specification
 */
const LookupRequestSchema = z.object({
  subscriber_id: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  domain: z.string().optional(),
  type: z.enum(["bg", "bap", "bpp", "BAP", "BPP", "BG"]).optional(),
});

/**
 * Schema for subscriber details in response
 */
const SubscriberSchema = z.looseObject({
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
});

type LookupRequest = z.infer<typeof LookupRequestSchema>;
type SubscriberDetails = z.infer<typeof SubscriberSchema>;

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
      const registryUrl = new URL("/lookup", tenant.registryUrl);

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
