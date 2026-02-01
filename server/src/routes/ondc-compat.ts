/**
 * ONDC Compatibility Routes
 *
 * These routes provide backwards-compatible REST API endpoints that proxy to tRPC procedures.
 * This is necessary because:
 * 1. ONDC network callbacks (on_subscribe, on_search, on_select) expect specific paths
 * 2. Existing tests expect REST API paths
 */

import { Router } from "express";
import { v7 as uuidv7 } from "uuid";
import { Tenant } from "../entities/tenant";
import { TenantKeyValueStore } from "../infra/key-value/redis";
import { ONDCClient } from "../lib/ondc/client";
import { createSearchPayload } from "../lib/ondc/payload";
import { createSearchEntry, addSearchResponse } from "../lib/search-store";
import {
  createSelectEntry,
  addSelectResponse,
} from "../lib/select-store";

export const ondcCompatRouter = Router();

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
    console.error("[health] Service not ready:", error);
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
    console.error("[Lookup] Error:", error);
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
    console.error("[Subscribe] Error:", error);
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

    console.log("[on_subscribe] Request:", JSON.stringify(req.body, null, 2));

    if (!challenge) {
      res.status(400).json({ error: "Challenge is required" });
      return;
    }

    if (subscriber_id && subscriber_id !== tenant.subscriberId) {
      console.warn("[on_subscribe] Subscriber ID mismatch:", {
        expected: tenant.subscriberId,
        received: subscriber_id,
      });
    }

    const answer = tenant.decryptChallenge(challenge);
    console.log("[on_subscribe] Answer:", answer);

    res.json({ answer });
  } catch (error) {
    console.error("[on_subscribe] Error:", error);
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

    await createSearchEntry(kv, transactionId, messageId, categoryCode);

    const payload = createSearchPayload(tenant, transactionId, messageId, categoryCode);
    const gatewayUrl = new URL("search", tenant.gatewayUrl);

    console.log("[Search] Sending request to:", gatewayUrl.toString());

    const response = await ondcClient.send(gatewayUrl, "POST", payload);

    res.json({ ...response, transactionId, messageId });
  } catch (error) {
    console.error("[Search] Error:", error);
    res.status(503).json({ status: "Search FAIL", ready: false });
  }
});

// POST /api/ondc/on_search - ONDC callback
ondcCompatRouter.post("/on_search", async (req, res) => {
  try {
    const { kv } = await getContext();
    const body = req.body;

    console.log("[on_search] Request Body:", JSON.stringify(body, null, "\t"));

    const transactionId = body.context?.transaction_id;
    if (transactionId) {
      await addSearchResponse(kv, transactionId, body);
    } else {
      console.warn("[on_search] No transaction_id found in context");
    }

    res.json({ message: { ack: { status: "ACK" } } });
  } catch (error) {
    console.error("[on_search] Error:", error);
    res.status(500).json({
      message: { ack: { status: "NACK" } },
      error: { type: "DOMAIN-ERROR", code: "500", message: "Internal server error" },
    });
  }
});

// POST /api/ondc/select
ondcCompatRouter.post("/select", async (req, res) => {
  try {
    const { tenant, ondcClient, kv } = await getContext();
    const body = req.body;

    if (!body.transactionId || !body.bppId || !body.bppUri || !body.providerId || !body.itemId) {
      res.status(400).json({
        error: "Missing required fields",
        required: ["transactionId", "bppId", "bppUri", "providerId", "itemId"],
      });
      return;
    }

    const messageId = uuidv7();

    const items: Array<{
      id: string;
      parent_item_id: string;
      add_ons?: Array<{ id: string; quantity?: { selected?: { count: number } } }>;
      xinput?: {
        form?: { id?: string };
        form_response?: { submission_id: string; status: string };
      };
    }> = [{ id: body.itemId, parent_item_id: body.parentItemId || body.itemId }];

    if (body.xinputFormId && body.xinputSubmissionId) {
      items[0].xinput = {
        form: { id: body.xinputFormId },
        form_response: { submission_id: body.xinputSubmissionId, status: "APPROVED" },
      };
    }

    if (body.addOns?.length > 0) {
      items[0].add_ons = body.addOns.map((addon: { id: string; quantity: number }) => ({
        id: addon.id,
        quantity: { selected: { count: addon.quantity } },
      }));
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

    await createSelectEntry(kv, body.transactionId, messageId, body.itemId, body.providerId, body.bppId, body.bppUri);

    const response = await ondcClient.send(selectUrl, "POST", payload);

    res.json({ ...response, transactionId: body.transactionId, messageId });
  } catch (error) {
    console.error("[Select] Error:", error);
    res.status(503).json({
      status: "Select FAIL",
      error: error instanceof Error ? error.message : "Unknown error",
      ready: false,
    });
  }
});

// POST /api/ondc/on_select - ONDC callback
ondcCompatRouter.post("/on_select", async (req, res) => {
  try {
    const { kv } = await getContext();
    const body = req.body;

    console.log("[on_select] Request Body:", JSON.stringify(body, null, 2));

    const transactionId = body.context?.transaction_id;
    const messageId = body.context?.message_id;

    if (body.error) {
      console.error("[on_select] BPP returned error:", body.error);
    }

    if (transactionId && messageId) {
      await addSelectResponse(kv, transactionId, messageId, body);
    } else {
      console.warn("[on_select] Missing transaction_id or message_id");
    }

    res.json({ message: { ack: { status: "ACK" } } });
  } catch (error) {
    console.error("[on_select] Error:", error);
    res.status(500).json({
      message: { ack: { status: "NACK" } },
      error: { type: "DOMAIN-ERROR", code: "500", message: "Internal server error" },
    });
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

    const { getSearchResults } = await import("../lib/search-store");
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
    console.error("[search-results] Error:", error);
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
      res.status(400).json({ error: "Missing transaction_id or message_id query parameters" });
      return;
    }

    const { getSelectResult } = await import("../lib/select-store");
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
    console.error("[select-results] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
