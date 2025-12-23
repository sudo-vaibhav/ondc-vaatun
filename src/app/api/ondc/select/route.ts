// implement the select ondc call

import { type NextRequest, NextResponse } from "next/server";
import { v7 as uuidv7 } from "uuid";
import { getContext } from "@/lib/context";
import { createSelectEntry } from "@/lib/select-store";

/**
 * Select Request Body Interface
 * These are the parameters that should be passed by the frontend
 */
interface SelectRequestBody {
  // From the on_search response
  transactionId: string; // Use same transaction_id from search
  bppId: string; // BPP ID from on_search response context
  bppUri: string; // BPP URI from on_search response context

  // Item selection
  providerId: string; // Provider ID from on_search catalog
  itemId: string; // Item ID (the child item id from response)
  parentItemId: string; // Parent item ID if applicable

  // Optional: xinput form submission (if form was filled)
  xinputFormId?: string;
  xinputSubmissionId?: string;

  // Optional: add-ons selection
  addOns?: Array<{
    id: string;
    quantity: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: SelectRequestBody = await request.json();
    const { tenant, ondcClient } = getContext();
    // Validate required fields
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

    // Generate new message_id for this select request
    const messageId = uuidv7();

    // Build the items array with mandatory fields
    const items: [
      {
        id: string;
        parent_item_id: string;
        add_ons?: Array<{
          id: string;
          quantity?: { selected?: { count: number } };
        }>;
        xinput?: {
          head?: {
            descriptor?: { name?: string };
            index?: { min: number; cur: number; max: number };
            headings?: string[];
          };
          form?: {
            id?: string;
            url?: string;
            mime_type?: string;
            resubmit?: boolean;
            multiple_submissions?: boolean;
          };
          form_response?: {
            submission_id: string;
            status: string;
          };
        };
      },
    ] = [
      {
        id: body.itemId,
        parent_item_id: body.parentItemId || body.itemId, // Use itemId as parent if not specified
      },
    ];

    // Add xinput if provided (form submission)
    if (body.xinputFormId && body.xinputSubmissionId) {
      items[0].xinput = {
        form: {
          id: body.xinputFormId,
        },
        form_response: {
          submission_id: body.xinputSubmissionId,
          status: "APPROVED", // Assuming form was approved
        },
      };
    }

    // Add add-ons if provided
    if (body.addOns && body.addOns.length > 0) {
      items[0].add_ons = body.addOns.map((addon) => ({
        id: addon.id,
        quantity: {
          selected: {
            count: addon.quantity,
          },
        },
      }));
    }

    // Select payload with all mandatory fields (Owner: BAP)
    const payload = {
      context: {
        action: "select", // Beckn protocol method being called
        // BAP (Buyer Application Platform) details
        bap_id: tenant.subscriberId,
        bap_uri: `https://${tenant.subscriberId}/api/ondc`,
        // BPP (Seller Platform) details - from on_search response
        bpp_id: body.bppId,
        bpp_uri: body.bppUri,
        // ONDC Domain details
        domain: tenant.domainCode,
        // Location details
        location: {
          country: {
            code: "IND",
          },
          city: {
            code: "*",
          },
        },
        // Transaction identifiers - reuse transaction_id from search
        transaction_id: body.transactionId,
        message_id: messageId, // New message_id for this request/callback cycle
        // Timing details
        timestamp: new Date().toISOString(),
        ttl: "PT30S", // Select typically has shorter TTL
        version: "2.0.1",
      },
      message: {
        order: {
          provider: {
            id: body.providerId,
          },
          items: items,
        },
      },
    };

    // For select, we send directly to the BPP (not gateway)
    const selectUrl = body.bppUri.endsWith("/")
      ? `${body.bppUri}select`
      : `${body.bppUri}/select`;

    // Create store entry to track the response
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
}
