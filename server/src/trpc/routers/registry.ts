import { z } from "zod";
import { router, publicProcedure } from "../trpc";

const SubscriberSchema = z
  .object({
    subscriber_id: z.string(),
    subscriber_url: z.string().optional(),
    type: z.string(),
    domain: z.string(),
    city: z.string().optional(),
    country: z.string().optional(),
    signing_public_key: z.string(),
    encr_public_key: z.string(),
    valid_from: z.string(),
    valid_until: z.string(),
    status: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional(),
  })
  .passthrough();

type SubscriberDetails = z.infer<typeof SubscriberSchema>;

export const registryRouter = router({
  lookup: publicProcedure.query(async ({ ctx }) => {
    const { tenant, ondcClient } = ctx;

    const lookupPayload = {
      subscriber_id: tenant.subscriberId,
      domain: tenant.domainCode,
    };

    const registryUrl = new URL("/v2.0/lookup", tenant.registryUrl);

    console.log("[Lookup] Sending request to:", registryUrl.toString());
    console.log("[Lookup] Payload:", JSON.stringify(lookupPayload, null, 2));

    const response = await ondcClient.send<SubscriberDetails[]>(
      registryUrl,
      "POST",
      lookupPayload
    );

    console.log(
      "[Lookup] Registry Response:",
      JSON.stringify(response, null, 2)
    );

    return response;
  }),

  subscribe: publicProcedure.mutation(async ({ ctx }) => {
    const { tenant, ondcClient } = ctx;

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

    console.log("[Subscribe] Sending request to:", registryUrl.toString());
    console.log("[Subscribe] Payload:", JSON.stringify(payload, null, 2));

    const response = await ondcClient.send(registryUrl, "POST", payload);

    console.log(
      "[Subscribe] ONDC Response:",
      JSON.stringify(response, null, 2)
    );

    return response;
  }),

  onSubscribe: publicProcedure
    .input(
      z.object({
        subscriber_id: z.string().optional(),
        challenge: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { tenant } = ctx;

      console.log("[on_subscribe] Request:", JSON.stringify(input, null, 2));

      if (input.subscriber_id && input.subscriber_id !== tenant.subscriberId) {
        console.warn("[on_subscribe] Subscriber ID mismatch:", {
          expected: tenant.subscriberId,
          received: input.subscriber_id,
        });
      }

      const answer = tenant.decryptChallenge(input.challenge);

      console.log("[on_subscribe] Answer:", answer);

      return { answer };
    }),
});
