import { type NextRequest, NextResponse } from "next/server";
import {
  createErrorResponse,
  createResponse,
  type RouteConfig,
} from "@/lib/openapi";
import { getSearchResults } from "@/lib/search-store";
import { z } from "@/lib/zod";

/**
 * Schema for provider summary in search results
 */
const ProviderSummarySchema = z
  .object({
    bppId: z.string().openapi({ example: "ondc-mock-server.example.com" }),
    bppUri: z
      .string()
      .optional()
      .openapi({ example: "https://ondc-mock-server.example.com" }),
    name: z.string().optional().openapi({ example: "ICICI Prudential" }),
    itemCount: z.number().int().openapi({ example: 5 }),
    hasError: z.boolean().openapi({ example: false }),
  })
  .openapi("ProviderSummary");

/**
 * Schema for search results response
 */
export const SearchResultsResponseSchema = z
  .object({
    found: z.boolean().openapi({ example: true }),
    transactionId: z
      .string()
      .openapi({ example: "019abc12-3456-7890-abcd-ef1234567890" }),
    messageId: z
      .string()
      .optional()
      .openapi({ example: "019abc12-3456-7890-abcd-ef1234567891" }),
    searchTimestamp: z
      .string()
      .optional()
      .openapi({ example: "2024-01-01T00:00:00.000Z" }),
    categoryCode: z
      .string()
      .optional()
      .openapi({ example: "HEALTH_INSURANCE" }),
    responseCount: z.number().int().openapi({ example: 3 }),
    providers: z.array(ProviderSummarySchema).openapi({
      example: [
        {
          bppId: "ondc-mock-server.example.com",
          bppUri: "https://ondc-mock-server.example.com",
          name: "ICICI Prudential",
          itemCount: 5,
          hasError: false,
        },
      ],
    }),
    responses: z.array(z.any()).openapi({
      description: "Raw on_search responses from BPPs",
    }),
    message: z.string().optional().openapi({
      example: "No search entry found for this transaction ID",
    }),
  })
  .passthrough()
  .openapi("SearchResultsResponse");

/**
 * OpenAPI route configuration
 */
export const routeConfig: RouteConfig = {
  method: "get",
  path: "/api/ondc/search-results",
  summary: "Poll Search Results",
  description: `Polling endpoint to fetch aggregated search results for a transaction.

Called by the frontend to retrieve on_search responses collected from BPPs.

**Flow:**
1. Client polls with transaction_id from initial search
2. Returns all collected on_search responses
3. Includes provider summary with item counts
4. Poll until desired providers respond or timeout`,
  tags: ["Internal"],
  operationId: "getSearchResults",
  request: {
    query: z.object({
      transaction_id: z.string().uuid().openapi({
        example: "019abc12-3456-7890-abcd-ef1234567890",
        description: "Transaction ID from the initial search request",
      }),
    }),
  },
  responses: {
    200: createResponse(SearchResultsResponseSchema, {
      description: "Search results (may be empty if no responses yet)",
    }),
    400: createErrorResponse("Missing transaction_id query parameter"),
    500: createErrorResponse("Internal server error"),
  },
  directoryConfig: {
    title: "Poll Search Results",
    description: "Fetch aggregated search results by transaction ID",
  },
};

/**
 * GET /api/ondc/search-results?transaction_id=xxx
 *
 * Polling endpoint to fetch aggregated search results for a transaction.
 * Called by the frontend to get on_search responses.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transaction_id");

    if (!transactionId) {
      return NextResponse.json(
        { error: "Missing transaction_id query parameter" },
        { status: 400 },
      );
    }

    const results = getSearchResults(transactionId);

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
}
