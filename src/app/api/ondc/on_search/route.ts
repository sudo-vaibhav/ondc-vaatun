import { type NextRequest, NextResponse } from "next/server";
import { addSearchResponse } from "@/lib/search-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log(
      "\n\n[on_search] Request Body:\n\n",
      JSON.stringify(body, null, 2),
    );

    // Extract transaction_id from the context
    const transactionId = body.context?.transaction_id;

    if (transactionId) {
      // Store the response for later retrieval
      addSearchResponse(transactionId, body);
    } else {
      console.warn("[on_search] No transaction_id found in context");
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
    console.error("[on_search] Error processing request:", error);
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
