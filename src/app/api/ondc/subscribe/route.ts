import { NextResponse } from "next/server";
import { getContext } from "@/lib/context";

export async function POST() {
  try {
    const { tenant, ondcClient } = getContext();

    const requestId = tenant.subscribeRequestId.value;
    const timestamp = new Date().toISOString();

    // Constructing Payload based on ONDC Network Participant Onboarding v2.0.5
    // Reference: Context.operation.ops_no = 1 (Buyer New entity registration)

    // NOTE: Many fields (GST, PAN, Address) are hardcoded for the "Vaatun" demo entity.
    // In a real multi-tenant system, these would come from the Tenant configuration.

    const payload = {
      context: {
        operation: {
          ops_no: 1, // Buyer New entity registration
        },
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
          unique_key_id: tenant.uniqueKeyId,
          callback_url: "/api/ondc", // Relative to subscriber url
          key_pair: {
            // NOTE: this is the actual important part of the payload
            signing_public_key: tenant.signingPublicKey,
            encryption_public_key: tenant.encryptionPublicKey,
            valid_from: timestamp, // Using current time as start
            valid_until: new Date(Date.now() + 315360000000).toISOString(), // Valid for ~10 years
          },
        },
        network_participant: [
          {
            subscriber_url: "/api/ondc", // relative path for callbacks
            domain: tenant.domainCode, // Health Insurance
            type: "buyerApp",
            msn: false,
            city_code: ["std:080"],
          },
        ],
      },
    };

    // 3. Send to ONDC Gateway/Registry using ONDCClient
    // The Gateway URL should be in env. For now using a placeholder or common staging URL.
    const gatewayUrl = `${process.env.ONDC_REGISTRY_URL}/subscribe`;

    console.log("[Subscribe] Sending request to:", gatewayUrl);
    console.log("[Subscribe] Payload:", JSON.stringify(payload, null, 2));

    const response = await ondcClient.send(gatewayUrl, "POST", payload);

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
}
