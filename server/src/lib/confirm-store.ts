/**
 * Confirm Store - Uses TenantKeyValueStore for ONDC confirm results
 */

import {
  keyFormatter,
  type TenantKeyValueStore,
} from "../infra/key-value/redis";

// ============================================
// Type Definitions
// ============================================

export interface OnConfirmContext {
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

export interface ConfirmItem {
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

export interface ConfirmProvider {
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

export interface Fulfillment {
  id?: string;
  type?: string;
  state?: {
    descriptor?: {
      code?: string;
      name?: string;
    };
  };
  customer?: {
    person?: { name?: string };
    contact?: { email?: string; phone?: string };
  };
}

export interface CancellationTerm {
  fulfillment_state?: {
    descriptor?: { code?: string };
  };
  cancellation_fee?: {
    percentage?: string;
    amount?: {
      currency?: string;
      value?: string;
    };
  };
  external_ref?: {
    mimetype?: string;
    url?: string;
  };
}

export interface OnConfirmResponse {
  context: OnConfirmContext;
  message?: {
    order?: {
      id?: string;
      status?: string;
      provider?: ConfirmProvider;
      items?: ConfirmItem[];
      quote?: Quote;
      payments?: Payment[];
      fulfillments?: Fulfillment[];
      created_at?: string;
      updated_at?: string;
      cancellation_terms?: CancellationTerm[];
    };
  };
  error?: {
    code?: string;
    message?: string;
  };
  _receivedAt: string;
}

export interface ConfirmEntry {
  transactionId: string;
  messageId: string;
  orderId?: string;
  itemId: string;
  providerId: string;
  bppId: string;
  bppUri: string;
  quoteId: string;
  amount: string;
  confirmTimestamp: string;
  createdAt: number;
  traceparent?: string;
}

export interface ConfirmResult {
  found: boolean;
  transactionId: string;
  messageId: string;
  orderId?: string;
  hasResponse: boolean;
  paymentStatus?: string;
  paymentUrl?: string;
  orderStatus?: string;
  provider?: ConfirmProvider;
  items?: ConfirmItem[];
  quote?: Quote;
  error?: { code?: string; message?: string };
}

const DEFAULT_STORE_TTL_MS = 30 * 60 * 1000;

// ============================================
// Store Operations
// ============================================

export async function createConfirmEntry(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
  itemId: string,
  providerId: string,
  bppId: string,
  bppUri: string,
  quoteId: string,
  amount: string,
  traceparent?: string,
): Promise<ConfirmEntry> {
  const entry: ConfirmEntry = {
    transactionId,
    messageId,
    itemId,
    providerId,
    bppId,
    bppUri,
    quoteId,
    amount,
    confirmTimestamp: new Date().toISOString(),
    createdAt: Date.now(),
    traceparent,
  };

  const key = keyFormatter.confirm(transactionId, messageId);
  await kv.set(key, entry, { ttlMs: DEFAULT_STORE_TTL_MS });

  console.log(`[ConfirmStore] Created entry: ${transactionId}:${messageId}`);

  return entry;
}

export async function addConfirmResponse(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
  orderId: string | undefined,
  response: Omit<OnConfirmResponse, "_receivedAt">,
): Promise<boolean> {
  const key = keyFormatter.confirm(transactionId, messageId);
  let entry = await kv.get<ConfirmEntry>(key);

  if (!entry) {
    console.warn(
      `[ConfirmStore] No entry found for: ${transactionId}:${messageId}, creating new`,
    );
    entry = {
      transactionId,
      messageId,
      orderId,
      itemId: response.message?.order?.items?.[0]?.id || "unknown",
      providerId: response.message?.order?.provider?.id || "unknown",
      bppId: response.context.bpp_id,
      bppUri: response.context.bpp_uri,
      quoteId: response.message?.order?.quote?.id || "unknown",
      amount: response.message?.order?.quote?.price?.value || "0",
      confirmTimestamp: response.context.timestamp,
      createdAt: Date.now(),
    };
  } else {
    // Update orderId from on_confirm response
    entry.orderId = orderId || response.message?.order?.id;
  }

  const responseWithTimestamp: OnConfirmResponse = {
    ...response,
    _receivedAt: new Date().toISOString(),
  } as OnConfirmResponse;

  const responseKey = `${key}:response`;
  await kv.set(key, entry, { ttlMs: DEFAULT_STORE_TTL_MS });
  await kv.set(responseKey, responseWithTimestamp, {
    ttlMs: DEFAULT_STORE_TTL_MS,
  });

  console.log(
    `[ConfirmStore] Added response for: ${transactionId}:${messageId}, orderId: ${orderId}`,
  );

  const channel = keyFormatter.confirmChannel(transactionId, messageId);
  await kv.publish(channel, {
    type: "response_received",
    transactionId,
    messageId,
    orderId,
  });

  return true;
}

export async function getConfirmEntry(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
): Promise<ConfirmEntry | null> {
  const key = keyFormatter.confirm(transactionId, messageId);
  return kv.get<ConfirmEntry>(key);
}

export async function getConfirmResponse(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
): Promise<OnConfirmResponse | null> {
  const key = keyFormatter.confirm(transactionId, messageId);
  const responseKey = `${key}:response`;
  return kv.get<OnConfirmResponse>(responseKey);
}

export function subscribeToConfirm(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
  callback: (data: {
    type: string;
    transactionId: string;
    messageId: string;
    orderId?: string;
  }) => void,
): () => void {
  const channel = keyFormatter.confirmChannel(transactionId, messageId);
  return kv.subscribe(channel, (data) => {
    callback(
      data as {
        type: string;
        transactionId: string;
        messageId: string;
        orderId?: string;
      },
    );
  });
}

export async function getConfirmResult(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
): Promise<ConfirmResult> {
  const entry = await getConfirmEntry(kv, transactionId, messageId);
  const response = await getConfirmResponse(kv, transactionId, messageId);

  if (!entry) {
    return {
      found: false,
      transactionId,
      messageId,
      hasResponse: false,
    };
  }

  const order = response?.message?.order;
  const payment = order?.payments?.[0];

  return {
    found: true,
    transactionId: entry.transactionId,
    messageId: entry.messageId,
    orderId: entry.orderId || order?.id,
    hasResponse: !!response,
    paymentStatus: payment?.status,
    paymentUrl: payment?.url,
    orderStatus: order?.status,
    provider: order?.provider,
    items: order?.items,
    quote: order?.quote,
    error: response?.error,
  };
}
