import { type NextRequest, NextResponse } from "next/server";
import { getContext } from "@/lib/context";

export async function POST(request: NextRequest) {
  try {
    const tenant = getContext().tenant;
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

    // Optional: Validate subscriber_id matches tenant
    if (subscriber_id && subscriber_id !== tenant.subscriberId) {
      console.warn("[on_subscribe] Subscriber ID mismatch:", {
        expected: tenant.subscriberId,
        received: subscriber_id,
      });
    }

    // Decrypt the challenge using tenant's credentials
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
}
