import type { URL } from "node:url";
import type { Tenant } from "../../entities/tenant";
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
 * ONDC API Client
 * Automatically handles request signing and standard headers
 */
export class ONDCClient {
  tenant: Tenant;

  constructor(tenant: Tenant) {
    this.tenant = tenant;
  }

  async createAuthorizationHeader(body: object): Promise<string> {
    const digest = calculateDigest(body);

    const CLOCK_DRIFT_OFFSET_SECONDS = 3;

    let created: number;
    const bodyWithContext = body as { context?: { timestamp?: string } };
    if (bodyWithContext?.context?.timestamp) {
      created =
        Math.floor(
          new Date(bodyWithContext.context.timestamp).getTime() / 1000,
        ) - CLOCK_DRIFT_OFFSET_SECONDS;
    } else {
      created = Math.floor(Date.now() / 1000) - CLOCK_DRIFT_OFFSET_SECONDS;
    }
    const expires = created + 300;

    const signingString = `(created): ${created}\n(expires): ${expires}\ndigest: BLAKE-512=${digest}`;

    console.log(
      "[Signing] Created:",
      created,
      "from timestamp:",
      bodyWithContext?.context?.timestamp,
      "→",
      new Date(created * 1000).toISOString(),
    );

    const signature = this.tenant.signMessage(signingString);

    const keyId = `${this.tenant.subscriberId}|${this.tenant.uniqueKeyId.value}|ed25519`;
    return `Signature keyId="${keyId}",algorithm="ed25519",created="${created}",expires="${expires}",headers="(created) (expires) digest",signature="${signature}"`;
  }

  async send<T = unknown>(
    url: string | URL,
    method: "POST" | "GET",
    body: object,
  ): Promise<T> {
    try {
      const authHeader = await this.createAuthorizationHeader(body);

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `ONDC Request Failed [${response.status}]: ${errorText}`,
        );
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error(`[ONDCClient] Error sending to ${url}:`, error);
      throw error;
    }
  }

  async sendWithAck(url: string, body: object): Promise<boolean> {
    const response = await this.send<ONDCResponse>(url, "POST", body);
    return response.message?.ack?.status === "ACK";
  }
}
