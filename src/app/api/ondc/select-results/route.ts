import { type NextRequest, NextResponse } from "next/server";
import { getSelectResult } from "@/lib/select-store";

/**
 * GET /api/ondc/select-results?transaction_id=xxx&message_id=yyy
 *
 * Polling endpoint to fetch select results (quote) for a transaction.
 * Called by the frontend to get on_select response.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transaction_id");
    const messageId = searchParams.get("message_id");

    if (!transactionId || !messageId) {
      return NextResponse.json(
        { error: "Missing transaction_id or message_id query parameters" },
        { status: 400 },
      );
    }

    const result = getSelectResult(transactionId, messageId);

    if (!result.found) {
      return NextResponse.json(
        {
          found: false,
          transactionId,
          messageId,
          hasResponse: false,
          message: "No select entry found for this transaction",
        },
        { status: 200 },
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[select-results] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
