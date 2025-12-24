// import crypto from "crypto";
import _sodium from "libsodium-wrappers";
import { getContext } from "@/lib/context";

// interface ValuesToSign {
//     created: number;
//     expires: number;
//     digest: string;
// }

/**
 * Calculate Blake2b-512 digest of the request body
 */
export async function calculateDigest(body: object): Promise<string> {
  await _sodium.ready;
  const sodium = _sodium;
  const data = JSON.stringify(body);
  const hash = sodium.crypto_generichash(64, data);
  return sodium.to_base64(hash, _sodium.base64_variants.ORIGINAL);
}

/**
 * generate Authorization header for ONDC requests
 */
export async function createAuthorizationHeader(body: object): Promise<string> {
  const { tenant } = getContext();

  // 1. Calculate Digest
  const digest = await calculateDigest(body);

  // 2. Create Signing String
  // Use timestamp from body.context if available to ensure consistency
  // Subtract a small offset (3 seconds) to account for potential clock drift
  // between our server and the ONDC gateway
  const CLOCK_DRIFT_OFFSET_SECONDS = 3;

  // let created: number;
  // if (body?.context?.timestamp) {
  //   // Parse ISO timestamp from the request body
  //   created =
  //     Math.floor(new Date(body.context.timestamp).getTime() / 1000) -
  //     CLOCK_DRIFT_OFFSET_SECONDS;
  // } else {
  const created = Math.floor(Date.now() / 1000) - CLOCK_DRIFT_OFFSET_SECONDS;
  // }
  const expires = created + 300; // 5 minutes expiry usually

  // Format: (created) (expires) digest:BLAKE-512=<digest>
  // Note: ONDC signing string format is specific.
  // Per specs: "(created): <created>\n(expires): <expires>\ndigest: BLAKE-512=<digest>"
  // BUT standard HTTP Signature usually uses pseudo-headers.
  // ONDC Specifics:
  // The signature string is: "(created): ${created}\n(expires): ${expires}\ndigest: BLAKE-512=${digest}"

  const signingString = `(created): ${created}\n(expires): ${expires}\ndigest: BLAKE-512=${digest}`;

  // console.log(
  //   "[Signing] Created:",
  //   created,
  //   "from timestamp:",
  //   body?.context?.timestamp,
  //   "→",
  //   new Date(created * 1000).toISOString(),
  // );

  // 3. Sign the string
  const signature = await tenant.signMessage(signingString);

  // 4. Construct Header
  // keyId format: "subscriber_id|unique_key_id|algo"
  const keyId = `${tenant.subscriberId}|${tenant.uniqueKeyId}|ed25519`; // acc to Nishtha: stays same throughout the subscription.

  return `Signature keyId="${keyId}",algorithm="ed25519",created="${created}",expires="${expires}",headers="(created) (expires) digest",signature="${signature}"`;
}
