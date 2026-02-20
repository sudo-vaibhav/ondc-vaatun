import { z } from "zod";
import { logger } from "../../lib/logger";
import { publicProcedure, router } from "../trpc";

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

    logger.info(
      { action: "lookup", url: registryUrl.toString() },
      "Sending registry request",
    );
    logger.debug({ payload: lookupPayload }, "Lookup payload");

    const response = await ondcClient.send<SubscriberDetails[]>(
      registryUrl,
      "POST",
      lookupPayload,
    );

    logger.debug({ response }, "Registry response received");

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

    logger.info(
      { action: "subscribe", url: registryUrl.toString() },
      "Sending registry request",
    );
    logger.debug({ payload }, "Subscribe payload");

    const response = await ondcClient.send(registryUrl, "POST", payload);

    logger.debug({ response }, "Registry response received");

    return response;
  }),

  onSubscribe: publicProcedure
    .input(
      z.object({
        subscriber_id: z.string().optional(),
        challenge: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tenant } = ctx;

      logger.info({ action: "on_subscribe" }, "Callback received");

      if (input.subscriber_id && input.subscriber_id !== tenant.subscriberId) {
        logger.warn(
          {
            action: "on_subscribe",
            expected: tenant.subscriberId,
            received: input.subscriber_id,
          },
          "Subscriber ID mismatch",
        );
      }

      const answer = tenant.decryptChallenge(input.challenge);

      logger.debug({ answer }, "Challenge answer computed");

      return { answer };
    }),
});
