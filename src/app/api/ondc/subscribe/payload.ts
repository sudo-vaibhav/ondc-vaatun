import { getContext } from "@/lib/context";

export function createSubscribePayload() {
  const { tenant } = getContext();
  const requestId = tenant.subscribeRequestId.value;
  const timestamp = new Date().toISOString();

  return {
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
        unique_key_id: tenant.uniqueKeyId,
        callback_url: "/api/ondc",
        key_pair: {
          signing_public_key: tenant.signingPublicKey,
          encryption_public_key: tenant.encryptionPublicKey,
          valid_from: timestamp,
          valid_until: new Date(Date.now() + 315360000000).toISOString(), // 10 years from now
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
}
