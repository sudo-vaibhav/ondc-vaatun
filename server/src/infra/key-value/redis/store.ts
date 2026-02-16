import type Redis from "ioredis";
import { logger } from "../../../lib/logger";
import type { Tenant } from "../../../entities/tenant";
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
 * Tenant-scoped Key-Value Store using ioredis.
 *
 * Provides storage, list operations, and Pub/Sub via a single REDIS_URL.
 * All keys are prefixed with tenant ID for isolation.
 */
export class TenantKeyValueStore {
  readonly tenant: Tenant;
  readonly #client: Redis;
  readonly #redisUrl: string;

  /**
   * Factory method to create a TenantKeyValueStore instance.
   */
  static async create(
    tenant: Tenant,
    redisUrl: string,
  ): Promise<TenantKeyValueStore> {
    const client = await getCommandConnection(redisUrl);
    return new TenantKeyValueStore(tenant, client, redisUrl);
  }

  private constructor(tenant: Tenant, client: Redis, redisUrl: string) {
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

    if (options?.ttlMs) {
      const ttlSeconds = Math.ceil(options.ttlMs / 1000);
      await this.#client.setex(fullKey, ttlSeconds, serialized);
    } else {
      await this.#client.set(fullKey, serialized);
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
    const result = await this.#client.keys(fullPattern);
    return result.map((k) => k.replace(this.keyPrefix, ""));
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
    return await this.#client.rpush(fullKey, serialized);
  }

  async listGetAll<T>(key: string): Promise<T[]> {
    const fullKey = this.keyPrefix + key;
    const result = await this.#client.lrange(fullKey, 0, -1);

    return result.map((item) => {
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as unknown as T;
      }
    });
  }

  async listLength(key: string): Promise<number> {
    const fullKey = this.keyPrefix + key;
    return await this.#client.llen(fullKey);
  }

  // ===== Pub/Sub =====

  async publish(channel: string, data: unknown): Promise<number> {
    const fullChannel = this.keyPrefix + channel;
    const serialized = JSON.stringify(data);
    return await this.#client.publish(fullChannel, serialized);
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

      subscriber.subscribe(fullChannel, (err) => {
        if (err) {
          logger.error({ err: err as Error, channel }, "Failed to subscribe to Redis channel");
        }
      });

      subscriber.on("message", (channel: string, message: string) => {
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
            logger.error({ err: error as Error }, "Error in subscriber callback");
          }
        }
      });
    } catch (error) {
      logger.error({ err: error as Error, channel }, "Failed to set up Redis subscription");
    }
  }

  // ===== Utility =====

  async clear(): Promise<void> {
    const pattern = `${this.keyPrefix}*`;
    const keys = await this.#client.keys(pattern);

    if (keys.length > 0) {
      await this.#client.del(...keys);
    }

    logger.info(
      `[KV] Cleared all data for tenant: ${this.tenant.subscriberId}`,
    );
  }

  async getStats(): Promise<{ keyCount: number; subscriberCount: number }> {
    const pattern = `${this.keyPrefix}*`;
    const keys = await this.#client.keys(pattern);
    const keyCount = keys.length;
    const subscriberCount = countSubscribersWithPrefix(this.keyPrefix);

    return { keyCount, subscriberCount };
  }
}
