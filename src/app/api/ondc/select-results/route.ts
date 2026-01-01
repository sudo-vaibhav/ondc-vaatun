import { NextResponse } from "next/server";
import { createONDCHandler } from "@/lib/context";
import { getSelectResult } from "@/lib/select-store";
import { z } from "@/lib/zod";

/**
 * Schema for quote price
 */
const QuotePriceSchema = z
  .object({
    currency: z.string(),
    value: z.string(),
  })
  .passthrough();

/**
 * Schema for quote breakup item
 */
const QuoteBreakupSchema = z
  .object({
    title: z.string(),
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
    id: z.string().optional(),
    price: QuotePriceSchema,
    breakup: z.array(QuoteBreakupSchema).optional(),
    ttl: z.string().optional(),
  })
  .passthrough();

/**
 * Schema for provider in select result
 */
const SelectProviderSchema = z
  .object({
    id: z.string(),
    descriptor: z
      .object({
        name: z.string().optional(),
        short_desc: z.string().optional(),
        long_desc: z.string().optional(),
        images: z.array(z.any()).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

/**
 * Schema for item in select result
 */
const SelectItemSchema = z
  .object({
    id: z.string(),
    parent_item_id: z.string().optional(),
    descriptor: z
      .object({
        name: z.string().optional(),
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
  .passthrough();

/**
 * Schema for select results response
 */
export const SelectResultsResponseSchema = z
  .object({
    found: z.boolean(),
    transactionId: z.string(),
    messageId: z.string(),
    itemId: z.string().optional(),
    providerId: z.string().optional(),
    hasResponse: z.boolean(),
    quote: QuoteSchema.optional(),
    provider: SelectProviderSchema.optional(),
    item: SelectItemSchema.optional(),
    xinput: z.any().optional(),
    error: z
      .object({
        code: z.string().optional(),
        message: z.string().optional(),
      })
      .passthrough()
      .optional(),
    message: z.string().optional(),
  })
  .passthrough();

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
