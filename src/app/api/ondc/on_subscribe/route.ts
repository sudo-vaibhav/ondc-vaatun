import { NextResponse } from "next/server";
import { createONDCHandler } from "@/lib/context";

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
