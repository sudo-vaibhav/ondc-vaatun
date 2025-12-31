import { type NextRequest, NextResponse } from "next/server";
import { createONDCHandler } from "@/lib/context";
import {
  createErrorResponse,
  createRequestBody,
  createResponse,
  type RouteConfig,
} from "@/lib/openapi";
import { addSearchResponse } from "@/lib/search-store";
import { z } from "@/lib/zod";

/**
 * Schema for Beckn context in on_search callback
 * Uses passthrough to allow undocumented ONDC fields
 */
const BecknContextSchema = z
  .object({
    domain: z.string().optional().openapi({ example: "ONDC:FIS13" }),
    action: z.string().optional().openapi({ example: "on_search" }),
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
  .passthrough()
  .openapi("BecknContext");

/**
 * Schema for on_search request from BPPs
 * Uses passthrough since ONDC catalog structure is complex and evolving
 */
export const OnSearchRequestSchema = z
  .object({
    context: BecknContextSchema.optional(),
    message: z
      .object({
        catalog: z.any().optional().openapi({
          description: "BPP catalog with providers and items",
        }),
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
  .openapi("OnSearchRequest");

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
  .openapi("AckResponse");

/**
 * OpenAPI route configuration
 */
export const routeConfig: RouteConfig = {
  method: "post",
  path: "/api/ondc/on_search",
  summary: "Receive Search Results",
  description: `Callback endpoint for receiving search results from BPPs.

This endpoint is called by BPPs (seller platforms) in response to a search request broadcast by the gateway.

**Flow:**
1. BPP sends catalog with matching providers and items
2. Service stores the response keyed by transaction_id
3. Returns ACK to confirm receipt
4. Results can be polled via /api/ondc/search-results`,
  tags: ["Gateway"],
  operationId: "onSearch",
  request: createRequestBody(OnSearchRequestSchema, {
    description: "Search results from BPP",
  }),
  responses: {
    200: createResponse(AckResponseSchema, {
      description: "Search results acknowledged",
    }),
    500: createErrorResponse("Internal server error"),
  },
};

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
