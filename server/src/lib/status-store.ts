/**
 * Status Store - Uses TenantKeyValueStore for ONDC status results
 * Simpler than confirm-store: keyed by orderId only
 */

import {
  keyFormatter,
  type TenantKeyValueStore,
} from "../infra/key-value/redis";

// ============================================
// Type Definitions
// ============================================

export interface OnStatusContext {
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

export interface StatusItem {
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
    range?: {
      start?: string;
      end?: string;
    };
  };
  add_ons?: Array<{
    id: string;
    descriptor?: { name?: string; code?: string };
    price?: { currency: string; value: string };
    quantity?: { selected?: { count: number } };
    tags?: Array<unknown>;
  }>;
}

export interface StatusProvider {
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

export interface PolicyDocument {
  descriptor?: {
    code?: string;
    name?: string;
    short_desc?: string;
    long_desc?: string;
  };
  mime_type?: string;
  url?: string;
}

export interface OnStatusResponse {
  context: OnStatusContext;
  message?: {
    order?: {
      id?: string;
      status?: string;
      provider?: StatusProvider;
      items?: StatusItem[];
      quote?: Quote;
      payments?: Payment[];
      fulfillments?: Fulfillment[];
      documents?: PolicyDocument[];
      created_at?: string;
      updated_at?: string;
    };
  };
  error?: {
    code?: string;
    message?: string;
  };
  _receivedAt: string;
}

export interface StatusEntry {
  orderId: string;
  transactionId: string;
  bppId: string;
  bppUri: string;
  statusTimestamp: string;
  createdAt: number;
}

export interface StatusResult {
  found: boolean;
  orderId: string;
  transactionId: string;
  hasResponse: boolean;
  orderStatus?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  policyDocument?: PolicyDocument;
  provider?: StatusProvider;
  items?: StatusItem[];
  quote?: Quote;
  payments?: Payment[];
  fulfillments?: Fulfillment[];
  documents?: PolicyDocument[];
  error?: { code?: string; message?: string };
}

// 24 hours for policy data (user may return later)
const DEFAULT_STORE_TTL_MS = 24 * 60 * 60 * 1000;

// ============================================
// Store Operations
// ============================================

export async function createStatusEntry(
  kv: TenantKeyValueStore,
  orderId: string,
  transactionId: string,
  bppId: string,
  bppUri: string,
): Promise<StatusEntry> {
  const entry: StatusEntry = {
    orderId,
    transactionId,
    bppId,
    bppUri,
    statusTimestamp: new Date().toISOString(),
    createdAt: Date.now(),
  };

  const key = keyFormatter.status(orderId);
  await kv.set(key, entry, { ttlMs: DEFAULT_STORE_TTL_MS });

  console.log(`[StatusStore] Created entry: ${orderId}`);

  return entry;
}

export async function addStatusResponse(
  kv: TenantKeyValueStore,
  orderId: string,
  response: Omit<OnStatusResponse, "_receivedAt">,
): Promise<boolean> {
  const key = keyFormatter.status(orderId);
  let entry = await kv.get<StatusEntry>(key);

  if (!entry) {
    console.warn(`[StatusStore] No entry found for: ${orderId}, creating new`);
    entry = {
      orderId,
      transactionId: response.context.transaction_id,
      bppId: response.context.bpp_id,
      bppUri: response.context.bpp_uri,
      statusTimestamp: response.context.timestamp,
      createdAt: Date.now(),
    };
  }

  const responseWithTimestamp: OnStatusResponse = {
    ...response,
    _receivedAt: new Date().toISOString(),
  } as OnStatusResponse;

  const responseKey = `${key}:response`;
  await kv.set(key, entry, { ttlMs: DEFAULT_STORE_TTL_MS });
  await kv.set(responseKey, responseWithTimestamp, {
    ttlMs: DEFAULT_STORE_TTL_MS,
  });

  console.log(`[StatusStore] Added response for: ${orderId}`);

  const channel = keyFormatter.statusChannel(orderId);
  await kv.publish(channel, {
    type: "response_received",
    orderId,
  });

  return true;
}

export async function getStatusEntry(
  kv: TenantKeyValueStore,
  orderId: string,
): Promise<StatusEntry | null> {
  const key = keyFormatter.status(orderId);
  return kv.get<StatusEntry>(key);
}

export async function getStatusResponse(
  kv: TenantKeyValueStore,
  orderId: string,
): Promise<OnStatusResponse | null> {
  const key = keyFormatter.status(orderId);
  const responseKey = `${key}:response`;
  return kv.get<OnStatusResponse>(responseKey);
}

export function subscribeToStatus(
  kv: TenantKeyValueStore,
  orderId: string,
  callback: (data: { type: string; orderId: string }) => void,
): () => void {
  const channel = keyFormatter.statusChannel(orderId);
  return kv.subscribe(channel, (data) => {
    callback(data as { type: string; orderId: string });
  });
}

export async function getStatusResult(
  kv: TenantKeyValueStore,
  orderId: string,
): Promise<StatusResult> {
  const entry = await getStatusEntry(kv, orderId);
  const response = await getStatusResponse(kv, orderId);

  if (!entry) {
    return {
      found: false,
      orderId,
      transactionId: "",
      hasResponse: false,
    };
  }

  const order = response?.message?.order;
  const payment = order?.payments?.[0];
  const fulfillment = order?.fulfillments?.[0];
  const policyDocument = order?.documents?.find(
    (doc) =>
      doc.descriptor?.code === "policy-doc" ||
      doc.mime_type === "application/pdf",
  );

  return {
    found: true,
    orderId: entry.orderId,
    transactionId: entry.transactionId,
    hasResponse: !!response,
    orderStatus: order?.status,
    paymentStatus: payment?.status,
    fulfillmentStatus: fulfillment?.state?.descriptor?.code,
    policyDocument,
    provider: order?.provider,
    items: order?.items,
    quote: order?.quote,
    payments: order?.payments,
    fulfillments: order?.fulfillments,
    documents: order?.documents,
    error: response?.error,
  };
}
