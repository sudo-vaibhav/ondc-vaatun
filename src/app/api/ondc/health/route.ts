import { NextResponse } from "next/server";
import { createONDCHandler } from "@/lib/context";
import { createResponse, type RouteConfig } from "@/lib/openapi";
import { z } from "@/lib/zod";

/**
 * Schema for health check response
 */
export const HealthResponseSchema = z
  .object({
    status: z.string().openapi({ example: "Health OK!!" }),
    ready: z.boolean().openapi({ example: true }),
  })
  .openapi("HealthResponse");

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

/**
 * OpenAPI route configuration.
 * Field-level examples come from .openapi({ example: ... }) in the schema.
 */
export const routeConfig: RouteConfig = {
  method: "get",
  path: "/api/ondc/health",
  summary: "Health Check",
  description:
    "Service health monitoring endpoint. Returns service status and readiness. Verifies that tenant configuration is loaded and ONDC client is initialized.",
  tags: ["Internal"],
  operationId: "healthCheck",
  responses: {
    200: createResponse(HealthResponseSchema, {
      description: "Service is healthy and ready",
    }),
    503: createResponse(HealthResponseSchema, {
      description: "Service is not ready",
    }),
  },
};

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
