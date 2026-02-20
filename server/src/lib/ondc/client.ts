import type { URL } from "node:url";
import { type SpanStatusCode, trace } from "@opentelemetry/api";
import type { Tenant } from "../../entities/tenant";
import { logger } from "../logger";
import { classifyErrorSource } from "./error-classifier";
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
  private tracer = trace.getTracer("ondc-bap-http", "0.1.0");

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

    logger.debug(
      {
        created,
        timestamp: bodyWithContext?.context?.timestamp,
        derivedTime: new Date(created * 1000).toISOString(),
      },
      "Signature created timestamp",
    );

    // Wrap Ed25519 signing in a child span
    const signature = this.tracer.startActiveSpan("ondc.sign", (span) => {
      try {
        const sig = this.tenant.signMessage(signingString);
        span.setStatus({ code: 1 as typeof SpanStatusCode.OK });
        return sig;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: 2 as typeof SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        throw error;
      } finally {
        span.end();
      }
    });

    const keyId = `${this.tenant.subscriberId}|${this.tenant.uniqueKeyId.value}|ed25519`;
    return `Signature keyId="${keyId}",algorithm="ed25519",created="${created}",expires="${expires}",headers="(created) (expires) digest",signature="${signature}"`;
  }

  async send<T = unknown>(
    url: string | URL,
    method: "POST" | "GET",
    body: object,
  ): Promise<T> {
    return this.tracer.startActiveSpan("ondc.http.request", async (span) => {
      let response: Response | undefined;

      try {
        // HTTP metadata attributes
        span.setAttribute("http.url", url.toString());
        span.setAttribute("http.method", method);

        // Full request body capture (16KB limit enforced by SDK spanLimits)
        const bodyJson = JSON.stringify(body);
        span.setAttribute("http.request.body", bodyJson);
        span.setAttribute("http.request.body.size", bodyJson.length);

        // Authorization header - full capture, no truncation (CONTEXT.md decision 4)
        const authHeader = await this.createAuthorizationHeader(body);
        span.setAttribute("http.request.header.authorization", authHeader);

        response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: bodyJson,
        });

        // Response metadata
        span.setAttribute("http.status_code", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          span.setAttribute("http.response.body", errorText);
          span.setAttribute("error.source", "bpp");
          throw new Error(
            `ONDC Request Failed [${response.status}]: ${errorText}`,
          );
        }

        const data = await response.json();
        span.setAttribute("http.response.body", JSON.stringify(data));

        span.setStatus({ code: 1 as typeof SpanStatusCode.OK });
        return data as T;
      } catch (error) {
        const errorSource = classifyErrorSource(
          error as Error,
          response,
          url.toString(),
        );
        span.recordException(error as Error);
        span.setAttribute("error.source", errorSource);
        span.setAttribute("error.message", (error as Error).message);
        if ((error as Error & { code?: string }).code) {
          span.setAttribute(
            "error.code",
            (error as Error & { code?: string }).code as string,
          );
        }
        span.setStatus({
          code: 2 as typeof SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        logger.error(
          { err: error as Error, url: url.toString() },
          "ONDC request failed",
        );
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async sendWithAck(url: string, body: object): Promise<boolean> {
    const response = await this.send<ONDCResponse>(url, "POST", body);
    return response.message?.ack?.status === "ACK";
  }
}
