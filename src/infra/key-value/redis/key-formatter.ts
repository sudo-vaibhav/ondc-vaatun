/**
 * Key formatter utilities for tenant-scoped key-value store
 *
 * Key structure: {prefix}:{identifier}
 * (Tenant prefix is added automatically by TenantKeyValueStore)
 */

const KEY_PREFIXES = {
  SEARCH: "search",
  SELECT: "select",
} as const;

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
 * Key formatter object for convenient access
 */
export const keyFormatter = {
  search: searchKey,
  searchResponses: searchResponsesKey,
  searchChannel,
  select: selectKey,
  selectChannel,
} as const;
