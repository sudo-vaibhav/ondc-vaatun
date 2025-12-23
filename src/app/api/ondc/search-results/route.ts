import { type NextRequest, NextResponse } from "next/server";
import { getSearchResults } from "@/lib/search-store";

/**
 * GET /api/ondc/search-results?transaction_id=xxx
 *
 * Polling endpoint to fetch aggregated search results for a transaction.
 * Called by the frontend to get on_search responses.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get("transaction_id");

    if (!transactionId) {
      return NextResponse.json(
        { error: "Missing transaction_id query parameter" },
        { status: 400 },
      );
    }

    const results = getSearchResults(transactionId);

    if (!results) {
      return NextResponse.json(
        {
          found: false,
          transactionId,
          responseCount: 0,
          providers: [],
          responses: [],
          message: "No search entry found for this transaction ID",
        },
        { status: 200 },
      );
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("[search-results] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
