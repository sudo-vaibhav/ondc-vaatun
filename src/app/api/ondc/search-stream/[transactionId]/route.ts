import {
  getSearchEntry,
  getSearchResults,
  type SearchEntry,
  subscribeToSearch,
} from "@/lib/search-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SSE endpoint for streaming search results
 * GET /api/ondc/search-stream/[transactionId]
 *
 * Sends events:
 * - "connected": Initial connection established
 * - "initial": Initial state with current results
 * - "update": New response received
 * - "complete": TTL expired, collection complete
 * - "error": Error occurred
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  const { transactionId } = await params;

  // Set up SSE headers
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // Disable nginx buffering
  });

  // Create a TransformStream for SSE
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // Helper to send SSE events
  const sendEvent = async (event: string, data: unknown) => {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    await writer.write(encoder.encode(message));
  };

  // Start the streaming logic
  (async () => {
    let unsubscribe: (() => void) | null = null;
    let ttlCheckInterval: NodeJS.Timeout | null = null;

    try {
      // Send connection established
      await sendEvent("connected", { transactionId, timestamp: Date.now() });

      // Get initial state
      const initialEntry = getSearchEntry(transactionId);
      const initialResults = getSearchResults(transactionId);

      if (!initialEntry) {
        await sendEvent("error", {
          message: "Transaction not found",
          transactionId,
        });
        await writer.close();
        return;
      }

      // Send initial state
      await sendEvent("initial", {
        ...initialResults,
        timestamp: Date.now(),
      });

      // Check if already complete
      if (initialResults?.isComplete) {
        await sendEvent("complete", {
          transactionId,
          responseCount: initialResults.responseCount,
          timestamp: Date.now(),
        });
        await writer.close();
        return;
      }

      // Subscribe to updates
      unsubscribe = subscribeToSearch(
        transactionId,
        async (_txnId: string, _entry: SearchEntry) => {
          const results = getSearchResults(transactionId);
          await sendEvent("update", {
            ...results,
            timestamp: Date.now(),
          });

          // Check if complete after update
          if (results?.isComplete) {
            await sendEvent("complete", {
              transactionId,
              responseCount: results.responseCount,
              timestamp: Date.now(),
            });
            if (unsubscribe) unsubscribe();
            if (ttlCheckInterval) clearInterval(ttlCheckInterval);
            await writer.close();
          }
        },
      );

      // Set up TTL check interval (check every second)
      ttlCheckInterval = setInterval(async () => {
        const entry = getSearchEntry(transactionId);
        if (!entry) {
          if (unsubscribe) unsubscribe();
          if (ttlCheckInterval) clearInterval(ttlCheckInterval);
          await sendEvent("error", {
            message: "Transaction expired",
            transactionId,
          });
          await writer.close();
          return;
        }

        if (Date.now() > entry.ttlExpiresAt) {
          const results = getSearchResults(transactionId);
          await sendEvent("complete", {
            transactionId,
            responseCount: results?.responseCount ?? 0,
            timestamp: Date.now(),
          });
          if (unsubscribe) unsubscribe();
          if (ttlCheckInterval) clearInterval(ttlCheckInterval);
          await writer.close();
        }
      }, 1000);

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        console.log(
          `[SSE] Client disconnected for transaction: ${transactionId}`,
        );
        if (unsubscribe) unsubscribe();
        if (ttlCheckInterval) clearInterval(ttlCheckInterval);
        writer.close().catch(() => {});
      });
    } catch (error) {
      console.error("[SSE] Stream error:", error);
      if (unsubscribe) unsubscribe();
      if (ttlCheckInterval) clearInterval(ttlCheckInterval);
      try {
        await sendEvent("error", {
          message: error instanceof Error ? error.message : "Stream error",
        });
        await writer.close();
      } catch {
        // Ignore close errors
      }
    }
  })();

  return new Response(stream.readable, { headers });
}
