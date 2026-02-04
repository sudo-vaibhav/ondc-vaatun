/**
 * Key formatter utilities for tenant-scoped key-value store
 *
 * Key structure: {prefix}:{identifier}
 * (Tenant prefix is added automatically by TenantKeyValueStore)
 */

const KEY_PREFIXES = {
  SEARCH: "search",
  SELECT: "select",
  INIT: "init",
  CONFIRM: "confirm",
  STATUS: "status",
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
 * Format an init entry key
 */
export function initKey(transactionId: string, messageId: string): string {
  return `${KEY_PREFIXES.INIT}:${transactionId}:${messageId}`;
}

/**
 * Format an init Pub/Sub channel
 */
export function initChannel(
  transactionId: string,
  messageId: string,
): string {
  return `${KEY_PREFIXES.INIT}:${transactionId}:${messageId}:updates`;
}

/**
 * Format a confirm entry key
 */
export function confirmKey(transactionId: string, messageId: string): string {
  return `${KEY_PREFIXES.CONFIRM}:${transactionId}:${messageId}`;
}

/**
 * Format a confirm Pub/Sub channel
 */
export function confirmChannel(
  transactionId: string,
  messageId: string,
): string {
  return `${KEY_PREFIXES.CONFIRM}:${transactionId}:${messageId}:updates`;
}

/**
 * Format a status entry key (keyed by orderId only)
 */
export function statusKey(orderId: string): string {
  return `${KEY_PREFIXES.STATUS}:${orderId}`;
}

/**
 * Format a status Pub/Sub channel (keyed by orderId only)
 */
export function statusChannel(orderId: string): string {
  return `${KEY_PREFIXES.STATUS}:${orderId}:updates`;
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
  init: initKey,
  initChannel,
  confirm: confirmKey,
  confirmChannel,
  status: statusKey,
  statusChannel,
} as const;
