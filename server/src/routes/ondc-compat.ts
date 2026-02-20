/**
 * ONDC Compatibility Routes
 *
 * These routes provide backwards-compatible REST API endpoints that proxy to tRPC procedures.
 * This is necessary because:
 * 1. ONDC network callbacks (on_subscribe, on_search, on_select) expect specific paths
 * 2. Existing tests expect REST API paths
 */

import { SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import { Router } from "express";
import { v7 as uuidv7 } from "uuid";
import { Tenant } from "../entities/tenant";
import { TenantKeyValueStore } from "../infra/key-value/redis";
import {
  addConfirmResponse,
  createConfirmEntry,
  getConfirmEntry,
  getConfirmResult,
} from "../lib/confirm-store";
import {
  addInitResponse,
  createInitEntry,
  getInitEntry,
  getInitResult,
} from "../lib/init-store";
import { logger } from "../lib/logger";
import { ONDCClient } from "../lib/ondc/client";
import { createSearchPayload } from "../lib/ondc/payload";
import {
  addSearchResponse,
  createSearchEntry,
  getSearchEntry,
  getSearchResults,
} from "../lib/search-store";
import {
  addSelectResponse,
  createSelectEntry,
  getSelectEntry,
  getSelectResult,
} from "../lib/select-store";
import {
  addStatusResponse,
  createStatusEntry,
  getStatusEntry,
  getStatusResult,
} from "../lib/status-store";
import {
  createLinkedSpanOptions,
  restoreTraceContext,
  serializeTraceContext,
} from "../lib/trace-context-store";

export const ondcCompatRouter: Router = Router();

const tracer = trace.getTracer("ondc-bap", "0.1.0");

// Cached context for performance
let cachedContext: {
  tenant: Tenant;
  ondcClient: ONDCClient;
  kv: TenantKeyValueStore;
} | null = null;

async function getContext() {
  if (!cachedContext) {
    const tenant = Tenant.getInstance();
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error("REDIS_URL environment variable is required");
    }
    const kv = await TenantKeyValueStore.create(tenant, redisUrl);
    const ondcClient = new ONDCClient(tenant);
    cachedContext = { tenant, ondcClient, kv };
  }
  return cachedContext;
}

// GET /api/ondc/health
ondcCompatRouter.get("/health", async (_req, res) => {
  try {
    await getContext();
    res.json({ status: "Health OK!!", ready: true });
  } catch (error) {
    logger.error({ err: error as Error }, "Health check failed");
    res.status(503).json({ status: "Health FAIL", ready: false });
  }
});

// GET /api/ondc/lookup
ondcCompatRouter.get("/lookup", async (_req, res) => {
  try {
    const { tenant, ondcClient } = await getContext();

    const lookupPayload = {
      subscriber_id: tenant.subscriberId,
      domain: tenant.domainCode,
    };

    const registryUrl = new URL("/v2.0/lookup", tenant.registryUrl);
    const response = await ondcClient.send(registryUrl, "POST", lookupPayload);

    res.json(response);
  } catch (error) {
    logger.error({ err: error as Error, action: "lookup" }, "Lookup failed");
    res.status(500).json({
      error: "Failed to lookup subscriber",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/ondc/subscribe
ondcCompatRouter.post("/subscribe", async (_req, res) => {
  try {
    const { tenant, ondcClient } = await getContext();

    const requestId = tenant.subscribeRequestId.value;
    const timestamp = new Date().toISOString();

    const payload = {
      context: { operation: { ops_no: 1 } },
      message: {
        request_id: requestId,
        timestamp,
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
    const response = await ondcClient.send(registryUrl, "POST", payload);

    res.json(response);
  } catch (error) {
    logger.error(
      { err: error as Error, action: "subscribe" },
      "Subscribe failed",
    );
    res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/ondc/on_subscribe - ONDC callback
ondcCompatRouter.post("/on_subscribe", async (req, res) => {
  try {
    const { tenant } = await getContext();
    const { challenge, subscriber_id } = req.body;

    logger.info({ action: "on_subscribe" }, "Callback received");

    if (!challenge) {
      res.status(400).json({ error: "Challenge is required" });
      return;
    }

    if (subscriber_id && subscriber_id !== tenant.subscriberId) {
      logger.warn({
        expected: tenant.subscriberId,
        received: subscriber_id,
      });
    }

    const answer = tenant.decryptChallenge(challenge);
    logger.debug({ answer }, "Challenge answer computed");

    res.json({ answer });
  } catch (error) {
    logger.error(
      { err: error as Error, action: "on_subscribe" },
      "on_subscribe callback error",
    );
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/ondc/search
ondcCompatRouter.post("/search", async (req, res) => {
  try {
    const { tenant, ondcClient, kv } = await getContext();
    const { categoryCode } = req.body || {};

    const transactionId = uuidv7();
    const messageId = uuidv7();
    const traceparent = serializeTraceContext();

    await createSearchEntry(
      kv,
      transactionId,
      messageId,
      categoryCode,
      undefined,
      traceparent,
    );

    const payload = createSearchPayload(
      tenant,
      transactionId,
      messageId,
      categoryCode,
    );
    const gatewayUrl = new URL("search", tenant.gatewayUrl);

    logger.info(
      { action: "search", url: gatewayUrl.toString() },
      "Sending ONDC request",
    );

    const response = await ondcClient.send<Record<string, unknown>>(gatewayUrl, "POST", payload);

    res.json({ ...response, transactionId, messageId });
  } catch (error) {
    logger.error({ err: error as Error, action: "search" }, "Search failed");
    res.status(503).json({ status: "Search FAIL", ready: false });
  }
});

// POST /api/ondc/on_search - ONDC callback
ondcCompatRouter.post("/on_search", async (req, res) => {
  const { kv } = await getContext();
  const body = req.body;
  const transactionId = body.context?.transaction_id;

  logger.info({ action: "on_search", transactionId }, "Callback received");

  if (!transactionId) {
    logger.warn({ action: "on_search" }, "No transaction_id found in context");
    res.json({ message: { ack: { status: "ACK" } } });
    return;
  }

  const entry = await getSearchEntry(kv, transactionId);
  const originalSpanContext = restoreTraceContext(entry?.traceparent);
  const spanOptions = createLinkedSpanOptions(originalSpanContext, {
    kind: SpanKind.SERVER,
    attributes: {
      "ondc.transaction_id": transactionId,
      "ondc.action": "on_search",
      "ondc.bpp_id": body.context?.bpp_id || "unknown",
      "ondc.bpp_uri": body.context?.bpp_uri || "unknown",
    },
  });

  tracer.startActiveSpan("ondc.on_search", spanOptions, async (span) => {
    try {
      await addSearchResponse(kv, transactionId, body);

      if (body.error) {
        span.setAttribute("error.source", "bpp");
        span.setAttribute("error.message", body.error.message || "BPP NACK");
        if (body.error.code) span.setAttribute("error.code", body.error.code);
        span.setAttribute("bpp.error", JSON.stringify(body.error));
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `BPP error: ${body.error.code || "unknown"}`,
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      res.json({ message: { ack: { status: "ACK" } } });
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      logger.error(
        { err: error as Error, action: "on_search" },
        "on_search callback error",
      );
      res.status(500).json({
        message: { ack: { status: "NACK" } },
        error: {
          type: "DOMAIN-ERROR",
          code: "500",
          message: "Internal server error",
        },
      });
    } finally {
      span.end();
    }
  });
});

// POST /api/ondc/select
ondcCompatRouter.post("/select", async (req, res) => {
  try {
    const { tenant, ondcClient, kv } = await getContext();
    const body = req.body;

    if (
      !body.transactionId ||
      !body.bppId ||
      !body.bppUri ||
      !body.providerId ||
      !body.itemId
    ) {
      res.status(400).json({
        error: "Missing required fields",
        required: ["transactionId", "bppId", "bppUri", "providerId", "itemId"],
      });
      return;
    }

    const messageId = uuidv7();
    const traceparent = serializeTraceContext();

    const items: Array<{
      id: string;
      parent_item_id: string;
      add_ons?: Array<{
        id: string;
        quantity?: { selected?: { count: number } };
      }>;
      xinput?: {
        form?: { id?: string };
        form_response?: { submission_id: string; status: string };
      };
    }> = [
      { id: body.itemId, parent_item_id: body.parentItemId || body.itemId },
    ];

    if (body.xinputFormId && body.xinputSubmissionId) {
      items[0].xinput = {
        form: { id: body.xinputFormId },
        form_response: {
          submission_id: body.xinputSubmissionId,
          status: "APPROVED",
        },
      };
    }

    if (body.addOns?.length > 0) {
      items[0].add_ons = body.addOns.map(
        (addon: { id: string; quantity: number }) => ({
          id: addon.id,
          quantity: { selected: { count: addon.quantity } },
        }),
      );
    }

    const payload = {
      context: {
        action: "select",
        bap_id: tenant.subscriberId,
        bap_uri: `https://${tenant.subscriberId}/api/ondc`,
        bpp_id: body.bppId,
        bpp_uri: body.bppUri,
        domain: tenant.domainCode,
        location: { country: { code: "IND" }, city: { code: "*" } },
        transaction_id: body.transactionId,
        message_id: messageId,
        timestamp: new Date().toISOString(),
        ttl: "PT30S",
        version: "2.0.1",
      },
      message: {
        order: { provider: { id: body.providerId }, items },
      },
    };

    const selectUrl = body.bppUri.endsWith("/")
      ? `${body.bppUri}select`
      : `${body.bppUri}/select`;

    await createSelectEntry(
      kv,
      body.transactionId,
      messageId,
      body.itemId,
      body.providerId,
      body.bppId,
      body.bppUri,
      traceparent,
    );

    const response = await ondcClient.send<Record<string, unknown>>(selectUrl, "POST", payload);

    res.json({ ...response, transactionId: body.transactionId, messageId });
  } catch (error) {
    logger.error({ err: error as Error, action: "select" }, "Select failed");
    res.status(503).json({
      status: "Select FAIL",
      error: error instanceof Error ? error.message : "Unknown error",
      ready: false,
    });
  }
});

// POST /api/ondc/on_select - ONDC callback
ondcCompatRouter.post("/on_select", async (req, res) => {
  const { kv } = await getContext();
  const body = req.body;
  const transactionId = body.context?.transaction_id;
  const messageId = body.context?.message_id;

  logger.info({ action: "on_select", transactionId }, "Callback received");

  if (!transactionId || !messageId) {
    logger.warn(
      { action: "on_select" },
      "Missing transaction_id or message_id",
    );
    res.json({ message: { ack: { status: "ACK" } } });
    return;
  }

  const entry = await getSelectEntry(kv, transactionId, messageId);
  const originalSpanContext = restoreTraceContext(entry?.traceparent);
  const spanOptions = createLinkedSpanOptions(originalSpanContext, {
    kind: SpanKind.SERVER,
    attributes: {
      "ondc.transaction_id": transactionId,
      "ondc.message_id": messageId,
      "ondc.action": "on_select",
      "ondc.bpp_id": body.context?.bpp_id || "unknown",
      "ondc.bpp_uri": body.context?.bpp_uri || "unknown",
    },
  });

  tracer.startActiveSpan("ondc.on_select", spanOptions, async (span) => {
    try {
      await addSelectResponse(kv, transactionId, messageId, body);

      if (body.error) {
        span.setAttribute("error.source", "bpp");
        span.setAttribute("error.message", body.error.message || "BPP NACK");
        if (body.error.code) span.setAttribute("error.code", body.error.code);
        span.setAttribute("bpp.error", JSON.stringify(body.error));
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `BPP error: ${body.error.code || "unknown"}`,
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      res.json({ message: { ack: { status: "ACK" } } });
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      logger.error(
        { err: error as Error, action: "on_select" },
        "on_select callback error",
      );
      res.status(500).json({
        message: { ack: { status: "NACK" } },
        error: {
          type: "DOMAIN-ERROR",
          code: "500",
          message: "Internal server error",
        },
      });
    } finally {
      span.end();
    }
  });
});

// POST /api/ondc/init
ondcCompatRouter.post("/init", async (req, res) => {
  try {
    const { tenant, ondcClient, kv } = await getContext();
    const body = req.body;

    if (
      !body.transactionId ||
      !body.bppId ||
      !body.bppUri ||
      !body.providerId ||
      !body.itemId ||
      !body.parentItemId ||
      !body.xinputFormId ||
      !body.submissionId ||
      !body.customerName ||
      !body.customerEmail ||
      !body.customerPhone ||
      !body.amount
    ) {
      res.status(400).json({
        error: "Missing required fields",
        required: [
          "transactionId",
          "bppId",
          "bppUri",
          "providerId",
          "itemId",
          "parentItemId",
          "xinputFormId",
          "submissionId",
          "customerName",
          "customerEmail",
          "customerPhone",
          "amount",
        ],
      });
      return;
    }

    const messageId = uuidv7();
    const traceparent = serializeTraceContext();

    await createInitEntry(
      kv,
      body.transactionId,
      messageId,
      body.itemId,
      body.providerId,
      body.bppId,
      body.bppUri,
      traceparent,
    );

    const items: Array<{
      id: string;
      parent_item_id: string;
      add_ons?: Array<{
        id: string;
        quantity?: { selected?: { count: number } };
      }>;
      xinput: {
        form: { id: string };
        form_response: { submission_id: string; status: string };
      };
    }> = [
      {
        id: body.itemId,
        parent_item_id: body.parentItemId,
        xinput: {
          form: { id: body.xinputFormId },
          form_response: {
            submission_id: body.submissionId,
            status: "SUCCESS",
          },
        },
      },
    ];

    if (body.addOns && body.addOns.length > 0) {
      items[0].add_ons = body.addOns.map(
        (addon: { id: string; quantity: number }) => ({
          id: addon.id,
          quantity: { selected: { count: addon.quantity } },
        }),
      );
    }

    const payload = {
      context: {
        action: "init",
        bap_id: tenant.subscriberId,
        bap_uri: `https://${tenant.subscriberId}/api/ondc`,
        bpp_id: body.bppId,
        bpp_uri: body.bppUri,
        domain: tenant.domainCode,
        location: {
          country: { code: "IND" },
          city: { code: "*" },
        },
        transaction_id: body.transactionId,
        message_id: messageId,
        timestamp: new Date().toISOString(),
        ttl: "P24H",
        version: "2.0.1",
      },
      message: {
        order: {
          provider: { id: body.providerId },
          items: items,
          fulfillments: [
            {
              customer: {
                person: { name: body.customerName },
                contact: {
                  email: body.customerEmail,
                  phone: `+91-${body.customerPhone}`,
                },
              },
            },
          ],
          payments: [
            {
              collected_by: "BPP",
              status: "NOT-PAID",
              type: "PRE-FULFILLMENT",
              params: {
                amount: body.amount,
                currency: "INR",
              },
            },
          ],
        },
      },
    };

    const initUrl = body.bppUri.endsWith("/")
      ? `${body.bppUri}init`
      : `${body.bppUri}/init`;

    const response = await ondcClient.send<Record<string, unknown>>(initUrl, "POST", payload);

    res.json({ ...response, transactionId: body.transactionId, messageId });
  } catch (error) {
    logger.error({ err: error as Error, action: "init" }, "Init failed");
    res.status(503).json({
      status: "Init FAIL",
      error: error instanceof Error ? error.message : "Unknown error",
      ready: false,
    });
  }
});

// POST /api/ondc/on_init - ONDC callback
ondcCompatRouter.post("/on_init", async (req, res) => {
  const { kv } = await getContext();
  const body = req.body;
  const transactionId = body.context?.transaction_id;
  const messageId = body.context?.message_id;

  logger.info({ action: "on_init", transactionId }, "Callback received");

  if (!transactionId || !messageId) {
    logger.warn({ action: "on_init" }, "Missing transaction_id or message_id");
    res.json({ message: { ack: { status: "ACK" } } });
    return;
  }

  const entry = await getInitEntry(kv, transactionId, messageId);
  const originalSpanContext = restoreTraceContext(entry?.traceparent);
  const spanOptions = createLinkedSpanOptions(originalSpanContext, {
    kind: SpanKind.SERVER,
    attributes: {
      "ondc.transaction_id": transactionId,
      "ondc.action": "on_init",
      "ondc.bpp_id": body.context?.bpp_id || "unknown",
      "ondc.bpp_uri": body.context?.bpp_uri || "unknown",
    },
  });

  tracer.startActiveSpan("ondc.on_init", spanOptions, async (span) => {
    try {
      await addInitResponse(kv, transactionId, messageId, body);

      if (body.error) {
        span.setAttribute("error.source", "bpp");
        span.setAttribute("error.message", body.error.message || "BPP NACK");
        if (body.error.code) span.setAttribute("error.code", body.error.code);
        span.setAttribute("bpp.error", JSON.stringify(body.error));
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `BPP error: ${body.error.code || "unknown"}`,
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      res.json({ message: { ack: { status: "ACK" } } });
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      logger.error(
        { err: error as Error, action: "on_init" },
        "on_init callback error",
      );
      res.status(500).json({
        message: { ack: { status: "NACK" } },
        error: {
          type: "DOMAIN-ERROR",
          code: "500",
          message: "Internal server error",
        },
      });
    } finally {
      span.end();
    }
  });
});

// POST /api/ondc/confirm
ondcCompatRouter.post("/confirm", async (req, res) => {
  try {
    const { tenant, ondcClient, kv } = await getContext();
    const body = req.body;

    if (
      !body.transactionId ||
      !body.bppId ||
      !body.bppUri ||
      !body.providerId ||
      !body.itemId ||
      !body.parentItemId ||
      !body.xinputFormId ||
      !body.submissionId ||
      !body.customerName ||
      !body.customerEmail ||
      !body.customerPhone ||
      !body.quoteId ||
      !body.amount ||
      !body.quoteBreakup
    ) {
      res.status(400).json({
        error: "Missing required fields",
        required: [
          "transactionId",
          "bppId",
          "bppUri",
          "providerId",
          "itemId",
          "parentItemId",
          "xinputFormId",
          "submissionId",
          "customerName",
          "customerEmail",
          "customerPhone",
          "quoteId",
          "amount",
          "quoteBreakup",
        ],
      });
      return;
    }

    const messageId = body.messageId || uuidv7();
    const traceparent = serializeTraceContext();

    await createConfirmEntry(
      kv,
      body.transactionId,
      messageId,
      body.itemId,
      body.providerId,
      body.bppId,
      body.bppUri,
      body.quoteId,
      body.amount,
      traceparent,
    );

    const items: Array<{
      id: string;
      parent_item_id: string;
      add_ons?: Array<{
        id: string;
        quantity?: { selected?: { count: number } };
      }>;
      xinput: {
        form: { id: string };
        form_response: { submission_id: string; status: string };
      };
    }> = [
      {
        id: body.itemId,
        parent_item_id: body.parentItemId,
        xinput: {
          form: { id: body.xinputFormId },
          form_response: {
            submission_id: body.submissionId,
            status: "SUCCESS",
          },
        },
      },
    ];

    if (body.addOns && body.addOns.length > 0) {
      items[0].add_ons = body.addOns.map(
        (addon: { id: string; quantity: number }) => ({
          id: addon.id,
          quantity: { selected: { count: addon.quantity } },
        }),
      );
    }

    const payload = {
      context: {
        action: "confirm",
        bap_id: tenant.subscriberId,
        bap_uri: `https://${tenant.subscriberId}/api/ondc`,
        bpp_id: body.bppId,
        bpp_uri: body.bppUri,
        domain: tenant.domainCode,
        location: {
          country: { code: "IND" },
          city: { code: "*" },
        },
        transaction_id: body.transactionId,
        message_id: messageId,
        timestamp: new Date().toISOString(),
        ttl: "P24H",
        version: "2.0.1",
      },
      message: {
        order: {
          provider: { id: body.providerId },
          items: items,
          fulfillments: [
            {
              customer: {
                person: { name: body.customerName },
                contact: {
                  email: body.customerEmail,
                  phone: `+91-${body.customerPhone}`,
                },
              },
            },
          ],
          payments: [
            {
              collected_by: "BPP",
              status: "PAID",
              type: "PRE-FULFILLMENT",
              params: {
                amount: body.amount,
                currency: "INR",
              },
            },
          ],
          quote: {
            id: body.quoteId,
            price: {
              currency: "INR",
              value: body.amount,
            },
            breakup: body.quoteBreakup,
            ttl: "P15D",
          },
        },
      },
    };

    const confirmUrl = body.bppUri.endsWith("/")
      ? `${body.bppUri}confirm`
      : `${body.bppUri}/confirm`;

    const response = await ondcClient.send<Record<string, unknown>>(confirmUrl, "POST", payload);

    res.json({ ...response, transactionId: body.transactionId, messageId });
  } catch (error) {
    logger.error({ err: error as Error, action: "confirm" }, "Confirm failed");
    res.status(503).json({
      status: "Confirm FAIL",
      error: error instanceof Error ? error.message : "Unknown error",
      ready: false,
    });
  }
});

// POST /api/ondc/on_confirm - ONDC callback
ondcCompatRouter.post("/on_confirm", async (req, res) => {
  const { kv } = await getContext();
  const body = req.body;
  const transactionId = body.context?.transaction_id;
  const messageId = body.context?.message_id;
  const orderId = body.message?.order?.id;

  logger.info({ action: "on_confirm", transactionId }, "Callback received");

  if (!transactionId || !messageId) {
    logger.warn(
      { action: "on_confirm" },
      "Missing transaction_id or message_id",
    );
    res.json({ message: { ack: { status: "ACK" } } });
    return;
  }

  const entry = await getConfirmEntry(kv, transactionId, messageId);
  const originalSpanContext = restoreTraceContext(entry?.traceparent);
  const spanOptions = createLinkedSpanOptions(originalSpanContext, {
    kind: SpanKind.SERVER,
    attributes: {
      "ondc.transaction_id": transactionId,
      "ondc.action": "on_confirm",
      "ondc.bpp_id": body.context?.bpp_id || "unknown",
      "ondc.bpp_uri": body.context?.bpp_uri || "unknown",
    },
  });

  tracer.startActiveSpan("ondc.on_confirm", spanOptions, async (span) => {
    try {
      const paymentUrl = body.message?.order?.payments?.[0]?.url;
      if (paymentUrl) span.setAttribute("ondc.payment_url", paymentUrl);

      await addConfirmResponse(kv, transactionId, messageId, orderId, body);

      if (body.error) {
        span.setAttribute("error.source", "bpp");
        span.setAttribute("error.message", body.error.message || "BPP NACK");
        if (body.error.code) span.setAttribute("error.code", body.error.code);
        span.setAttribute("bpp.error", JSON.stringify(body.error));
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `BPP error: ${body.error.code || "unknown"}`,
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      res.json({ message: { ack: { status: "ACK" } } });
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      logger.error(
        { err: error as Error, action: "on_confirm" },
        "on_confirm callback error",
      );
      res.status(500).json({
        message: { ack: { status: "NACK" } },
        error: {
          type: "DOMAIN-ERROR",
          code: "500",
          message: "Internal server error",
        },
      });
    } finally {
      span.end();
    }
  });
});

// GET /api/ondc/init-results
ondcCompatRouter.get("/init-results", async (req, res) => {
  try {
    const { kv } = await getContext();
    const transactionId = req.query.transaction_id as string;
    const messageId = req.query.message_id as string;

    if (!transactionId || !messageId) {
      res.status(400).json({
        error: "Missing transaction_id or message_id query parameters",
      });
      return;
    }

    const result = await getInitResult(kv, transactionId, messageId);

    if (!result.found) {
      res.json({
        found: false,
        transactionId,
        messageId,
        hasResponse: false,
        message: "No init entry found for this transaction",
      });
      return;
    }

    res.json(result);
  } catch (error) {
    logger.error({ err: error as Error }, "Results retrieval failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/ondc/confirm-results
ondcCompatRouter.get("/confirm-results", async (req, res) => {
  try {
    const { kv } = await getContext();
    const transactionId = req.query.transaction_id as string;
    const messageId = req.query.message_id as string;

    if (!transactionId || !messageId) {
      res.status(400).json({
        error: "Missing transaction_id or message_id query parameters",
      });
      return;
    }

    const result = await getConfirmResult(kv, transactionId, messageId);

    if (!result.found) {
      res.json({
        found: false,
        transactionId,
        messageId,
        hasResponse: false,
        message: "No confirm entry found for this transaction",
      });
      return;
    }

    res.json(result);
  } catch (error) {
    logger.error({ err: error as Error }, "Results retrieval failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/ondc/search-results
ondcCompatRouter.get("/search-results", async (req, res) => {
  try {
    const { kv } = await getContext();
    const transactionId = req.query.transaction_id as string;

    if (!transactionId) {
      res.status(400).json({ error: "Missing transaction_id query parameter" });
      return;
    }

    const results = await getSearchResults(kv, transactionId);

    if (!results) {
      res.json({
        found: false,
        transactionId,
        responseCount: 0,
        providers: [],
        responses: [],
        message: "No search entry found for this transaction ID",
      });
      return;
    }

    res.json(results);
  } catch (error) {
    logger.error({ err: error as Error }, "Results retrieval failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/ondc/select-results
ondcCompatRouter.get("/select-results", async (req, res) => {
  try {
    const { kv } = await getContext();
    const transactionId = req.query.transaction_id as string;
    const messageId = req.query.message_id as string;

    if (!transactionId || !messageId) {
      res.status(400).json({
        error: "Missing transaction_id or message_id query parameters",
      });
      return;
    }

    const result = await getSelectResult(kv, transactionId, messageId);

    if (!result.found) {
      res.json({
        found: false,
        transactionId,
        messageId,
        hasResponse: false,
        message: "No select entry found for this transaction",
      });
      return;
    }

    res.json(result);
  } catch (error) {
    logger.error({ err: error as Error }, "Results retrieval failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/ondc/status
ondcCompatRouter.post("/status", async (req, res) => {
  try {
    const { tenant, ondcClient, kv } = await getContext();
    const body = req.body;

    if (!body.transactionId || !body.orderId || !body.bppId || !body.bppUri) {
      res.status(400).json({
        error: "Missing required fields",
        required: ["transactionId", "orderId", "bppId", "bppUri"],
      });
      return;
    }

    const messageId = uuidv7();
    const traceparent = serializeTraceContext();

    await createStatusEntry(
      kv,
      body.orderId,
      body.transactionId,
      body.bppId,
      body.bppUri,
      traceparent,
    );

    // Status request is much simpler - just order_id in message
    const payload = {
      context: {
        action: "status",
        bap_id: tenant.subscriberId,
        bap_uri: `https://${tenant.subscriberId}/api/ondc`,
        bpp_id: body.bppId,
        bpp_uri: body.bppUri,
        domain: tenant.domainCode,
        location: {
          country: { code: "IND" },
          city: { code: "*" },
        },
        transaction_id: body.transactionId,
        message_id: messageId,
        timestamp: new Date().toISOString(),
        ttl: "PT10M", // Shorter TTL for status
        version: "2.0.1",
      },
      message: {
        order_id: body.orderId,
      },
    };

    const statusUrl = body.bppUri.endsWith("/")
      ? `${body.bppUri}status`
      : `${body.bppUri}/status`;

    logger.info({ action: "status", url: statusUrl }, "Sending ONDC request");
    // Payload logged via span attributes

    const response = await ondcClient.send<Record<string, unknown>>(statusUrl, "POST", payload);

    // Response logged via span attributes

    res.json({
      ...response,
      transactionId: body.transactionId,
      orderId: body.orderId,
      messageId,
    });
  } catch (error) {
    logger.error({ err: error as Error, action: "status" }, "Status failed");
    res.status(503).json({
      status: "Status FAIL",
      error: error instanceof Error ? error.message : "Unknown error",
      ready: false,
    });
  }
});

// POST /api/ondc/on_status - ONDC callback
ondcCompatRouter.post("/on_status", async (req, res) => {
  const { kv } = await getContext();
  const body = req.body;
  const orderId = body.message?.order?.id;
  const transactionId = body.context?.transaction_id;

  logger.info({ action: "on_status", orderId }, "Callback received");

  if (!orderId) {
    logger.warn({ action: "on_status" }, "Missing order_id in response");
    res.json({ message: { ack: { status: "ACK" } } });
    return;
  }

  const entry = await getStatusEntry(kv, orderId);
  const originalSpanContext = restoreTraceContext(entry?.traceparent);
  const spanOptions = createLinkedSpanOptions(originalSpanContext, {
    kind: SpanKind.SERVER,
    attributes: {
      "ondc.transaction_id": transactionId || "unknown",
      "ondc.action": "on_status",
      "ondc.order_id": orderId,
      "ondc.bpp_id": body.context?.bpp_id || "unknown",
      "ondc.bpp_uri": body.context?.bpp_uri || "unknown",
    },
  });

  tracer.startActiveSpan("ondc.on_status", spanOptions, async (span) => {
    try {
      await addStatusResponse(kv, orderId, body);

      if (body.error) {
        span.setAttribute("error.source", "bpp");
        span.setAttribute("error.message", body.error.message || "BPP NACK");
        if (body.error.code) span.setAttribute("error.code", body.error.code);
        span.setAttribute("bpp.error", JSON.stringify(body.error));
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `BPP error: ${body.error.code || "unknown"}`,
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      res.json({ message: { ack: { status: "ACK" } } });
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      logger.error(
        { err: error as Error, action: "on_status" },
        "on_status callback error",
      );
      res.status(500).json({
        message: { ack: { status: "NACK" } },
        error: {
          type: "DOMAIN-ERROR",
          code: "500",
          message: "Internal server error",
        },
      });
    } finally {
      span.end();
    }
  });
});

// GET /api/ondc/status-results
ondcCompatRouter.get("/status-results", async (req, res) => {
  try {
    const { kv } = await getContext();
    const orderId = req.query.order_id as string;

    if (!orderId) {
      res.status(400).json({
        error: "Missing order_id query parameter",
      });
      return;
    }

    const result = await getStatusResult(kv, orderId);

    if (!result.found) {
      res.json({
        found: false,
        orderId,
        transactionId: "",
        hasResponse: false,
        message: "No status entry found for this order",
      });
      return;
    }

    res.json(result);
  } catch (error) {
    logger.error({ err: error as Error }, "Results retrieval failed");
    res.status(500).json({ error: "Internal server error" });
  }
});
