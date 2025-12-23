import type { URL } from "node:url";
import type { Tenant } from "@/entities/tenant";
import { getContext } from "../context";
import { calculateDigest } from "./signing";

interface ONDCResponse {
  message?: {
    ack: {
      status: "ACK" | "NACK";
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Validated ONDC API Client
 * Automatically handles request signing and standard headers
 */
export class ONDCClient {
  tenant: Tenant;

  constructor(tenant: Tenant) {
    this.tenant = tenant;
  }

  // biome-ignore lint/suspicious/noExplicitAny: ignore
  async createAuthorizationHeader(body: any): Promise<string> {
    // 1. Calculate Digest
    const digest = await calculateDigest(body);

    // 2. Create Signing String
    // Use timestamp from body.context if available to ensure consistency
    // Subtract a small offset (3 seconds) to account for potential clock drift
    // between our server and the ONDC gateway
    const CLOCK_DRIFT_OFFSET_SECONDS = 3;

    let created: number;
    if (body?.context?.timestamp) {
      // Parse ISO timestamp from the request body
      created =
        Math.floor(new Date(body.context.timestamp).getTime() / 1000) -
        CLOCK_DRIFT_OFFSET_SECONDS;
    } else {
      created = Math.floor(Date.now() / 1000) - CLOCK_DRIFT_OFFSET_SECONDS;
    }
    const expires = created + 300; // 5 minutes expiry usually

    // Format: (created) (expires) digest:BLAKE-512=<digest>
    // Note: ONDC signing string format is specific.
    // Per specs: "(created): <created>\n(expires): <expires>\ndigest: BLAKE-512=<digest>"
    // BUT standard HTTP Signature usually uses pseudo-headers.
    // ONDC Specifics:
    // The signature string is: "(created): ${created}\n(expires): ${expires}\ndigest: BLAKE-512=${digest}"

    const signingString = `(created): ${created}\n(expires): ${expires}\ndigest: BLAKE-512=${digest}`;

    console.log(
      "[Signing] Created:",
      created,
      "from timestamp:",
      body?.context?.timestamp,
      "→",
      new Date(created * 1000).toISOString(),
    );

    // 3. Sign the string
    const signature = await this.tenant.signMessage(signingString);

    // 4. Construct Header
    // keyId format: "subscriber_id|unique_key_id|algo"
    const keyId = `${this.tenant.subscriberId}|${this.tenant.uniqueKeyId}|ed25519`;
    return `Signature keyId="${keyId}",algorithm="ed25519",created="${created}",expires="${expires}",headers="(created) (expires) digest",signature="${signature}"`;
  }

  /**
   * Send a signed request to an ONDC network participant
   *
   * @param url - Full URL of the target endpoint (e.g. "https://seller-app.com/on_search")
   * @param method - HTTP Method (usually POST)
   * @param body - The Full JSON body of the request
   * @returns The parsed JSON response
   */
  // biome-ignore lint/suspicious/noExplicitAny: ignore
  async send<T = any>(
    url: string | URL,
    method: "POST",
    body: object,
  ): Promise<T> {
    getContext();
    try {
      // 1. Generate the ONDC Authorization Header
      const authHeader = await this.createAuthorizationHeader(body);

      // 2. Make the request
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          // ONDC specific headers if needed, though usually Auth is sufficient
        },
        body: JSON.stringify(body),
      });

      // 3. Handle Network/HTTP Errors
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `ONDC Request Failed [${response.status}]: ${errorText}`,
        );
      }

      // 4. Parse Response
      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error(`[ONDCClient] Error sending to ${url}:`, error);
      throw error;
    }
  }

  /**
   * Helper specifically for ACK responses
   * Most ONDC async calls return a simple ACK immediately
   */
  async sendWithAck(url: string, body: object): Promise<boolean> {
    const response = await this.send<ONDCResponse>(url, "POST", body);
    return response.message?.ack?.status === "ACK";
  }
}
