import { NextResponse } from "next/server";
import { v7 as uuidv7 } from "uuid";
import { createONDCHandler } from "@/lib/context";
import { createSearchEntry } from "@/lib/search-store";
import { createSearchPayload } from "./payload";

export const POST = createONDCHandler(
  async (_request, { tenant, ondcClient }) => {
    try {
      const transactionId = uuidv7();
      const messageId = uuidv7();
      const categoryCode = "HEALTH_INSURANCE";

      createSearchEntry(transactionId, messageId, categoryCode);

      const payload = createSearchPayload(transactionId, messageId);
      const gatewayUrl = new URL("search", tenant.gatewayUrl);

      console.log("[Search] Sending request to:", gatewayUrl);
      console.log("[Search] Payload:", JSON.stringify(payload, null, "\t"));

      const response = await ondcClient.send(gatewayUrl, "POST", payload);

      console.log("[Search] ONDC Response:", JSON.stringify(response, null, 2));

      return NextResponse.json({
        ...response,
        transactionId,
        messageId,
      });
    } catch (error) {
      console.error("[Search] Error:", error);
      return NextResponse.json(
        { status: "Search FAIL", ready: false },
        { status: 503 },
      );
    }
  },
);
