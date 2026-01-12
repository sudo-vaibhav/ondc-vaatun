import { NextResponse } from "next/server";
import { v7 as uuidv7 } from "uuid";
import { createONDCHandler } from "@/lib/context";
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
          status: z.string(),
        }),
      })
      .optional(),
    transactionId: z.string().uuid(),
    messageId: z.string().uuid(),
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

const SearchRequestSchema = z.object({
  categoryCode: z.string().optional(),
});

export const POST = createONDCHandler(
  async (request, { tenant, ondcClient, kv }) => {
    try {
      const body = await request.json().catch(() => ({}));
      const parsed = SearchRequestSchema.safeParse(body);
      const categoryCode = parsed.success
        ? parsed.data.categoryCode
        : undefined;

      const transactionId = uuidv7();
      const messageId = uuidv7();

      await createSearchEntry(kv, transactionId, messageId, categoryCode);

      const payload = createSearchPayload(
        transactionId,
        messageId,
        categoryCode,
      );
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
