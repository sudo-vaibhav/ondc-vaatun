import { NextResponse } from "next/server";
import { v7 as uuidv7 } from "uuid";
import { createONDCHandler } from "@/lib/context";
import {
  createErrorResponse,
  createRequestBody,
  createResponse,
  type RouteConfig,
} from "@/lib/openapi";
import { createSelectEntry } from "@/lib/select-store";
import { z } from "@/lib/zod";

/**
 * Schema for add-on items in select request
 */
const AddOnSchema = z
  .object({
    id: z.string().openapi({ example: "addon-001" }),
    quantity: z.number().int().positive().openapi({ example: 1 }),
  })
  .openapi("SelectAddOn");

/**
 * Schema for select request body
 */
export const SelectRequestSchema = z
  .object({
    transactionId: z
      .string()
      .uuid()
      .openapi({ example: "019abc12-3456-7890-abcd-ef1234567890" }),
    bppId: z.string().openapi({ example: "ondc-mock-server.example.com" }),
    bppUri: z
      .string()
      .url()
      .openapi({ example: "https://ondc-mock-server.example.com/api/ondc" }),
    providerId: z.string().openapi({ example: "provider-001" }),
    itemId: z.string().openapi({ example: "item-001" }),
    parentItemId: z.string().openapi({ example: "item-001" }),
    xinputFormId: z.string().optional().openapi({ example: "form-001" }),
    xinputSubmissionId: z
      .string()
      .optional()
      .openapi({ example: "submission-001" }),
    addOns: z
      .array(AddOnSchema)
      .optional()
      .openapi({ example: [{ id: "addon-001", quantity: 1 }] }),
  })
  .openapi("SelectRequest");

/**
 * Schema for select response
 */
export const SelectResponseSchema = z
  .object({
    message: z
      .object({
        ack: z.object({
          status: z.string().openapi({ example: "ACK" }),
        }),
      })
      .optional(),
    transactionId: z
      .string()
      .uuid()
      .openapi({ example: "019abc12-3456-7890-abcd-ef1234567890" }),
    messageId: z
      .string()
      .uuid()
      .openapi({ example: "019abc12-3456-7890-abcd-ef1234567891" }),
  })
  .passthrough()
  .openapi("SelectResponse");

/**
 * OpenAPI route configuration
 */
export const routeConfig: RouteConfig = {
  method: "post",
  path: "/api/ondc/select",
  summary: "Select Insurance Item",
  description: `Select a specific insurance item to get a quote.

This endpoint sends a select request to the BPP (seller) to get pricing details for a specific item.

**Flow:**
1. Receives item selection with provider and item IDs
2. Optionally includes XInput form submission for eligibility
3. Sends signed request directly to BPP
4. Returns transaction ID to poll for quote via on_select callback`,
  tags: ["Gateway"],
  operationId: "select",
  request: createRequestBody(SelectRequestSchema, {
    description: "Item selection details",
  }),
  responses: {
    200: createResponse(SelectResponseSchema, {
      description: "Select request accepted",
    }),
    400: createErrorResponse("Missing required fields"),
    503: createErrorResponse("Service unavailable"),
  },
  directoryConfig: {
    title: "Select Item",
    description: "Select an insurance item to get a quote",
    payload: {
      transactionId: "019abc12-3456-7890-abcd-ef1234567890",
      bppId: "ondc-mock-server.example.com",
      bppUri: "https://ondc-mock-server.example.com/api/ondc",
      providerId: "provider-001",
      itemId: "item-001",
      parentItemId: "item-001",
    },
  },
};

type SelectRequestBody = z.infer<typeof SelectRequestSchema>;

export const POST = createONDCHandler(
  async (request, { tenant, ondcClient }) => {
    try {
      const body: SelectRequestBody = await request.json();

      if (
        !body.transactionId ||
        !body.bppId ||
        !body.bppUri ||
        !body.providerId ||
        !body.itemId
      ) {
        return NextResponse.json(
          {
            error: "Missing required fields",
            required: [
              "transactionId",
              "bppId",
              "bppUri",
              "providerId",
              "itemId",
            ],
          },
          { status: 400 },
        );
      }

      const messageId = uuidv7();

      const items: [
        {
          id: string;
          parent_item_id: string;
          add_ons?: Array<{
            id: string;
            quantity?: { selected?: { count: number } };
          }>;
          xinput?: {
            form?: { id?: string };
            form_response?: { submission_id: string; status: string };
          };
        },
      ] = [
        {
          id: body.itemId,
          parent_item_id: body.parentItemId || body.itemId,
        },
      ];

      if (body.xinputFormId && body.xinputSubmissionId) {
        items[0].xinput = {
          form: { id: body.xinputFormId },
          form_response: {
            submission_id: body.xinputSubmissionId,
            status: "APPROVED",
          },
        };
      }

      if (body.addOns && body.addOns.length > 0) {
        items[0].add_ons = body.addOns.map((addon) => ({
          id: addon.id,
          quantity: { selected: { count: addon.quantity } },
        }));
      }

      const payload = {
        context: {
          action: "select",
          bap_id: tenant.subscriberId,
          bap_uri: `https://${tenant.subscriberId}/api/ondc`,
          bpp_id: body.bppId,
          bpp_uri: body.bppUri,
          domain: tenant.domainCode,
          location: {
            country: { code: "IND" },
            city: { code: "*" },
          },
          transaction_id: body.transactionId,
          message_id: messageId,
          timestamp: new Date().toISOString(),
          ttl: "PT30S",
          version: "2.0.1",
        },
        message: {
          order: {
            provider: { id: body.providerId },
            items: items,
          },
        },
      };

      const selectUrl = body.bppUri.endsWith("/")
        ? `${body.bppUri}select`
        : `${body.bppUri}/select`;

      createSelectEntry(
        body.transactionId,
        messageId,
        body.itemId,
        body.providerId,
        body.bppId,
        body.bppUri,
      );

      console.log("[Select] Sending request to:", selectUrl);
      console.log("[Select] Payload:", JSON.stringify(payload, null, 2));

      const response = await ondcClient.send(selectUrl, "POST", payload);

      console.log("[Select] ONDC Response:", JSON.stringify(response, null, 2));

      return NextResponse.json({
        ...response,
        transactionId: body.transactionId,
        messageId,
      });
    } catch (error) {
      console.error("[Select] Error:", error);
      return NextResponse.json(
        {
          status: "Select FAIL",
          error: error instanceof Error ? error.message : "Unknown error",
          ready: false,
        },
        { status: 503 },
      );
    }
  },
);
