import { NextResponse } from "next/server";
import { createONDCHandler } from "@/lib/context";
import { z } from "@/lib/zod";

/**
 * Schema for health check response
 */
export const HealthResponseSchema = z.object({
  status: z.string(),
  ready: z.boolean(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

/*
 * OpenAPI route configuration - DISABLED
 *
 * NOTE: OpenAPI spec generation has been disabled.
 * The zod-to-openapi integration was not working in a type-safe way with Zod v4,
 * and the technical benefit of generating OpenAPI specs from Zod schemas
 * did not justify the complexity and type gymnastics required.
 *
 * export const routeConfig: RouteConfig = {
 *   method: "get",
 *   path: "/api/ondc/health",
 *   summary: "Health Check",
 *   ...
 * };
 */

export const GET = createONDCHandler(async (_request, _ctx) => {
  try {
    // If we get here, context initialization succeeded
    return NextResponse.json(
      { status: "Health OK!!", ready: true },
      { status: 200 },
    );
  } catch (error) {
    console.error("[health] Service not ready:", error);
    return NextResponse.json(
      { status: "Health FAIL", ready: false },
      { status: 503 },
    );
  }
});
