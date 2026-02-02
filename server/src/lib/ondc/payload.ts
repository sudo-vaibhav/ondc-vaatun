import type { Tenant } from "../../entities/tenant";

export function createSearchPayload(
  tenant: Tenant,
  transactionId: string,
  messageId: string,
  categoryCode?: string
) {
  return {
    context: createPayloadContext(tenant, transactionId, messageId),
    message: {
      intent: {
        ...(categoryCode && {
          category: {
            descriptor: {
              code: categoryCode,
            },
          },
        }),
        payment: {
          collected_by: "BAP",
          tags: [
            {
              descriptor: {
                code: "BUYER_FINDER_FEES",
              },
              display: false,
              list: [
                {
                  descriptor: {
                    code: "BUYER_FINDER_FEES_TYPE",
                  },
                  value: "percent-annualized",
                },
                {
                  descriptor: {
                    code: "BUYER_FINDER_FEES_PERCENTAGE",
                  },
                  value: "1",
                },
              ],
            },
            {
              descriptor: {
                code: "SETTLEMENT_TERMS",
              },
              display: false,
              list: [
                {
                  descriptor: {
                    code: "SETTLEMENT_WINDOW",
                  },
                  value: "PT60M",
                },
                {
                  descriptor: {
                    code: "SETTLEMENT_BASIS",
                  },
                  value: "Delivery",
                },
                {
                  descriptor: {
                    code: "DELAY_INTEREST",
                  },
                  value: "2.5",
                },
                {
                  descriptor: {
                    code: "STATIC_TERMS",
                  },
                  value:
                    "https://bap.credit.becknprotocol.io/personal-banking/loans/personal-loan",
                },
                {
                  descriptor: {
                    code: "OFFLINE_CONTRACT",
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

function createPayloadContext(
  tenant: Tenant,
  transactionId: string,
  messageId: string
) {
  return {
    action: "search",
    bap_id: tenant.subscriberId,
    bap_uri: `https://${tenant.subscriberId}/api/ondc`,
    domain: tenant.domainCode,
    location: {
      country: {
        code: "IND",
      },
      city: {
        code: "*",
      },
    },
    transaction_id: transactionId,
    message_id: messageId,
    timestamp: new Date().toISOString(),
    ttl: "PT5M",
    version: "2.0.1",
  };
}
