/**
 * Key formatter utilities for tenant-scoped key-value store
 *
 * Key structure: {tenantId}:{prefix}:{identifier}
 */

import { KEY_PREFIXES } from "./types";

/**
 * Format a search entry key
 */
export function searchKey(transactionId: string): string {
  return `${KEY_PREFIXES.SEARCH}:${transactionId}`;
}

/**
 * Format a search responses list key
 */
export function searchResponsesKey(transactionId: string): string {
  return `${KEY_PREFIXES.SEARCH}:${transactionId}:responses`;
}

/**
 * Format a search Pub/Sub channel
 */
export function searchChannel(transactionId: string): string {
  return `${KEY_PREFIXES.SEARCH}:${transactionId}:updates`;
}

/**
 * Format a select entry key
 */
export function selectKey(transactionId: string, messageId: string): string {
  return `${KEY_PREFIXES.SELECT}:${transactionId}:${messageId}`;
}

/**
 * Format a select Pub/Sub channel
 */
export function selectChannel(
  transactionId: string,
  messageId: string,
): string {
  return `${KEY_PREFIXES.SELECT}:${transactionId}:${messageId}:updates`;
}

/**
 * Parse a key to extract its components
 */
export function parseKey(key: string): {
  tenantId: string;
  prefix: string;
  identifier: string;
  rest: string[];
} {
  const parts = key.split(":");
  return {
    tenantId: parts[0] || "",
    prefix: parts[1] || "",
    identifier: parts[2] || "",
    rest: parts.slice(3),
  };
}

/**
 * Key formatter object for convenient access
 */
export const keyFormatter = {
  search: searchKey,
  searchResponses: searchResponsesKey,
  searchChannel,
  select: selectKey,
  selectChannel,
  parse: parseKey,
} as const;
