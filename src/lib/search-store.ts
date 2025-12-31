/**
 * Search Store - Uses TenantKeyValueStore for ONDC search results
 *
 * Groups on_search responses by transaction_id for aggregation.
 * Supports SSE via Pub/Sub for real-time updates.
 */

import { keyFormatter, type TenantKeyValueStore } from "./kv";

// ============================================
// Type Definitions
// ============================================

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
  _receivedAt: string;
}

export interface SearchEntry {
  transactionId: string;
  messageId: string;
  searchTimestamp: string;
  categoryCode: string;
  createdAt: number;
  ttlMs: number;
  ttlExpiresAt: number;
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

// ============================================
// Helper Functions
// ============================================

/**
 * Parse ISO 8601 duration to milliseconds
 * Supports: PT5M (5 minutes), PT30S (30 seconds), PT1H (1 hour)
 */
export function parseTtlToMs(ttl: string): number {
  const match = ttl.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) {
    return 5 * 60 * 1000; // Default to 5 minutes
  }
  const hours = Number.parseInt(match[1] || "0", 10);
  const minutes = Number.parseInt(match[2] || "0", 10);
  const seconds = Number.parseInt(match[3] || "0", 10);
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

// Default TTL: 10 minutes
const DEFAULT_STORE_TTL_MS = 10 * 60 * 1000;

// ============================================
// Store Operations (require KV instance)
// ============================================

/**
 * Create a new search entry when initiating a search
 *
 * @param kv - TenantKeyValueStore instance from context
 * @param transactionId - Unique transaction ID
 * @param messageId - Message ID for the search
 * @param categoryCode - Category being searched
 * @param ttl - ISO 8601 duration string (e.g., "PT5M" for 5 minutes)
 */
export async function createSearchEntry(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
  categoryCode: string,
  ttl = "PT5M",
): Promise<SearchEntry> {
  const now = Date.now();
  const ttlMs = parseTtlToMs(ttl);

  const entry: SearchEntry = {
    transactionId,
    messageId,
    searchTimestamp: new Date().toISOString(),
    categoryCode,
    createdAt: now,
    ttlMs,
    ttlExpiresAt: now + ttlMs,
  };

  const key = keyFormatter.search(transactionId);
  await kv.set(key, entry, { ttlMs: DEFAULT_STORE_TTL_MS });

  console.log(
    `[SearchStore] Created entry for transaction: ${transactionId} (TTL: ${ttl}, expires: ${new Date(entry.ttlExpiresAt).toISOString()})`,
  );

  return entry;
}

/**
 * Add an on_search response to an existing search entry
 *
 * @param kv - TenantKeyValueStore instance from context
 * @param transactionId - Transaction ID to add response to
 * @param response - The on_search response (without _receivedAt)
 */
export async function addSearchResponse(
  kv: TenantKeyValueStore,
  transactionId: string,
  response: Omit<OnSearchResponse, "_receivedAt">,
): Promise<boolean> {
  const key = keyFormatter.search(transactionId);
  let entry = await kv.get<SearchEntry>(key);

  if (!entry) {
    console.warn(
      `[SearchStore] No entry found for transaction: ${transactionId}, creating new`,
    );
    const now = Date.now();
    const ttlMs = parseTtlToMs(response.context.ttl || "PT5M");
    entry = {
      transactionId,
      messageId: response.context.message_id,
      searchTimestamp: response.context.timestamp,
      categoryCode: "UNKNOWN",
      createdAt: now,
      ttlMs,
      ttlExpiresAt: now + ttlMs,
    };
    await kv.set(key, entry, { ttlMs: DEFAULT_STORE_TTL_MS });
  }

  // Add response with received timestamp to the responses list
  const responseWithTimestamp: OnSearchResponse = {
    ...response,
    _receivedAt: new Date().toISOString(),
  } as OnSearchResponse;

  const responsesKey = keyFormatter.searchResponses(transactionId);
  const count = await kv.listPush(responsesKey, responseWithTimestamp);

  console.log(
    `[SearchStore] Added response for transaction: ${transactionId} (total: ${count})`,
  );

  // Publish update event for SSE subscribers
  const channel = keyFormatter.searchChannel(transactionId);
  await kv.publish(channel, {
    type: "response_added",
    transactionId,
    responseCount: count,
  });

  return true;
}

/**
 * Get a search entry by transaction ID
 *
 * @param kv - TenantKeyValueStore instance from context
 * @param transactionId - Transaction ID to look up
 */
export async function getSearchEntry(
  kv: TenantKeyValueStore,
  transactionId: string,
): Promise<SearchEntry | null> {
  const key = keyFormatter.search(transactionId);
  return kv.get<SearchEntry>(key);
}

/**
 * Get all responses for a search transaction
 *
 * @param kv - TenantKeyValueStore instance from context
 * @param transactionId - Transaction ID to get responses for
 */
export async function getSearchResponses(
  kv: TenantKeyValueStore,
  transactionId: string,
): Promise<OnSearchResponse[]> {
  const responsesKey = keyFormatter.searchResponses(transactionId);
  return kv.listGetAll<OnSearchResponse>(responsesKey);
}

/**
 * Subscribe to search updates (for SSE)
 *
 * @param kv - TenantKeyValueStore instance from context
 * @param transactionId - Transaction ID to subscribe to
 * @param callback - Callback function for updates
 * @returns Unsubscribe function
 */
export function subscribeToSearch(
  kv: TenantKeyValueStore,
  transactionId: string,
  callback: (
    transactionId: string,
    data: { type: string; responseCount: number },
  ) => void,
): () => void {
  const channel = keyFormatter.searchChannel(transactionId);
  return kv.subscribe(channel, (_channel, data) => {
    callback(transactionId, data as { type: string; responseCount: number });
  });
}

/**
 * Get aggregated results for a transaction
 *
 * @param kv - TenantKeyValueStore instance from context
 * @param transactionId - Transaction ID to get results for
 */
export async function getSearchResults(
  kv: TenantKeyValueStore,
  transactionId: string,
): Promise<SearchResultsResponse | null> {
  const entry = await getSearchEntry(kv, transactionId);
  const responses = await getSearchResponses(kv, transactionId);

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

  for (const response of responses) {
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
    responseCount: responses.length,
    isComplete: Date.now() > entry.ttlExpiresAt,
    ttlExpiresAt: entry.ttlExpiresAt,
    providers: Array.from(providerMap.values()),
    responses,
  };
}

/**
 * Get all active transaction IDs for this tenant
 *
 * @param kv - TenantKeyValueStore instance from context
 */
export async function getAllTransactionIds(
  kv: TenantKeyValueStore,
): Promise<string[]> {
  const keys = await kv.keys("search:*");
  // Filter out response keys and extract transaction IDs
  return keys
    .filter((k) => !k.includes(":responses") && !k.includes(":updates"))
    .map((k) => k.replace("search:", ""));
}

/**
 * Clear all search entries for this tenant
 *
 * @param kv - TenantKeyValueStore instance from context
 */
export async function clearStore(kv: TenantKeyValueStore): Promise<void> {
  await kv.clear();
  console.log("[SearchStore] Store cleared");
}
