import { type NextRequest, NextResponse } from "next/server";
import { createONDCHandler } from "@/lib/context";
import {
  createErrorResponse,
  createResponse,
  type RouteConfig,
} from "@/lib/openapi";
import { getSelectResult } from "@/lib/select-store";
import { z } from "@/lib/zod";

/**
 * Schema for quote price
 */
const QuotePriceSchema = z
  .object({
    currency: z.string().openapi({ example: "INR" }),
    value: z.string().openapi({ example: "15000.00" }),
  })
  .passthrough();

/**
 * Schema for quote breakup item
 */
const QuoteBreakupSchema = z
  .object({
    title: z.string().openapi({ example: "Base Premium" }),
    price: QuotePriceSchema,
    item: z
      .object({
        id: z.string().optional(),
        add_ons: z.array(z.object({ id: z.string() })).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

/**
 * Schema for quote
 */
const QuoteSchema = z
  .object({
    id: z.string().optional().openapi({ example: "quote-001" }),
    price: QuotePriceSchema,
    breakup: z.array(QuoteBreakupSchema).optional(),
    ttl: z.string().optional().openapi({ example: "PT30M" }),
  })
  .passthrough()
  .openapi("Quote");

/**
 * Schema for provider in select result
 */
const SelectProviderSchema = z
  .object({
    id: z.string().openapi({ example: "provider-001" }),
    descriptor: z
      .object({
        name: z.string().optional().openapi({ example: "ICICI Prudential" }),
        short_desc: z.string().optional(),
        long_desc: z.string().optional(),
        images: z.array(z.any()).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()
  .openapi("SelectProvider");

/**
 * Schema for item in select result
 */
const SelectItemSchema = z
  .object({
    id: z.string().openapi({ example: "item-001" }),
    parent_item_id: z.string().optional(),
    descriptor: z
      .object({
        name: z.string().optional().openapi({ example: "Health Guard Plus" }),
        short_desc: z.string().optional(),
        long_desc: z.string().optional(),
        images: z.array(z.any()).optional(),
      })
      .passthrough()
      .optional(),
    price: QuotePriceSchema.optional(),
    xinput: z.any().optional(),
    add_ons: z.array(z.any()).optional(),
    tags: z.array(z.any()).optional(),
  })
  .passthrough()
  .openapi("SelectItem");

/**
 * Schema for select results response
 */
export const SelectResultsResponseSchema = z
  .object({
    found: z.boolean().openapi({ example: true }),
    transactionId: z
      .string()
      .openapi({ example: "019abc12-3456-7890-abcd-ef1234567890" }),
    messageId: z
      .string()
      .openapi({ example: "019abc12-3456-7890-abcd-ef1234567891" }),
    itemId: z.string().optional().openapi({ example: "item-001" }),
    providerId: z.string().optional().openapi({ example: "provider-001" }),
    hasResponse: z.boolean().openapi({ example: true }),
    quote: QuoteSchema.optional(),
    provider: SelectProviderSchema.optional(),
    item: SelectItemSchema.optional(),
    xinput: z.any().optional().openapi({
      description: "XInput form details for additional data collection",
    }),
    error: z
      .object({
        code: z.string().optional(),
        message: z.string().optional(),
      })
      .passthrough()
      .optional(),
    message: z.string().optional().openapi({
      example: "No select entry found for this transaction",
    }),
  })
  .passthrough()
  .openapi("SelectResultsResponse");

/**
 * OpenAPI route configuration
 */
export const routeConfig: RouteConfig = {
  method: "get",
  path: "/api/ondc/select-results",
  summary: "Poll Quote Results",
  description: `Polling endpoint to fetch quote (select) results for a transaction.

Called by the frontend to retrieve on_select response with pricing details.

**Flow:**
1. Client polls with transaction_id and message_id from initial select
2. Returns quote with price breakup when available
3. May include XInput form for additional data collection
4. Poll until response received or timeout`,
  tags: ["Internal"],
  operationId: "getSelectResults",
  request: {
    query: z.object({
      transaction_id: z.string().uuid().openapi({
        example: "019abc12-3456-7890-abcd-ef1234567890",
        description: "Transaction ID from the initial select request",
      }),
      message_id: z.string().uuid().openapi({
        example: "019abc12-3456-7890-abcd-ef1234567891",
        description: "Message ID from the initial select request",
      }),
    }),
  },
  responses: {
    200: createResponse(SelectResultsResponseSchema, {
      description: "Select results (may be empty if no response yet)",
    }),
    400: createErrorResponse(
      "Missing transaction_id or message_id query parameters",
    ),
    500: createErrorResponse("Internal server error"),
  },
  directoryConfig: {
    title: "Poll Quote Results",
    description: "Fetch quote results by transaction and message ID",
  },
};

/**
 * GET /api/ondc/select-results?transaction_id=xxx&message_id=yyy
 *
 * Polling endpoint to fetch select results (quote) for a transaction.
 * Called by the frontend to get on_select response.
 */
export const GET = createONDCHandler(async (request, { kv }) => {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transaction_id");
    const messageId = searchParams.get("message_id");

    if (!transactionId || !messageId) {
      return NextResponse.json(
        { error: "Missing transaction_id or message_id query parameters" },
        { status: 400 },
      );
    }

    const result = await getSelectResult(kv, transactionId, messageId);

    if (!result.found) {
      return NextResponse.json(
        {
          found: false,
          transactionId,
          messageId,
          hasResponse: false,
          message: "No select entry found for this transaction",
        },
        { status: 200 },
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[select-results] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
