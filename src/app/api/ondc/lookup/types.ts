import { z } from "zod";

/**
 * Schema for lookup request body
 * Based on Beckn Registry API specification
 */
export const LookupRequestSchema = z.object({
  subscriber_id: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  domain: z.string().optional(),
  type: z.enum(["BAP", "BPP"]).optional(),
});

/**
 * Schema for subscriber details in response
 */
export const LookupResponseSchema = z.looseObject({
  subscriber_id: z.string(),
  country: z.string().optional(),
  city: z.string().optional(),
  domain: z.string(),
  signing_public_key: z.string(),
  encr_public_key: z.string(),
  valid_from: z.string(),
  valid_until: z.string(),
  status: z.string().optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
});

export type LookupRequest = z.infer<typeof LookupRequestSchema>;
export type SubscriberDetails = z.infer<typeof LookupResponseSchema>;
