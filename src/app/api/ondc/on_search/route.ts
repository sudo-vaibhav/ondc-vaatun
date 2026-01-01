import { NextResponse } from "next/server";
import { createONDCHandler } from "@/lib/context";
import { addSearchResponse } from "@/lib/search-store";
import { z } from "@/lib/zod";

/**
 * Schema for Beckn context in on_search callback
 * Uses passthrough to allow undocumented ONDC fields
 */
const BecknContextSchema = z
  .object({
    domain: z.string().optional(),
    action: z.string().optional(),
    bap_id: z.string().optional(),
    bap_uri: z.string().optional(),
    bpp_id: z.string().optional(),
    bpp_uri: z.string().optional(),
    transaction_id: z.string().optional(),
    message_id: z.string().optional(),
    timestamp: z.string().optional(),
    version: z.string().optional(),
  })
  .passthrough();

/**
 * Schema for on_search request from BPPs
 * Uses passthrough since ONDC catalog structure is complex and evolving
 */
export const OnSearchRequestSchema = z
  .object({
    context: BecknContextSchema.optional(),
    message: z
      .object({
        catalog: z.any().optional(),
      })
      .passthrough()
      .optional(),
    error: z
      .object({
        type: z.string().optional(),
        code: z.string().optional(),
        message: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

/**
 * Schema for ACK response
 */
export const AckResponseSchema = z.object({
  message: z.object({
    ack: z.object({
      status: z.enum(["ACK", "NACK"]),
    }),
  }),
  error: z
    .object({
      type: z.string().optional(),
      code: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
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

export const POST = createONDCHandler(async (request, { kv }) => {
  try {
    const body = await request.json();
    console.log(
      "\n\n[on_search] Request Body:\n\n",
      JSON.stringify(body, null, "\t"),
    );

    // Extract transaction_id from the context
    const transactionId = body.context?.transaction_id;

    if (transactionId) {
      // Store the response for later retrieval
      await addSearchResponse(kv, transactionId, body);
    } else {
      console.warn("[on_search] No transaction_id found in context");
    }

    // Always return ACK to ONDC
    return NextResponse.json(
      {
        message: {
          ack: {
            status: "ACK",
          },
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[on_search] Error processing request:", error);
    return NextResponse.json(
      {
        message: {
          ack: {
            status: "NACK",
          },
        },
        error: {
          type: "DOMAIN-ERROR",
          code: "500",
          message: "Internal server error",
        },
      },
      { status: 500 },
    );
  }
});
