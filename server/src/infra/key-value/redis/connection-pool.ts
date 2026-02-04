import Redis from "ioredis";
import type { SubscriberCallback } from "./types";

/**
 * Connection pools for Redis clients using ioredis.
 *
 * Redis requires separate connections for Pub/Sub vs regular commands because:
 * - A client in "subscriber mode" (after SUBSCRIBE) can ONLY receive messages
 * - It cannot execute regular commands (GET, SET, KEYS, etc.)
 */
const commandConnectionPool = new Map<string, Redis>();
const subscriberConnectionPool = new Map<string, Redis>();

/**
 * In-memory tracking of active subscription callbacks per channel.
 */
const channelCallbacks = new Map<string, Set<SubscriberCallback>>();

/**
 * Get or create a command connection for the given Redis URL.
 */
export async function getCommandConnection(redisUrl: string): Promise<Redis> {
  const existing = commandConnectionPool.get(redisUrl);
  if (existing) return existing;

  const client = new Redis(redisUrl);
  commandConnectionPool.set(redisUrl, client);
  return client;
}

/**
 * Get or create a subscriber connection for the given Redis URL.
 */
export async function getSubscriberConnection(
  redisUrl: string,
): Promise<Redis> {
  const existing = subscriberConnectionPool.get(redisUrl);
  if (existing) return existing;

  const subscriber = new Redis(redisUrl);
  subscriberConnectionPool.set(redisUrl, subscriber);
  return subscriber;
}

/**
 * Register a callback for a channel.
 */
export function registerChannelCallback(
  channel: string,
  callback: SubscriberCallback,
): void {
  const existing = channelCallbacks.get(channel);
  if (existing) {
    existing.add(callback);
  } else {
    channelCallbacks.set(channel, new Set([callback]));
  }
}

/**
 * Unregister a callback for a channel.
 */
export function unregisterChannelCallback(
  channel: string,
  callback: SubscriberCallback,
): boolean {
  const callbacks = channelCallbacks.get(channel);
  if (!callbacks) return true;

  callbacks.delete(callback);
  if (callbacks.size === 0) {
    channelCallbacks.delete(channel);
    return true;
  }
  return false;
}

/**
 * Get all callbacks for a channel.
 */
export function getChannelCallbacks(
  channel: string,
): Set<SubscriberCallback> | undefined {
  return channelCallbacks.get(channel);
}

/**
 * Count subscribers for channels matching a prefix.
 */
export function countSubscribersWithPrefix(prefix: string): number {
  let count = 0;
  for (const [channel, subs] of channelCallbacks.entries()) {
    if (channel.startsWith(prefix)) {
      count += subs.size;
    }
  }
  return count;
}
