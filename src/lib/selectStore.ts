/**
 * In-memory store for ONDC select results
 * Stores on_select responses for quote display
 * 
 * Note: This is a temporary in-memory solution.
 * For production, consider using Redis or a database.
 */

// Type definitions for on_select responses
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
            multiple_sumbissions?: boolean;
        };
        required?: boolean;
    };
    add_ons?: Array<{
        id: string;
        descriptor?: { name?: string; code?: string };
        price?: { currency: string; value: string };
        quantity?: { selected?: { count: number } };
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
    response: OnSelectResponse | null;
    createdAt: number;
}

// TTL in milliseconds (10 minutes)
const STORE_TTL_MS = 10 * 60 * 1000;

// Cleanup interval (every 2 minutes)
const CLEANUP_INTERVAL_MS = 2 * 60 * 1000;

// In-memory store - key format: {transaction_id}_{message_id}
const selectStore = new Map<string, SelectEntry>();

// Cleanup old entries periodically
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanupInterval() {
    if (cleanupInterval) return;

    cleanupInterval = setInterval(() => {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of selectStore.entries()) {
            if (now - entry.createdAt > STORE_TTL_MS) {
                selectStore.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`[SelectStore] Cleaned up ${cleaned} expired entries`);
        }
    }, CLEANUP_INTERVAL_MS);
}

// Start cleanup on module load
startCleanupInterval();

/**
 * Generate store key from transaction_id and message_id
 */
function getStoreKey(transactionId: string, messageId: string): string {
    return `${transactionId}_${messageId}`;
}

/**
 * Create a new select entry when initiating a select request
 */
export function createSelectEntry(
    transactionId: string,
    messageId: string,
    itemId: string,
    providerId: string,
    bppId: string,
    bppUri: string
): SelectEntry {
    const key = getStoreKey(transactionId, messageId);

    const entry: SelectEntry = {
        transactionId,
        messageId,
        itemId,
        providerId,
        bppId,
        bppUri,
        selectTimestamp: new Date().toISOString(),
        response: null,
        createdAt: Date.now(),
    };

    selectStore.set(key, entry);
    console.log(`[SelectStore] Created entry: ${key}`);

    return entry;
}

/**
 * Add an on_select response to an existing select entry
 */
export function addSelectResponse(
    transactionId: string,
    messageId: string,
    response: Omit<OnSelectResponse, '_receivedAt'>
): boolean {
    const key = getStoreKey(transactionId, messageId);
    const entry = selectStore.get(key);

    if (!entry) {
        // Create entry if it doesn't exist (for late responses)
        console.warn(`[SelectStore] No entry found for: ${key}, creating new`);
        const newEntry: SelectEntry = {
            transactionId,
            messageId,
            itemId: response.message?.order?.items?.[0]?.id || 'unknown',
            providerId: response.message?.order?.provider?.id || 'unknown',
            bppId: response.context.bpp_id,
            bppUri: response.context.bpp_uri,
            selectTimestamp: response.context.timestamp,
            response: {
                ...response,
                _receivedAt: new Date().toISOString(),
            } as OnSelectResponse,
            createdAt: Date.now(),
        };
        selectStore.set(key, newEntry);
        return true;
    }

    // Add response with received timestamp
    entry.response = {
        ...response,
        _receivedAt: new Date().toISOString(),
    } as OnSelectResponse;

    console.log(`[SelectStore] Added response for: ${key}`);
    return true;
}

/**
 * Get a select entry by transaction_id and message_id
 */
export function getSelectEntry(transactionId: string, messageId: string): SelectEntry | null {
    const key = getStoreKey(transactionId, messageId);
    return selectStore.get(key) || null;
}

/**
 * Find select entries by transaction_id (returns most recent)
 */
export function findSelectByTransaction(transactionId: string): SelectEntry | null {
    let latestEntry: SelectEntry | null = null;

    for (const [key, entry] of selectStore.entries()) {
        if (entry.transactionId === transactionId) {
            if (!latestEntry || entry.createdAt > latestEntry.createdAt) {
                latestEntry = entry;
            }
        }
    }

    return latestEntry;
}

/**
 * Get select result for API response
 */
export function getSelectResult(transactionId: string, messageId: string): {
    found: boolean;
    transactionId: string;
    messageId: string;
    itemId?: string;
    providerId?: string;
    hasResponse: boolean;
    quote?: Quote;
    provider?: SelectProvider;
    item?: SelectItem;
    xinput?: SelectItem['xinput'];
    error?: { code?: string; message?: string };
} {
    const entry = getSelectEntry(transactionId, messageId);

    if (!entry) {
        return {
            found: false,
            transactionId,
            messageId,
            hasResponse: false,
        };
    }

    const response = entry.response;
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
