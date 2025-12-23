import { getContext } from "@/lib/context";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // If getContext() succeeds, the setup is valid
    getContext();

    return NextResponse.json(
      {
        status: "Health OK!!",
        ready: true,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[health] Service not ready:", error);
    return NextResponse.json(
      {
        status: "Health FAIL",
        ready: false,
      },
      { status: 503 },
    );
  }
}
