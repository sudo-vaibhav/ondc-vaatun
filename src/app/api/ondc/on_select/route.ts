import { NextResponse } from "next/server";
import { createONDCHandler } from "@/lib/context";
import { addSelectResponse } from "@/lib/select-store";
import { z } from "@/lib/zod";

/**
 * Schema for Beckn context in on_select callback
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
 * Schema for quote price
 */
const QuotePriceSchema = z
  .object({
    currency: z.string().optional(),
    value: z.string().optional(),
  })
  .passthrough();

/**
 * Schema for on_select request from BPPs
 * Uses passthrough since ONDC quote structure is complex and evolving
 */
export const OnSelectRequestSchema = z
  .object({
    context: BecknContextSchema.optional(),
    message: z
      .object({
        order: z
          .object({
            provider: z.any().optional(),
            items: z.array(z.any()).optional(),
            quote: z
              .object({
                price: QuotePriceSchema.optional(),
                breakup: z.array(z.any()).optional(),
              })
              .passthrough()
              .optional(),
          })
          .passthrough()
          .optional(),
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

/**
 * Handler for ONDC on_select callback
 * BPPs call this endpoint after processing a select request
 */
export const POST = createONDCHandler(async (request, { kv }) => {
  try {
    const body = await request.json();
    console.log(
      "\n\n[on_select] Request Body:\n\n",
      JSON.stringify(body, null, 2),
    );

    // Extract key information from the response
    const transactionId = body.context?.transaction_id;
    const messageId = body.context?.message_id;
    const bppId = body.context?.bpp_id;
    const quote = body.message?.order?.quote;
    const error = body.error;

    if (error) {
      console.error("[on_select] BPP returned error:", error);
    } else if (quote) {
      console.log("[on_select] Quote received:", {
        transactionId,
        messageId,
        bppId,
        price: quote.price,
        breakup: quote.breakup?.length || 0,
      });
    }

    // Store the on_select response
    if (transactionId && messageId) {
      await addSelectResponse(kv, transactionId, messageId, body);
    } else {
      console.warn("[on_select] Missing transaction_id or message_id");
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
    console.error("[on_select] Error processing request:", error);
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
