import crypto from "node:crypto";

/**
 * Calculate Blake2b-512 digest of the request body
 */
export function calculateDigest(body: object): string {
  const data = JSON.stringify(body);
  const hash = crypto.createHash("blake2b512").update(data).digest();
  return hash.toString("base64");
}
