/**
 * Init Store - Uses TenantKeyValueStore for ONDC init results
 */

import {
  keyFormatter,
  type TenantKeyValueStore,
} from "../infra/key-value/redis";

// ============================================
// Type Definitions
// ============================================

export interface OnInitContext {
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

export interface InitItem {
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
    tags?: Array<unknown>;
  }>;
}

export interface InitProvider {
  id: string;
  descriptor?: {
    name?: string;
    short_desc?: string;
    long_desc?: string;
    images?: Array<{ url: string; size_type?: string }>;
  };
}

export interface Payment {
  id?: string;
  collected_by?: string;
  status?: string;
  type?: string;
  url?: string;
  params?: {
    amount?: string;
    currency?: string;
    bank_account_number?: string;
    bank_code?: string;
    virtual_payment_address?: string;
  };
  tags?: Array<{
    descriptor?: { name?: string; code?: string };
    display?: boolean;
    list?: Array<{
      descriptor?: { name?: string; code?: string };
      value?: string;
    }>;
  }>;
}

export interface OnInitResponse {
  context: OnInitContext;
  message?: {
    order?: {
      provider?: InitProvider;
      items?: InitItem[];
      quote?: Quote;
      payments?: Payment[];
    };
  };
  error?: {
    code?: string;
    message?: string;
  };
  _receivedAt: string;
}

export interface InitEntry {
  transactionId: string;
  messageId: string;
  itemId: string;
  providerId: string;
  bppId: string;
  bppUri: string;
  initTimestamp: string;
  createdAt: number;
  traceparent?: string;
}

export interface InitResult {
  found: boolean;
  transactionId: string;
  messageId: string;
  itemId?: string;
  providerId?: string;
  hasResponse: boolean;
  quote?: Quote;
  provider?: InitProvider;
  item?: InitItem;
  xinput?: InitItem["xinput"];
  payments?: Payment[];
  error?: { code?: string; message?: string };
}

const DEFAULT_STORE_TTL_MS = 30 * 60 * 1000;

// ============================================
// Store Operations
// ============================================

export async function createInitEntry(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
  itemId: string,
  providerId: string,
  bppId: string,
  bppUri: string,
  traceparent?: string,
): Promise<InitEntry> {
  const entry: InitEntry = {
    transactionId,
    messageId,
    itemId,
    providerId,
    bppId,
    bppUri,
    initTimestamp: new Date().toISOString(),
    createdAt: Date.now(),
    traceparent,
  };

  const key = keyFormatter.init(transactionId, messageId);
  await kv.set(key, entry, { ttlMs: DEFAULT_STORE_TTL_MS });

  console.log(`[InitStore] Created entry: ${transactionId}:${messageId}`);

  return entry;
}

export async function addInitResponse(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
  response: Omit<OnInitResponse, "_receivedAt">,
): Promise<boolean> {
  const key = keyFormatter.init(transactionId, messageId);
  let entry = await kv.get<InitEntry>(key);

  if (!entry) {
    console.warn(
      `[InitStore] No entry found for: ${transactionId}:${messageId}, creating new`,
    );
    entry = {
      transactionId,
      messageId,
      itemId: response.message?.order?.items?.[0]?.id || "unknown",
      providerId: response.message?.order?.provider?.id || "unknown",
      bppId: response.context.bpp_id,
      bppUri: response.context.bpp_uri,
      initTimestamp: response.context.timestamp,
      createdAt: Date.now(),
    };
  }

  const responseWithTimestamp: OnInitResponse = {
    ...response,
    _receivedAt: new Date().toISOString(),
  } as OnInitResponse;

  const responseKey = `${key}:response`;
  await kv.set(key, entry, { ttlMs: DEFAULT_STORE_TTL_MS });
  await kv.set(responseKey, responseWithTimestamp, {
    ttlMs: DEFAULT_STORE_TTL_MS,
  });

  console.log(`[InitStore] Added response for: ${transactionId}:${messageId}`);

  const channel = keyFormatter.initChannel(transactionId, messageId);
  await kv.publish(channel, {
    type: "response_received",
    transactionId,
    messageId,
  });

  return true;
}

export async function getInitEntry(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
): Promise<InitEntry | null> {
  const key = keyFormatter.init(transactionId, messageId);
  return kv.get<InitEntry>(key);
}

export async function getInitResponse(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
): Promise<OnInitResponse | null> {
  const key = keyFormatter.init(transactionId, messageId);
  const responseKey = `${key}:response`;
  return kv.get<OnInitResponse>(responseKey);
}

export function subscribeToInit(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
  callback: (data: {
    type: string;
    transactionId: string;
    messageId: string;
  }) => void,
): () => void {
  const channel = keyFormatter.initChannel(transactionId, messageId);
  return kv.subscribe(channel, (data) => {
    callback(
      data as { type: string; transactionId: string; messageId: string },
    );
  });
}

export async function getInitResult(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
): Promise<InitResult> {
  const entry = await getInitEntry(kv, transactionId, messageId);
  const response = await getInitResponse(kv, transactionId, messageId);

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
    payments: order?.payments,
    error: response?.error,
  };
}
