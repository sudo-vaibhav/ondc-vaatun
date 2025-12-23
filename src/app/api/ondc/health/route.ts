import { NextResponse } from "next/server";
import { createONDCHandler } from "@/lib/context";

export const GET = createONDCHandler(async (_request, _ctx) => {
  try {
    // If we get here, context initialization succeeded
    return NextResponse.json(
      { status: "Health OK!!", ready: true },
      { status: 200 },
    );
  } catch (error) {
    console.error("[health] Service not ready:", error);
    return NextResponse.json(
      { status: "Health FAIL", ready: false },
      { status: 503 },
    );
  }
});
