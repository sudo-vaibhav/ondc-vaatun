import { NextResponse } from "next/server";
import { createONDCHandler } from "@/lib/context";
import {
  createErrorResponse,
  createRequestBody,
  createResponse,
  type RouteConfig,
} from "@/lib/openapi";
import { z } from "@/lib/zod";

/**
 * Schema for on_subscribe request from ONDC registry
 */
export const OnSubscribeRequestSchema = z
  .object({
    subscriber_id: z
      .string()
      .optional()
      .openapi({ example: "ondc-staging.vaatun.com" }),
    challenge: z.string().openapi({
      example: "base64_encrypted_challenge_string",
      description: "Base64 encoded encrypted challenge from ONDC",
    }),
  })
  .passthrough()
  .openapi("OnSubscribeRequest");

/**
 * Schema for on_subscribe response
 */
export const OnSubscribeResponseSchema = z
  .object({
    answer: z.string().openapi({
      example: "decrypted_challenge_answer",
      description: "Decrypted challenge answer",
    }),
  })
  .openapi("OnSubscribeResponse");

/**
 * OpenAPI route configuration
 */
export const routeConfig: RouteConfig = {
  method: "post",
  path: "/api/ondc/on_subscribe",
  summary: "Handle Subscription Challenge",
  description: `Callback endpoint for ONDC subscription challenge-response verification.

This endpoint is called by the ONDC registry during the subscription process to verify that the subscriber controls the claimed domain.

**Flow:**
1. Registry sends encrypted challenge
2. Service decrypts using shared secret (Diffie-Hellman derived)
3. Returns plaintext answer to prove key possession`,
  tags: ["Registry"],
  operationId: "onSubscribe",
  request: createRequestBody(OnSubscribeRequestSchema, {
    description: "Subscription challenge from ONDC registry",
  }),
  responses: {
    200: createResponse(OnSubscribeResponseSchema, {
      description: "Challenge decrypted successfully",
    }),
    400: createErrorResponse("Challenge is required"),
    500: createErrorResponse("Internal server error"),
  },
};

export const POST = createONDCHandler(async (request, { tenant }) => {
  try {
    const body = await request.json();

    console.log(
      "\n\n[on_subscribe] Request Body:\n\n",
      JSON.stringify(body, null, 2),
    );

    const { challenge, subscriber_id } = body;

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge is required" },
        { status: 400 },
      );
    }

    if (subscriber_id && subscriber_id !== tenant.subscriberId) {
      console.warn("[on_subscribe] Subscriber ID mismatch:", {
        expected: tenant.subscriberId,
        received: subscriber_id,
      });
    }

    const answer = tenant.decryptChallenge(challenge);

    console.log("\n\n[on_subscribe] Answer:\n\n", answer);

    return NextResponse.json({ answer }, { status: 200 });
  } catch (error) {
    console.error("[on_subscribe] Error processing request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
