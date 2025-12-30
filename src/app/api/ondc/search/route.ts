import { NextResponse } from "next/server";
import { v7 as uuidv7 } from "uuid";
import { createONDCHandler } from "@/lib/context";
import {
  createErrorResponse,
  createResponse,
  type RouteConfig,
} from "@/lib/openapi";
import { createSearchEntry } from "@/lib/search-store";
import { z } from "@/lib/zod";
import { createSearchPayload } from "./payload";

/**
 * Schema for search response
 */
export const SearchResponseSchema = z
  .object({
    message: z
      .object({
        ack: z.object({
          status: z.string().openapi({ example: "ACK" }),
        }),
      })
      .optional(),
    transactionId: z.string().uuid().openapi({ example: "019abc12-..." }),
    messageId: z.string().uuid().openapi({ example: "019abc12-..." }),
  })
  .passthrough()
  .openapi("SearchResponse");

/**
 * OpenAPI route configuration
 */
export const routeConfig: RouteConfig = {
  method: "post",
  path: "/api/ondc/search",
  summary: "Search Insurance",
  description: `Initiate a search for insurance products on the ONDC network.

This endpoint broadcasts a search request to the ONDC gateway, which routes it to all registered insurance providers.

**Flow:**
1. Generates transaction and message IDs
2. Creates search payload for health insurance
3. Sends signed request to ONDC gateway
4. Returns transaction ID to poll for results`,
  tags: ["Gateway"],
  operationId: "search",
  responses: {
    200: createResponse(SearchResponseSchema, {
      description: "Search request accepted",
    }),
    503: createErrorResponse("Service unavailable"),
  },
  directoryConfig: {
    title: "Search Insurance",
    description: "Search for insurance products on ONDC network",
  },
};

export const POST = createONDCHandler(
  async (_request, { tenant, ondcClient }) => {
    try {
      const transactionId = uuidv7();
      const messageId = uuidv7();
      const categoryCode = "HEALTH_INSURANCE";

      createSearchEntry(transactionId, messageId, categoryCode);

      const payload = createSearchPayload(transactionId, messageId);
      const gatewayUrl = new URL("search", tenant.gatewayUrl);

      console.log("[Search] Sending request to:", gatewayUrl);
      console.log("[Search] Payload:", JSON.stringify(payload, null, "\t"));

      const response = await ondcClient.send(gatewayUrl, "POST", payload);

      console.log("[Search] ONDC Response:", JSON.stringify(response, null, 2));

      return NextResponse.json({
        ...response,
        transactionId,
        messageId,
      });
    } catch (error) {
      console.error("[Search] Error:", error);
      return NextResponse.json(
        { status: "Search FAIL", ready: false },
        { status: 503 },
      );
    }
  },
);
