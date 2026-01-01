import type { RedisClient } from "bun";
import type { Tenant } from "@/entities/tenant";
import {
  countSubscribersWithPrefix,
  getChannelCallbacks,
  getCommandConnection,
  getSubscriberConnection,
  registerChannelCallback,
  unregisterChannelCallback,
} from "./connection-pool";
import type { SubscriberCallback } from "./types";

/**
 * Tenant-scoped Key-Value Store using Bun's native Redis client.
 *
 * Provides storage, list operations, and Pub/Sub via a single REDIS_URL.
 * All keys are prefixed with tenant ID for isolation.
 */
export class TenantKeyValueStore {
  readonly tenant: Tenant;
  readonly #client: RedisClient;
  readonly #redisUrl: string;

  /**
   * Factory method to create a TenantKeyValueStore instance.
   * Reuses existing connections when possible.
   */
  static async create(
    tenant: Tenant,
    redisUrl: string,
  ): Promise<TenantKeyValueStore> {
    const client = await getCommandConnection(redisUrl);
    return new TenantKeyValueStore(tenant, client, redisUrl);
  }

  private constructor(tenant: Tenant, client: RedisClient, redisUrl: string) {
    this.tenant = tenant;
    this.#client = client;
    this.#redisUrl = redisUrl;
  }

  get keyPrefix(): string {
    return `tenant:${this.tenant.subscriberId}:`;
  }

  // ===== Basic Operations =====

  async set<T>(
    key: string,
    value: T,
    options?: { ttlMs?: number },
  ): Promise<void> {
    const fullKey = this.keyPrefix + key;
    const serialized = JSON.stringify(value);

    await this.#client.set(fullKey, serialized);

    if (options?.ttlMs) {
      const ttlSeconds = Math.ceil(options.ttlMs / 1000);
      await this.#client.expire(fullKey, ttlSeconds);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.#client.get(this.keyPrefix + key);
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async del(key: string): Promise<number> {
    return await this.#client.del(this.keyPrefix + key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.#client.exists(this.keyPrefix + key);
    return Boolean(result);
  }

  async keys(pattern: string): Promise<string[]> {
    const fullPattern = this.keyPrefix + pattern;
    const result = await this.#client.send("KEYS", [fullPattern]);

    if (!result || !Array.isArray(result)) {
      return [];
    }

    return result.map((k) => (k as string).replace(this.keyPrefix, ""));
  }

  async setTTL(key: string, ttlMs: number): Promise<boolean> {
    const ttlSeconds = Math.ceil(ttlMs / 1000);
    const result = await this.#client.expire(this.keyPrefix + key, ttlSeconds);
    return Boolean(result);
  }

  async getTTL(key: string): Promise<number | null> {
    const ttlSeconds = await this.#client.ttl(this.keyPrefix + key);
    if (ttlSeconds < 0) return null;
    return ttlSeconds * 1000;
  }

  // ===== List Operations =====

  async listPush<T>(key: string, value: T): Promise<number> {
    const fullKey = this.keyPrefix + key;
    const serialized = JSON.stringify(value);
    const result = await this.#client.send("RPUSH", [fullKey, serialized]);
    return result as number;
  }

  async listGetAll<T>(key: string): Promise<T[]> {
    const fullKey = this.keyPrefix + key;
    const result = await this.#client.send("LRANGE", [fullKey, "0", "-1"]);

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

  async listLength(key: string): Promise<number> {
    const fullKey = this.keyPrefix + key;
    const result = await this.#client.send("LLEN", [fullKey]);
    return (result as number) || 0;
  }

  // ===== Pub/Sub =====

  async publish(channel: string, data: unknown): Promise<number> {
    const fullChannel = this.keyPrefix + channel;
    const serialized = JSON.stringify(data);
    const result = await this.#client.publish(fullChannel, serialized);
    return result as number;
  }

  subscribe(channel: string, callback: SubscriberCallback): () => void {
    const fullChannel = this.keyPrefix + channel;

    registerChannelCallback(fullChannel, callback);
    this.setupSubscription(fullChannel);

    return () => {
      unregisterChannelCallback(fullChannel, callback);
    };
  }

  private async setupSubscription(fullChannel: string): Promise<void> {
    try {
      const subscriber = await getSubscriberConnection(this.#redisUrl);

      await subscriber.subscribe(
        fullChannel,
        (message: string, channel: string) => {
          const callbacks = getChannelCallbacks(channel);
          if (!callbacks) return;

          let parsed: unknown = message;
          try {
            parsed = JSON.parse(message);
          } catch {
            // Keep as string if not valid JSON
          }

          for (const cb of callbacks) {
            try {
              cb(parsed);
            } catch (error) {
              console.error("[KV] Error in subscriber callback:", error);
            }
          }
        },
      );
    } catch (error) {
      console.error("[KV] Failed to set up subscription:", error);
    }
  }

  // ===== Utility =====

  async clear(): Promise<void> {
    const pattern = `${this.keyPrefix}*`;
    const keys = await this.#client.send("KEYS", [pattern]);

    if (keys && Array.isArray(keys) && keys.length > 0) {
      await this.#client.send("DEL", keys as string[]);
    }

    console.log(
      `[KV] Cleared all data for tenant: ${this.tenant.subscriberId}`,
    );
  }

  async getStats(): Promise<{ keyCount: number; subscriberCount: number }> {
    const pattern = `${this.keyPrefix}*`;
    const keys = await this.#client.send("KEYS", [pattern]);
    const keyCount = Array.isArray(keys) ? keys.length : 0;
    const subscriberCount = countSubscribersWithPrefix(this.keyPrefix);

    return { keyCount, subscriberCount };
  }
}
