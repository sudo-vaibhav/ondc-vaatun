/**
 * In-memory store for ONDC search results
 * Groups on_search responses by transaction_id for aggregation
 *
 * Note: This is a temporary in-memory solution.
 * For production, consider using Redis or a database.
 */

// Type definitions for on_search responses
export interface OnSearchContext {
  domain: string;
  action: string;
  bap_id: string;
  bap_uri: string;
  bpp_id?: string;
  bpp_uri?: string;
  transaction_id: string;
  message_id: string;
  timestamp: string;
  ttl: string;
  version?: string;
  location?: {
    country?: { code: string };
    city?: { code: string };
  };
}

export interface CatalogProvider {
  id: string;
  descriptor?: {
    name?: string;
    short_desc?: string;
    long_desc?: string;
    images?: Array<{ url: string; size_type?: string }>;
  };
  categories?: Array<{
    id: string;
    descriptor?: { name?: string; code?: string };
  }>;
  items?: Array<{
    id: string;
    descriptor?: {
      name?: string;
      short_desc?: string;
      long_desc?: string;
      images?: Array<{ url: string; size_type?: string }>;
    };
    category_ids?: string[];
    tags?: Array<{
      descriptor?: { name?: string; code?: string };
      list?: Array<{
        descriptor?: { name?: string; code?: string };
        value?: string;
        display?: boolean;
      }>;
    }>;
    xinput?: {
      form?: {
        id?: string;
        url?: string;
        mime_type?: string;
      };
      required?: boolean;
    };
    time?: {
      label?: string;
      duration?: string;
    };
    add_ons?: Array<{
      id: string;
      descriptor?: { name?: string; code?: string };
      price?: { currency?: string; value?: string };
    }>;
  }>;
  payments?: Array<{
    collected_by?: string;
    // biome-ignore lint/suspicious/noExplicitAny: ignore
    tags?: Array<any>;
  }>;
}

export interface OnSearchResponse {
  context: OnSearchContext;
  message?: {
    catalog?: {
      descriptor?: {
        name?: string;
        short_desc?: string;
        long_desc?: string;
        images?: Array<{ url: string; size_type?: string }>;
      };
      providers?: CatalogProvider[];
    };
  };
  error?: {
    code?: string;
    message?: string;
  };
  // Metadata added by our store
  _receivedAt: string;
}

export interface SearchEntry {
  transactionId: string;
  messageId: string;
  searchTimestamp: string;
  categoryCode: string;
  responses: OnSearchResponse[];
  createdAt: number; // For TTL cleanup
  ttlMs: number; // TTL duration in milliseconds
  ttlExpiresAt: number; // Timestamp when collection is complete
}

// Event listeners for SSE subscriptions
type SearchEventCallback = (transactionId: string, entry: SearchEntry) => void;
const eventListeners = new Map<string, Set<SearchEventCallback>>();

/**
 * Subscribe to updates for a specific transaction
 */
export function subscribeToSearch(
  transactionId: string,
  callback: SearchEventCallback,
): () => void {
  let listeners = eventListeners.get(transactionId);
  if (!listeners) {
    listeners = new Set();
    eventListeners.set(transactionId, listeners);
  }
  listeners.add(callback);

  // Return unsubscribe function
  return () => {
    const listeners = eventListeners.get(transactionId);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        eventListeners.delete(transactionId);
      }
    }
  };
}

/**
 * Notify all subscribers of an update
 */
function notifySubscribers(transactionId: string, entry: SearchEntry): void {
  const listeners = eventListeners.get(transactionId);
  if (listeners) {
    for (const callback of listeners) {
      try {
        callback(transactionId, entry);
      } catch (error) {
        console.error("[SearchStore] Error in event callback:", error);
      }
    }
  }
}

/**
 * Parse ISO 8601 duration to milliseconds
 * Supports: PT5M (5 minutes), PT30S (30 seconds), PT1H (1 hour)
 */
export function parseTtlToMs(ttl: string): number {
  const match = ttl.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) {
    // Default to 5 minutes if parsing fails
    return 5 * 60 * 1000;
  }
  const hours = Number.parseInt(match[1] || "0", 10);
  const minutes = Number.parseInt(match[2] || "0", 10);
  const seconds = Number.parseInt(match[3] || "0", 10);
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

// TTL in milliseconds (10 minutes)
const STORE_TTL_MS = 10 * 60 * 1000;

// Cleanup interval (every 2 minutes)
const CLEANUP_INTERVAL_MS = 2 * 60 * 1000;

// In-memory store
const searchStore = new Map<string, SearchEntry>();

// Cleanup old entries periodically
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanupInterval() {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [transactionId, entry] of searchStore.entries()) {
      if (now - entry.createdAt > STORE_TTL_MS) {
        searchStore.delete(transactionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[SearchStore] Cleaned up ${cleaned} expired entries`);
    }
  }, CLEANUP_INTERVAL_MS);
}

// Start cleanup on module load
startCleanupInterval();

/**
 * Create a new search entry when initiating a search
 * @param ttl - ISO 8601 duration string (e.g., "PT5M" for 5 minutes)
 */
export function createSearchEntry(
  transactionId: string,
  messageId: string,
  categoryCode: string,
  ttl = "PT5M",
): SearchEntry {
  const now = Date.now();
  const ttlMs = parseTtlToMs(ttl);

  const entry: SearchEntry = {
    transactionId,
    messageId,
    searchTimestamp: new Date().toISOString(),
    categoryCode,
    responses: [],
    createdAt: now,
    ttlMs,
    ttlExpiresAt: now + ttlMs,
  };

  searchStore.set(transactionId, entry);
  console.log(
    `[SearchStore] Created entry for transaction: ${transactionId} (TTL: ${ttl}, expires: ${new Date(entry.ttlExpiresAt).toISOString()})`,
  );

  return entry;
}

/**
 * Add an on_search response to an existing search entry
 */
export function addSearchResponse(
  transactionId: string,
  response: Omit<OnSearchResponse, "_receivedAt">,
): boolean {
  let entry = searchStore.get(transactionId);

  if (!entry) {
    console.warn(
      `[SearchStore] No entry found for transaction: ${transactionId}`,
    );
    // Create a new entry if it doesn't exist (for late responses)
    const now = Date.now();
    const ttlMs = parseTtlToMs(response.context.ttl || "PT5M");
    entry = {
      transactionId,
      messageId: response.context.message_id,
      searchTimestamp: response.context.timestamp,
      categoryCode: "UNKNOWN",
      responses: [],
      createdAt: now,
      ttlMs,
      ttlExpiresAt: now + ttlMs,
    };
    searchStore.set(transactionId, entry);
  }

  // Add response with received timestamp
  entry.responses.push({
    ...response,
    _receivedAt: new Date().toISOString(),
  } as OnSearchResponse);

  console.log(
    `[SearchStore] Added response for transaction: ${transactionId} (total: ${entry.responses.length})`,
  );

  // Notify SSE subscribers of the update
  notifySubscribers(transactionId, entry);

  return true;
}

/**
 * Get a search entry by transaction ID
 */
export function getSearchEntry(transactionId: string): SearchEntry | null {
  return searchStore.get(transactionId) || null;
}

export interface SearchResultsResponse {
  found: boolean;
  transactionId: string;
  messageId?: string;
  searchTimestamp?: string;
  categoryCode?: string;
  responseCount: number;
  isComplete: boolean;
  ttlExpiresAt: number;
  providers: Array<{
    bppId: string;
    bppUri?: string;
    name?: string;
    itemCount: number;
    hasError: boolean;
  }>;
  responses: OnSearchResponse[];
}

/**
 * Get aggregated results for a transaction
 */
export function getSearchResults(
  transactionId: string,
): SearchResultsResponse | null {
  const entry = searchStore.get(transactionId);

  if (!entry) {
    return null;
  }

  // Extract unique providers from responses
  const providerMap = new Map<
    string,
    {
      bppId: string;
      bppUri?: string;
      name?: string;
      itemCount: number;
      hasError: boolean;
    }
  >();

  for (const response of entry.responses) {
    const bppId = response.context.bpp_id || "unknown";

    if (!providerMap.has(bppId)) {
      const catalogName = response.message?.catalog?.descriptor?.name;
      const providerName =
        response.message?.catalog?.providers?.[0]?.descriptor?.name;
      const itemCount =
        response.message?.catalog?.providers?.reduce(
          (sum, p) => sum + (p.items?.length || 0),
          0,
        ) || 0;

      providerMap.set(bppId, {
        bppId,
        bppUri: response.context.bpp_uri,
        name: catalogName || providerName || bppId,
        itemCount,
        hasError: !!response.error,
      });
    }
  }

  return {
    found: true,
    transactionId: entry.transactionId,
    messageId: entry.messageId,
    searchTimestamp: entry.searchTimestamp,
    categoryCode: entry.categoryCode,
    responseCount: entry.responses.length,
    isComplete: Date.now() > entry.ttlExpiresAt,
    ttlExpiresAt: entry.ttlExpiresAt,
    providers: Array.from(providerMap.values()),
    responses: entry.responses,
  };
}

/**
 * Get all active transaction IDs (for debugging)
 */
export function getAllTransactionIds(): string[] {
  return Array.from(searchStore.keys());
}

/**
 * Clear all entries (for testing)
 */
export function clearStore(): void {
  searchStore.clear();
  console.log("[SearchStore] Store cleared");
}
