import { NextResponse } from "next/server";
import { createONDCHandler } from "@/lib/context";
import { LookupRequest, SubscriberDetails, LookupRequestSchema } from "./types";
import { createLookupPayload } from "./payload";

/**
 * POST /api/ondc/lookup
 *
 * Look up subscriber(s) in the ONDC registry.
 * Forwards the lookup request to the configured registry URL.
 *
 * @see https://developers.becknprotocol.io/docs/registry-api-reference/registry/lookup
 */
export const POST = createONDCHandler(
  async (_request, { tenant, ondcClient }) => {
    try {
      const body = createLookupPayload();

      // Validate request body
      const parsedBody = LookupRequestSchema.safeParse(body);
      if (!parsedBody.success) {
        return NextResponse.json(
          {
            error: "Invalid request body",
            details: parsedBody.error.flatten(),
          },
          { status: 400 },
        );
      }

      const lookupPayload: LookupRequest = parsedBody.data;
      const registryUrl = new URL("/lookup", tenant.registryUrl);

      console.log("[Lookup] Sending request to:", registryUrl.toString());
      console.log("[Lookup] Payload:", JSON.stringify(lookupPayload, null, 2));

      const response = await ondcClient.send<SubscriberDetails>(
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
