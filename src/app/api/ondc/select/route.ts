import { NextResponse } from "next/server";
import { v7 as uuidv7 } from "uuid";
import { createONDCHandler } from "@/lib/context";
import { createSelectEntry } from "@/lib/select-store";

interface SelectRequestBody {
  transactionId: string;
  bppId: string;
  bppUri: string;
  providerId: string;
  itemId: string;
  parentItemId: string;
  xinputFormId?: string;
  xinputSubmissionId?: string;
  addOns?: Array<{ id: string; quantity: number }>;
}

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
