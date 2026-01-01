/**
 * Select Store - Uses TenantKeyValueStore for ONDC select results
 *
 * Stores on_select responses for quote display.
 * Supports SSE via Pub/Sub for real-time updates.
 */

import {
  keyFormatter,
  type TenantKeyValueStore,
} from "@/infra/key-value/redis";

// ============================================
// Type Definitions
// ============================================

export interface OnSelectContext {
  domain: string;
  action: string;
  bap_id: string;
  bap_uri: string;
  bpp_id: string;
  bpp_uri: string;
  transaction_id: string;
  message_id: string;
  timestamp: string;
  ttl: string;
  version?: string;
}

export interface QuoteBreakup {
  title: string;
  price: {
    currency: string;
    value: string;
  };
  item?: {
    id: string;
    add_ons?: Array<{ id: string }>;
  };
}

export interface Quote {
  id?: string;
  price: {
    currency: string;
    value: string;
  };
  breakup?: QuoteBreakup[];
  ttl?: string;
}

export interface SelectItem {
  id: string;
  parent_item_id?: string;
  descriptor?: {
    name?: string;
    short_desc?: string;
    long_desc?: string;
    images?: Array<{ url: string; size_type?: string }>;
  };
  category_ids?: string[];
  price?: {
    currency: string;
    value: string;
  };
  tags?: Array<{
    descriptor?: { name?: string; code?: string };
    list?: Array<{
      descriptor?: { name?: string; code?: string };
      value?: string;
    }>;
  }>;
  time?: {
    duration?: string;
    label?: string;
  };
  xinput?: {
    head?: {
      descriptor?: { name?: string };
      index?: { min: number; cur: number; max: number };
      headings?: string[];
    };
    form?: {
      id?: string;
      url?: string;
      mime_type?: string;
      resubmit?: boolean;
      multiple_submissions?: boolean;
    };
    required?: boolean;
  };
  add_ons?: Array<{
    id: string;
    descriptor?: { name?: string; code?: string };
    price?: { currency: string; value: string };
    quantity?: { selected?: { count: number } };
    // biome-ignore lint/suspicious/noExplicitAny: ignore
    tags?: Array<any>;
  }>;
}

export interface SelectProvider {
  id: string;
  descriptor?: {
    name?: string;
    short_desc?: string;
    long_desc?: string;
    images?: Array<{ url: string; size_type?: string }>;
  };
}

export interface OnSelectResponse {
  context: OnSelectContext;
  message?: {
    order?: {
      provider?: SelectProvider;
      items?: SelectItem[];
      quote?: Quote;
    };
  };
  error?: {
    code?: string;
    message?: string;
  };
  _receivedAt: string;
}

export interface SelectEntry {
  transactionId: string;
  messageId: string;
  itemId: string;
  providerId: string;
  bppId: string;
  bppUri: string;
  selectTimestamp: string;
  createdAt: number;
}

export interface SelectResult {
  found: boolean;
  transactionId: string;
  messageId: string;
  itemId?: string;
  providerId?: string;
  hasResponse: boolean;
  quote?: Quote;
  provider?: SelectProvider;
  item?: SelectItem;
  xinput?: SelectItem["xinput"];
  error?: { code?: string; message?: string };
}

// Default TTL: 10 minutes
const DEFAULT_STORE_TTL_MS = 10 * 60 * 1000;

// ============================================
// Store Operations (require KV instance)
// ============================================

/**
 * Create a new select entry when initiating a select request
 *
 * @param kv - TenantKeyValueStore instance from context
 */
export async function createSelectEntry(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
  itemId: string,
  providerId: string,
  bppId: string,
  bppUri: string,
): Promise<SelectEntry> {
  const entry: SelectEntry = {
    transactionId,
    messageId,
    itemId,
    providerId,
    bppId,
    bppUri,
    selectTimestamp: new Date().toISOString(),
    createdAt: Date.now(),
  };

  const key = keyFormatter.select(transactionId, messageId);
  await kv.set(key, entry, { ttlMs: DEFAULT_STORE_TTL_MS });

  console.log(`[SelectStore] Created entry: ${transactionId}:${messageId}`);

  return entry;
}

/**
 * Add an on_select response to an existing select entry
 *
 * @param kv - TenantKeyValueStore instance from context
 */
export async function addSelectResponse(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
  response: Omit<OnSelectResponse, "_receivedAt">,
): Promise<boolean> {
  const key = keyFormatter.select(transactionId, messageId);
  let entry = await kv.get<SelectEntry>(key);

  if (!entry) {
    console.warn(
      `[SelectStore] No entry found for: ${transactionId}:${messageId}, creating new`,
    );
    entry = {
      transactionId,
      messageId,
      itemId: response.message?.order?.items?.[0]?.id || "unknown",
      providerId: response.message?.order?.provider?.id || "unknown",
      bppId: response.context.bpp_id,
      bppUri: response.context.bpp_uri,
      selectTimestamp: response.context.timestamp,
      createdAt: Date.now(),
    };
  }

  // Store the response with received timestamp
  const responseWithTimestamp: OnSelectResponse = {
    ...response,
    _receivedAt: new Date().toISOString(),
  } as OnSelectResponse;

  // Store both entry and response
  const responseKey = `${key}:response`;
  await kv.set(key, entry, { ttlMs: DEFAULT_STORE_TTL_MS });
  await kv.set(responseKey, responseWithTimestamp, {
    ttlMs: DEFAULT_STORE_TTL_MS,
  });

  console.log(
    `[SelectStore] Added response for: ${transactionId}:${messageId}`,
  );

  // Publish update event for SSE subscribers
  const channel = keyFormatter.selectChannel(transactionId, messageId);
  await kv.publish(channel, {
    type: "response_received",
    transactionId,
    messageId,
  });

  return true;
}

/**
 * Get a select entry by transaction_id and message_id
 *
 * @param kv - TenantKeyValueStore instance from context
 */
export async function getSelectEntry(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
): Promise<SelectEntry | null> {
  const key = keyFormatter.select(transactionId, messageId);
  return kv.get<SelectEntry>(key);
}

/**
 * Get select response by transaction_id and message_id
 *
 * @param kv - TenantKeyValueStore instance from context
 */
export async function getSelectResponse(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
): Promise<OnSelectResponse | null> {
  const key = keyFormatter.select(transactionId, messageId);
  const responseKey = `${key}:response`;
  return kv.get<OnSelectResponse>(responseKey);
}

/**
 * Subscribe to select updates (for SSE)
 *
 * @param kv - TenantKeyValueStore instance from context
 * @returns Unsubscribe function
 */
export function subscribeToSelect(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
  callback: (data: {
    type: string;
    transactionId: string;
    messageId: string;
  }) => void,
): () => void {
  const channel = keyFormatter.selectChannel(transactionId, messageId);
  return kv.subscribe(channel, (data) => {
    callback(
      data as { type: string; transactionId: string; messageId: string },
    );
  });
}

/**
 * Find the most recent select entry by transaction_id
 * Note: This scans all keys, so use sparingly
 *
 * @param kv - TenantKeyValueStore instance from context
 */
export async function findSelectByTransaction(
  kv: TenantKeyValueStore,
  transactionId: string,
): Promise<SelectEntry | null> {
  const keys = await kv.keys(`select:${transactionId}:*`);

  // Filter out response keys
  const entryKeys = keys.filter(
    (k) => !k.endsWith(":response") && !k.endsWith(":updates"),
  );

  if (entryKeys.length === 0) {
    return null;
  }

  // Get all entries and find the most recent
  let latestEntry: SelectEntry | null = null;

  for (const key of entryKeys) {
    const entry = await kv.get<SelectEntry>(key);
    if (entry && (!latestEntry || entry.createdAt > latestEntry.createdAt)) {
      latestEntry = entry;
    }
  }

  return latestEntry;
}

/**
 * Get select result for API response
 *
 * @param kv - TenantKeyValueStore instance from context
 */
export async function getSelectResult(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
): Promise<SelectResult> {
  const entry = await getSelectEntry(kv, transactionId, messageId);
  const response = await getSelectResponse(kv, transactionId, messageId);

  if (!entry) {
    return {
      found: false,
      transactionId,
      messageId,
      hasResponse: false,
    };
  }

  const order = response?.message?.order;

  return {
    found: true,
    transactionId: entry.transactionId,
    messageId: entry.messageId,
    itemId: entry.itemId,
    providerId: entry.providerId,
    hasResponse: !!response,
    quote: order?.quote,
    provider: order?.provider,
    item: order?.items?.[0],
    xinput: order?.items?.[0]?.xinput,
    error: response?.error,
  };
}
