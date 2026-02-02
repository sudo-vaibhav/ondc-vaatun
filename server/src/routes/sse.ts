import { Router } from "express";
import { Tenant } from "../entities/tenant";
import { TenantKeyValueStore } from "../infra/key-value/redis";
import {
  getSearchEntry,
  getSearchResults,
  subscribeToSearch,
} from "../lib/search-store";

export const sseRouter = Router();

/**
 * SSE endpoint for streaming search results
 * GET /api/ondc/search-stream/:transactionId
 */
sseRouter.get("/search-stream/:transactionId", async (req, res) => {
  const { transactionId } = req.params;

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering

  // Helper to send SSE events
  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  let unsubscribe: (() => void) | null = null;
  let ttlCheckInterval: NodeJS.Timeout | null = null;

  const cleanup = () => {
    if (unsubscribe) unsubscribe();
    if (ttlCheckInterval) clearInterval(ttlCheckInterval);
  };

  try {
    const tenant = Tenant.getInstance();
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      sendEvent("error", { message: "Redis not configured" });
      res.end();
      return;
    }

    const kv = await TenantKeyValueStore.create(tenant, redisUrl);

    // Send connection established
    sendEvent("connected", { transactionId, timestamp: Date.now() });

    // Get initial state
    const initialEntry = await getSearchEntry(kv, transactionId);
    const initialResults = await getSearchResults(kv, transactionId);

    if (!initialEntry) {
      sendEvent("error", {
        message: "Transaction not found",
        transactionId,
      });
      res.end();
      return;
    }

    // Send initial state
    sendEvent("initial", {
      ...initialResults,
      timestamp: Date.now(),
    });

    // Check if already complete
    if (initialResults?.isComplete) {
      sendEvent("complete", {
        transactionId,
        responseCount: initialResults.responseCount,
        timestamp: Date.now(),
      });
      res.end();
      return;
    }

    // Subscribe to updates
    unsubscribe = subscribeToSearch(kv, transactionId, async () => {
      const results = await getSearchResults(kv, transactionId);
      sendEvent("update", {
        ...results,
        timestamp: Date.now(),
      });

      // Check if complete after update
      if (results?.isComplete) {
        sendEvent("complete", {
          transactionId,
          responseCount: results.responseCount,
          timestamp: Date.now(),
        });
        cleanup();
        res.end();
      }
    });

    // Set up TTL check interval
    ttlCheckInterval = setInterval(async () => {
      const entry = await getSearchEntry(kv, transactionId);
      if (!entry) {
        cleanup();
        sendEvent("error", {
          message: "Transaction expired",
          transactionId,
        });
        res.end();
        return;
      }

      if (Date.now() > entry.ttlExpiresAt) {
        const results = await getSearchResults(kv, transactionId);
        sendEvent("complete", {
          transactionId,
          responseCount: results?.responseCount ?? 0,
          timestamp: Date.now(),
        });
        cleanup();
        res.end();
      }
    }, 1000);

    // Handle client disconnect
    req.on("close", () => {
      console.log(
        `[SSE] Client disconnected for transaction: ${transactionId}`
      );
      cleanup();
    });
  } catch (error) {
    console.error("[SSE] Stream error:", error);
    cleanup();
    sendEvent("error", {
      message: error instanceof Error ? error.message : "Stream error",
    });
    res.end();
  }
});
