import { NextResponse } from "next/server";
import { createONDCHandler } from "@/lib/context";
import { z } from "@/lib/zod";

/**
 * Schema for on_subscribe request from ONDC registry
 */
export const OnSubscribeRequestSchema = z
  .object({
    subscriber_id: z.string().optional(),
    challenge: z.string(),
  })
  .passthrough();

/**
 * Schema for on_subscribe response
 */
export const OnSubscribeResponseSchema = z.object({
  answer: z.string(),
});

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

export const POST = createONDCHandler(async (request, { tenant }) => {
  try {
    const body = await request.json();

    console.log(
      "\n\n[on_subscribe] Request Body:\n\n",
      JSON.stringify(body, null, 2),
    );

    const { challenge, subscriber_id } = body;

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge is required" },
        { status: 400 },
      );
    }

    if (subscriber_id && subscriber_id !== tenant.subscriberId) {
      console.warn("[on_subscribe] Subscriber ID mismatch:", {
        expected: tenant.subscriberId,
        received: subscriber_id,
      });
    }

    const answer = tenant.decryptChallenge(challenge);

    console.log("\n\n[on_subscribe] Answer:\n\n", answer);

    return NextResponse.json({ answer }, { status: 200 });
  } catch (error) {
    console.error("[on_subscribe] Error processing request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
