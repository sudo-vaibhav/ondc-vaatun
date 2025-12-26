import { getContext } from "@/lib/context";
import { LookupRequest } from "./types";

export function createLookupPayload() : LookupRequest {
	const { tenant } = getContext();
  return {
    subscriber_id: tenant.subscriberId, // Subscriber ID of the BAP
    // Location details
    country: "IND",
    city: "*",
    // ONDC Domain details
    domain: tenant.domainCode, // Domain code relevant to this insurance domain
    type: "BAP", // subscriber type
  };
}
