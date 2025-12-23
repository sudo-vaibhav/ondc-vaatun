import { getContext } from "@/lib/context";

export function createSearchPayload(transactionId: string, messageId: string) {
  return {
    context: createPayloadContext(transactionId, messageId),
    message: {
      intent: {
        category: {
          descriptor: {
            code: "HEALTH_INSURANCE", // Type of insurance (health, marine, motor)
          },
        },
        payment: {
          collected_by: "BAP", // Indicates who is the collector of payment
          tags: [
            {
              descriptor: {
                code: "BUYER_FINDER_FEES", // Describes Buyer finder fee
              },
              display: false,
              list: [
                {
                  descriptor: {
                    code: "BUYER_FINDER_FEES_TYPE", // Buyer finder fee type
                  },
                  value: "percent-annualized",
                },
                {
                  descriptor: {
                    code: "BUYER_FINDER_FEES_PERCENTAGE", // Buyer finder fee percentage
                  },
                  value: "1",
                },
              ],
            },
            {
              descriptor: {
                code: "SETTLEMENT_TERMS", // Describes settlement terms
              },
              display: false,
              list: [
                {
                  descriptor: {
                    code: "SETTLEMENT_WINDOW", // Settlement window
                  },
                  value: "PT60M",
                },
                {
                  descriptor: {
                    code: "SETTLEMENT_BASIS", // Settlement basis
                  },
                  value: "Delivery",
                },
                {
                  descriptor: {
                    code: "DELAY_INTEREST", // Delay interest
                  },
                  value: "2.5",
                },
                {
                  descriptor: {
                    code: "STATIC_TERMS", // Static terms URL
                  },
                  value:
                    "https://bap.credit.becknprotocol.io/personal-banking/loans/personal-loan",
                },
                {
                  descriptor: {
                    code: "OFFLINE_CONTRACT", // Offline contract
                  },
                  value: "true",
                },
              ],
            },
          ],
        },
      },
    },
  };
}

function createPayloadContext(transactionId: string, messageId: string) {
  const { tenant } = getContext();
  return {
    action: "search", // Beckn protocol method being called
    // BAP (Buyer Application Platform) details
    bap_id: tenant.subscriberId, // Subscriber ID of the BAP
    bap_uri: `https://${tenant.subscriberId}/api/ondc`, // Subscriber URL of the BAP for accepting callbacks

    // ONDC Domain details
    domain: tenant.domainCode, // Domain code relevant to this insurance domain

    // Location details
    location: {
      country: {
        code: "IND", // Country code as per ISO 3166-1 and ISO 3166-2 format
      },
      city: {
        code: "*", // City code this location is or is located within
      },
    },
    // Transaction identifiers
    transaction_id: transactionId, // Unique value which persists across all API calls
    message_id: messageId, // Unique value which persists during a request/callback cycle

    // Timing details
    timestamp: new Date().toISOString(), // Time of request generation in RFC3339 format
    ttl: "PT5M", // Duration in ISO8601 format after timestamp for which message holds valid
    version: "2.0.1", // Version of transaction protocol being used
  };
}
