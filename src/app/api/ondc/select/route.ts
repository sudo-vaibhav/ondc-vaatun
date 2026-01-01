import { NextResponse } from "next/server";
import { v7 as uuidv7 } from "uuid";
import { createONDCHandler } from "@/lib/context";
import { createSelectEntry } from "@/lib/select-store";
import { z } from "@/lib/zod";

/**
 * Schema for add-on items in select request
 */
const AddOnSchema = z.object({
  id: z.string(),
  quantity: z.number().int().positive(),
});

/**
 * Schema for select request body
 */
export const SelectRequestSchema = z.object({
  transactionId: z.string().uuid(),
  bppId: z.string(),
  bppUri: z.string().url(),
  providerId: z.string(),
  itemId: z.string(),
  parentItemId: z.string(),
  xinputFormId: z.string().optional(),
  xinputSubmissionId: z.string().optional(),
  addOns: z.array(AddOnSchema).optional(),
});

/**
 * Schema for select response
 */
export const SelectResponseSchema = z
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

type SelectRequestBody = z.infer<typeof SelectRequestSchema>;

export const POST = createONDCHandler(
  async (request, { tenant, ondcClient, kv }) => {
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

      await createSelectEntry(
        kv,
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
