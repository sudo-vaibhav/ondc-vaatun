/**
 * Tenant Key-Value Store using Bun's native Redis client
 *
 * A multi-tenant key-value store with support for:
 * - TTL/expiration (native Redis EXPIRE)
 * - Pub/Sub for SSE notifications
 * - List operations for appending responses
 * - Tenant isolation via key prefixes
 *
 * All keys are prefixed with: vaatun-ondc:tenant:{tenantId}:
 *
 * @example
 * ```typescript
 * const kv = await TenantKeyValueStore.create(tenantId);
 *
 * // Set with TTL
 * await kv.set("search:txn123", { status: "pending" }, { ttlMs: 300000 });
 *
 * // Append to list
 * await kv.listPush("search:txn123:responses", response);
 *
 * // Subscribe to updates
 * const unsubscribe = await kv.subscribe("search:txn123:updates", (channel, data) => {
 *   console.log("Update received:", data);
 * });
 * ```
 */

import { RedisClient } from "bun";
import type { KVEventCallback, SetOptions, Unsubscribe } from "./types";

// Application prefix for all keys
const APP_PREFIX = "vaatun-ondc";

// Connection cache for reusing Redis connections
const clientCache = new Map<string, RedisClient>();
const subscriberCache = new Map<string, RedisClient>();

// In-memory subscriber tracking (for managing callbacks)
const subscriptionCallbacks = new Map<string, Set<KVEventCallback>>();

/**
 * Get or create a Redis client for the given URL
 */
async function getClient(url?: string): Promise<RedisClient> {
  const redisUrl = url || process.env.REDIS_URL || "redis://localhost:6379";

  if (!clientCache.has(redisUrl)) {
    const client = new RedisClient(redisUrl);
    await client.connect();
    clientCache.set(redisUrl, client);
  }

  return clientCache.get(redisUrl)!;
}

/**
 * Get or create a subscriber client (separate connection for pub/sub)
 */
async function getSubscriberClient(url?: string): Promise<RedisClient> {
  const redisUrl = url || process.env.REDIS_URL || "redis://localhost:6379";
  const cacheKey = `sub:${redisUrl}`;

  if (!subscriberCache.has(cacheKey)) {
    const client = new RedisClient(redisUrl);
    await client.connect();
    subscriberCache.set(cacheKey, client);
  }

  return subscriberCache.get(cacheKey)!;
}

/**
 * Tenant Key-Value Store
 *
 * Provides tenant-isolated key-value storage with TTL, Pub/Sub, and list operations.
 */
export class TenantKeyValueStore {
  private readonly tenantId: string;
  private client: RedisClient | null = null;
  private subscriber: RedisClient | null = null;

  /**
   * Create a new TenantKeyValueStore instance
   */
  private constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Factory method to create a KV store for a tenant
   */
  static create(tenantId: string): TenantKeyValueStore {
    return new TenantKeyValueStore(tenantId);
  }

  /**
   * Ensure client is connected
   */
  private async ensureClient(): Promise<RedisClient> {
    if (!this.client) {
      this.client = await getClient();
    }
    return this.client;
  }

  /**
   * Get the tenant-scoped key prefix
   * Format: vaatun-ondc:tenant:{tenantId}:
   */
  get keyPrefix(): string {
    return `${APP_PREFIX}:tenant:${this.tenantId}:`;
  }

  /**
   * Format a key with tenant prefix
   */
  private formatKey(key: string): string {
    // Don't double-prefix
    if (key.startsWith(this.keyPrefix)) {
      return key;
    }
    return `${this.keyPrefix}${key}`;
  }

  // ============================================
  // Basic Key-Value Operations
  // ============================================

  /**
   * Set a key-value pair with optional TTL
   */
  async set<T>(key: string, value: T, options?: SetOptions): Promise<void> {
    const client = await this.ensureClient();
    const fullKey = this.formatKey(key);
    const serialized = JSON.stringify(value);

    await client.set(fullKey, serialized);

    // Set TTL if specified (convert ms to seconds)
    if (options?.ttlMs) {
      const ttlSeconds = Math.ceil(options.ttlMs / 1000);
      await client.expire(fullKey, ttlSeconds);
    }
  }

  /**
   * Get a value by key
   */
  async get<T>(key: string): Promise<T | null> {
    const client = await this.ensureClient();
    const fullKey = this.formatKey(key);

    const value = await client.get(fullKey);

    if (value === null) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      // Return as string if not valid JSON
      return value as unknown as T;
    }
  }

  /**
   * Delete a key
   */
  async delete(key: string): Promise<boolean> {
    const client = await this.ensureClient();
    const fullKey = this.formatKey(key);
    const result = await client.del(fullKey);
    return result > 0;
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    const client = await this.ensureClient();
    const fullKey = this.formatKey(key);
    return await client.exists(fullKey);
  }

  /**
   * Update TTL for an existing key
   */
  async setTTL(key: string, ttlMs: number): Promise<boolean> {
    const client = await this.ensureClient();
    const fullKey = this.formatKey(key);
    const ttlSeconds = Math.ceil(ttlMs / 1000);

    const result = await client.expire(fullKey, ttlSeconds);
    return Boolean(result);
  }

  /**
   * Get remaining TTL in milliseconds
   */
  async getTTL(key: string): Promise<number | null> {
    const client = await this.ensureClient();
    const fullKey = this.formatKey(key);

    const ttlSeconds = await client.ttl(fullKey);

    if (ttlSeconds < 0) {
      return null; // Key doesn't exist or has no TTL
    }

    return ttlSeconds * 1000;
  }

  // ============================================
  // List Operations
  // ============================================

  /**
   * Push an item to the end of a list (RPUSH)
   */
  async listPush<T>(key: string, value: T): Promise<number> {
    const client = await this.ensureClient();
    const fullKey = this.formatKey(key);
    const serialized = JSON.stringify(value);

    const result = await client.send("RPUSH", [fullKey, serialized]);
    return result as number;
  }

  /**
   * Get all items in a list
   */
  async listGetAll<T>(key: string): Promise<T[]> {
    const client = await this.ensureClient();
    const fullKey = this.formatKey(key);

    const result = await client.send("LRANGE", [fullKey, "0", "-1"]);

    if (!result || !Array.isArray(result)) {
      return [];
    }

    return result.map((item) => {
      try {
        return JSON.parse(item as string) as T;
      } catch {
        return item as unknown as T;
      }
    });
  }

  /**
   * Get list length
   */
  async listLength(key: string): Promise<number> {
    const client = await this.ensureClient();
    const fullKey = this.formatKey(key);

    const result = await client.send("LLEN", [fullKey]);
    return (result as number) || 0;
  }

  /**
   * Get items from a list by range
   */
  async listRange<T>(key: string, start: number, end: number): Promise<T[]> {
    const client = await this.ensureClient();
    const fullKey = this.formatKey(key);

    const result = await client.send("LRANGE", [
      fullKey,
      start.toString(),
      end.toString(),
    ]);

    if (!result || !Array.isArray(result)) {
      return [];
    }

    return result.map((item) => {
      try {
        return JSON.parse(item as string) as T;
      } catch {
        return item as unknown as T;
      }
    });
  }

  // ============================================
  // Pub/Sub Operations
  // ============================================

  /**
   * Subscribe to a channel for updates
   */
  subscribe<T = unknown>(
    channel: string,
    callback: KVEventCallback<T>,
  ): Unsubscribe {
    const fullChannel = this.formatKey(channel);

    // Track callback locally
    if (!subscriptionCallbacks.has(fullChannel)) {
      subscriptionCallbacks.set(fullChannel, new Set());
    }
    subscriptionCallbacks.get(fullChannel)!.add(callback as KVEventCallback);

    // Set up Redis subscription (async, but we return sync unsubscribe)
    this.setupSubscription(fullChannel);

    // Return unsubscribe function
    return () => {
      const callbacks = subscriptionCallbacks.get(fullChannel);
      if (callbacks) {
        callbacks.delete(callback as KVEventCallback);
        if (callbacks.size === 0) {
          subscriptionCallbacks.delete(fullChannel);
        }
      }
    };
  }

  /**
   * Set up Redis subscription for a channel
   */
  private async setupSubscription(fullChannel: string): Promise<void> {
    try {
      const subscriber = await getSubscriberClient();

      // Subscribe to the channel
      await subscriber.subscribe(fullChannel, (message, channel) => {
        const callbacks = subscriptionCallbacks.get(channel);
        if (callbacks) {
          let parsed: unknown = message;
          try {
            parsed = JSON.parse(message);
          } catch {
            // Keep as string
          }

          for (const callback of callbacks) {
            try {
              // Pass the channel without prefix for cleaner API
              const cleanChannel = channel.replace(this.keyPrefix, "");
              callback(cleanChannel, parsed);
            } catch (error) {
              console.error("[KV] Error in subscriber callback:", error);
            }
          }
        }
      });
    } catch (error) {
      console.error("[KV] Failed to set up subscription:", error);
    }
  }

  /**
   * Publish a message to a channel
   */
  async publish<T>(channel: string, data: T): Promise<number> {
    const client = await this.ensureClient();
    const fullChannel = this.formatKey(channel);
    const serialized = JSON.stringify(data);

    const result = await client.publish(fullChannel, serialized);
    return result as number;
  }

  /**
   * Get count of subscribers for a channel (local only)
   */
  getSubscriberCount(channel: string): number {
    const fullChannel = this.formatKey(channel);
    return subscriptionCallbacks.get(fullChannel)?.size ?? 0;
  }

  // ============================================
  // Scan/Search Operations
  // ============================================

  /**
   * Find all keys matching a pattern (glob-style)
   *
   * @param pattern - Pattern to match (e.g., "search:*")
   */
  async keys(pattern: string): Promise<string[]> {
    const client = await this.ensureClient();
    const fullPattern = this.formatKey(pattern);

    const result = await client.send("KEYS", [fullPattern]);

    if (!result || !Array.isArray(result)) {
      return [];
    }

    // Return without tenant prefix
    return result.map((key) => (key as string).replace(this.keyPrefix, ""));
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Clear all data for this tenant
   * WARNING: This deletes all keys matching the tenant prefix
   */
  async clear(): Promise<void> {
    const client = await this.ensureClient();
    const pattern = `${this.keyPrefix}*`;

    const keys = await client.send("KEYS", [pattern]);

    if (keys && Array.isArray(keys) && keys.length > 0) {
      await client.send("DEL", keys as string[]);
    }

    console.log(`[KV] Cleared all data for tenant: ${this.tenantId}`);
  }

  /**
   * Get stats for this tenant's data
   */
  async getStats(): Promise<{
    keyCount: number;
    subscriberCount: number;
  }> {
    const client = await this.ensureClient();
    const pattern = `${this.keyPrefix}*`;

    const keys = await client.send("KEYS", [pattern]);
    const keyCount = Array.isArray(keys) ? keys.length : 0;

    let subscriberCount = 0;
    for (const [channel, subs] of subscriptionCallbacks.entries()) {
      if (channel.startsWith(this.keyPrefix)) {
        subscriberCount += subs.size;
      }
    }

    return { keyCount, subscriberCount };
  }
}

// Re-export key formatter and types
export { keyFormatter } from "./key-formatter";
export * from "./types";
