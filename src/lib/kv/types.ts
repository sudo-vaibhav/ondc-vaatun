/**
 * Type definitions for the Tenant Key-Value Store
 */

/**
 * Event callback for Pub/Sub subscriptions
 */
export type KVEventCallback<T = unknown> = (channel: string, data: T) => void;

/**
 * Unsubscribe function returned by subscribe methods
 */
export type Unsubscribe = () => void;

/**
 * Options for setting a key
 */
export interface SetOptions {
  /** TTL in milliseconds */
  ttlMs?: number;
}

/**
 * Key prefixes for different data types
 */
export const KEY_PREFIXES = {
  SEARCH: "search",
  SELECT: "select",
} as const;

export type KeyPrefix = (typeof KEY_PREFIXES)[keyof typeof KEY_PREFIXES];
