import { RedisClient } from "bun";
import type { SubscriberCallback } from "./types";

/**
 * Connection pools for Redis clients.
 *
 * Redis requires separate connections for Pub/Sub vs regular commands because:
 * - A client in "subscriber mode" (after SUBSCRIBE) can ONLY receive messages
 * - It cannot execute regular commands (GET, SET, KEYS, etc.)
 *
 * Therefore we maintain two connection pools:
 * - `commandConnectionPool`: For regular Redis operations (GET, SET, DEL, PUBLISH, etc.)
 * - `subscriberConnectionPool`: Dedicated connections blocked on SUBSCRIBE for Pub/Sub
 *
 * Both pools are keyed by Redis URL to reuse connections across requests in serverless.
 */
const commandConnectionPool = new Map<string, RedisClient>();
const subscriberConnectionPool = new Map<string, RedisClient>();

/**
 * In-memory tracking of active subscription callbacks per channel.
 * Maps full channel names to sets of callback functions.
 */
const channelCallbacks = new Map<string, Set<SubscriberCallback>>();

/**
 * Get or create a command connection for the given Redis URL.
 */
export async function getCommandConnection(
  redisUrl: string,
): Promise<RedisClient> {
  const existing = commandConnectionPool.get(redisUrl);
  if (existing) return existing;

  const client = new RedisClient(redisUrl);
  await client.connect();
  commandConnectionPool.set(redisUrl, client);
  return client;
}

/**
 * Get or create a subscriber connection for the given Redis URL.
 */
export async function getSubscriberConnection(
  redisUrl: string,
): Promise<RedisClient> {
  const existing = subscriberConnectionPool.get(redisUrl);
  if (existing) return existing;

  const subscriber = new RedisClient(redisUrl);
  await subscriber.connect();
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
 * Returns true if the channel has no more callbacks.
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
