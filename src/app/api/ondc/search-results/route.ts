import { NextResponse } from "next/server";
import { createONDCHandler } from "@/lib/context";
import { getSearchResults } from "@/lib/search-store";
import { z } from "@/lib/zod";

/**
 * Schema for provider summary in search results
 */
const ProviderSummarySchema = z.object({
  bppId: z.string(),
  bppUri: z.string().optional(),
  name: z.string().optional(),
  itemCount: z.number().int(),
  hasError: z.boolean(),
});

/**
 * Schema for search results response
 */
export const SearchResultsResponseSchema = z
  .object({
    found: z.boolean(),
    transactionId: z.string(),
    messageId: z.string().optional(),
    searchTimestamp: z.string().optional(),
    categoryCode: z.string().optional(),
    responseCount: z.number().int(),
    providers: z.array(ProviderSummarySchema),
    responses: z.array(z.any()),
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
 * GET /api/ondc/search-results?transaction_id=xxx
 *
 * Polling endpoint to fetch aggregated search results for a transaction.
 * Called by the frontend to get on_search responses.
 */
export const GET = createONDCHandler(async (request, { kv }) => {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transaction_id");

    if (!transactionId) {
      return NextResponse.json(
        { error: "Missing transaction_id query parameter" },
        { status: 400 },
      );
    }

    const results = await getSearchResults(kv, transactionId);

    if (!results) {
      return NextResponse.json(
        {
          found: false,
          transactionId,
          responseCount: 0,
          providers: [],
          responses: [],
          message: "No search entry found for this transaction ID",
        },
        { status: 200 },
      );
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("[search-results] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
