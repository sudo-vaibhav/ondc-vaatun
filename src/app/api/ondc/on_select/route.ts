import { type NextRequest, NextResponse } from "next/server";
import { createONDCHandler } from "@/lib/context";
import {
  createErrorResponse,
  createRequestBody,
  createResponse,
  type RouteConfig,
} from "@/lib/openapi";
import { addSelectResponse } from "@/lib/select-store";
import { z } from "@/lib/zod";

/**
 * Schema for Beckn context in on_select callback
 * Uses passthrough to allow undocumented ONDC fields
 */
const BecknContextSchema = z
  .object({
    domain: z.string().optional().openapi({ example: "ONDC:FIS13" }),
    action: z.string().optional().openapi({ example: "on_select" }),
    bap_id: z
      .string()
      .optional()
      .openapi({ example: "ondc-staging.vaatun.com" }),
    bap_uri: z
      .string()
      .optional()
      .openapi({ example: "https://ondc-staging.vaatun.com/api/ondc" }),
    bpp_id: z
      .string()
      .optional()
      .openapi({ example: "ondc-mock-server.example.com" }),
    bpp_uri: z
      .string()
      .optional()
      .openapi({ example: "https://ondc-mock-server.example.com" }),
    transaction_id: z
      .string()
      .optional()
      .openapi({ example: "019abc12-3456-7890-abcd-ef1234567890" }),
    message_id: z
      .string()
      .optional()
      .openapi({ example: "019abc12-3456-7890-abcd-ef1234567891" }),
    timestamp: z
      .string()
      .optional()
      .openapi({ example: "2024-01-01T00:00:00.000Z" }),
    version: z.string().optional().openapi({ example: "2.0.1" }),
  })
  .passthrough();

/**
 * Schema for quote price
 */
const QuotePriceSchema = z
  .object({
    currency: z.string().optional().openapi({ example: "INR" }),
    value: z.string().optional().openapi({ example: "1000.00" }),
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
  .passthrough()
  .openapi("OnSelectRequest");

/**
 * Schema for ACK response
 */
export const AckResponseSchema = z
  .object({
    message: z.object({
      ack: z.object({
        status: z.enum(["ACK", "NACK"]).openapi({ example: "ACK" }),
      }),
    }),
    error: z
      .object({
        type: z.string().optional(),
        code: z.string().optional(),
        message: z.string().optional(),
      })
      .optional(),
  })
  .openapi("OnSelectAckResponse");

/**
 * OpenAPI route configuration
 */
export const routeConfig: RouteConfig = {
  method: "post",
  path: "/api/ondc/on_select",
  summary: "Receive Quote",
  description: `Callback endpoint for receiving quotes from BPPs.

This endpoint is called by BPPs (seller platforms) in response to a select request with pricing details.

**Flow:**
1. BPP sends order quote with price breakup
2. Service stores the response keyed by transaction_id and message_id
3. Returns ACK to confirm receipt
4. Quote can be polled via /api/ondc/select-results`,
  tags: ["Gateway"],
  operationId: "onSelect",
  request: createRequestBody(OnSelectRequestSchema, {
    description: "Quote from BPP",
  }),
  responses: {
    200: createResponse(AckResponseSchema, {
      description: "Quote acknowledged",
    }),
    500: createErrorResponse("Internal server error"),
  },
};

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
