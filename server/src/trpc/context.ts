import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { Tenant } from "../entities/tenant";
import { TenantKeyValueStore } from "../infra/key-value/redis";
import { ONDCClient } from "../lib/ondc/client";

export interface Context {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  tenant: Tenant;
  ondcClient: ONDCClient;
  kv: TenantKeyValueStore;
}

let cachedContext: {
  tenant: Tenant;
  ondcClient: ONDCClient;
  kv: TenantKeyValueStore;
} | null = null;

export async function createContext({
  req,
  res,
}: CreateExpressContextOptions): Promise<Context> {
  // Reuse singleton tenant and KV store for performance
  if (!cachedContext) {
    const tenant = Tenant.getInstance();
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      throw new Error("REDIS_URL environment variable is required");
    }

    const kv = await TenantKeyValueStore.create(tenant, redisUrl);
    const ondcClient = new ONDCClient(tenant);

    cachedContext = { tenant, ondcClient, kv };
  }

  return {
    req,
    res,
    ...cachedContext,
  };
}
