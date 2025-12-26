import { NextResponse } from "next/server";
import { createONDCHandler } from "@/lib/context";

export const POST = createONDCHandler(
  async (_request, { tenant, ondcClient }) => {
    try {
      const requestId = tenant.subscribeRequestId.value;
      const timestamp = new Date().toISOString();

      const payload = {
        context: {
          operation: { ops_no: 1 },
        },
        message: {
          request_id: requestId,
          timestamp: timestamp,
          entity: {
            gst: {
              legal_entity_name: "Vaatun Technologies Private Limited",
              business_address:
                "303, Spaze Platinum Tower, Sohna Rd, Gurugram, Haryana - 122018",
              city_code: ["std:080"],
              gst_no: "06AAKCV8973E1ZT",
            },
            pan: {
              name_as_per_pan: "Vaatun Technologies Private Limited",
              pan_no: "AAKCV8973E",
              date_of_incorporation: "01/01/2024",
            },
            name_of_authorised_signatory: "Vaibhav Chopra",
            address_of_authorised_signatory:
              "303, Spaze Platinum Tower, Sohna Rd, Gurugram, Haryana - 122018",
            email_id: "vaibhav@vaatun.com",
            mobile_no: 9876543210,
            country: "IND",
            subscriber_id: tenant.subscriberId,
            unique_key_id: tenant.uniqueKeyId.value,
            callback_url: "/api/ondc",
            key_pair: {
              signing_public_key: tenant.signingPublicKey,
              encryption_public_key: tenant.encryptionPublicKey,
              valid_from: timestamp,
              valid_until: new Date(Date.now() + 315360000000).toISOString(),
            },
          },
          network_participant: [
            {
              subscriber_url: "/api/ondc",
              domain: tenant.domainCode,
              type: "buyerApp",
              msn: false,
              city_code: ["std:080"],
            },
          ],
        },
      };

      const registryUrl = new URL("/subscribe", tenant.registryUrl);

      console.log("[Subscribe] Sending request to:", registryUrl);
      console.log("[Subscribe] Payload:", JSON.stringify(payload, null, 2));

      const response = await ondcClient.send(registryUrl, "POST", payload);

      console.log(
        "[Subscribe] ONDC Response:",
        JSON.stringify(response, null, 2),
      );

      return NextResponse.json(response);
    } catch (error) {
      console.error("[Subscribe] Error:", error);
      return NextResponse.json(
        {
          error: "Internal server error",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 },
      );
    }
  },
);
