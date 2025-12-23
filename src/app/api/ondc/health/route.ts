import { NextResponse } from "next/server";
import { getTenant } from "@/entities/tenant";

export async function GET() {
  try {
    // If getTenant() succeeds, the setup is valid
    getTenant();

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
