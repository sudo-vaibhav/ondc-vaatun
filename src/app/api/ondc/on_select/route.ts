import { type NextRequest, NextResponse } from "next/server";
import { addSelectResponse } from "@/lib/selectStore";

/**
 * Handler for ONDC on_select callback
 * BPPs call this endpoint after processing a select request
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log(
      "\n\n[on_select] Request Body:\n\n",
      JSON.stringify(body, null, 2),
    );

    // Extract key information from the response
    const transactionId = body.context?.transaction_id;
    const messageId = body.context?.message_id;
    const bppId = body.context?.bpp_id;
    const quote = body.message?.order?.quote;
    const error = body.error;

    if (error) {
      console.error("[on_select] BPP returned error:", error);
    } else if (quote) {
      console.log("[on_select] Quote received:", {
        transactionId,
        messageId,
        bppId,
        price: quote.price,
        breakup: quote.breakup?.length || 0,
      });
    }

    // Store the on_select response
    if (transactionId && messageId) {
      addSelectResponse(transactionId, messageId, body);
    } else {
      console.warn("[on_select] Missing transaction_id or message_id");
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
    console.error("[on_select] Error processing request:", error);
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
}
