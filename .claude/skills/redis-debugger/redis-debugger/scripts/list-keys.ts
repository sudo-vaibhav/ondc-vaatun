#!/usr/bin/env -S npx tsx
/**
 * List all tenant-scoped Redis keys, optionally filtered by prefix.
 *
 * Usage:
 *   npx tsx scripts/list-keys.ts [--prefix search|select|init|confirm|status] [--full]
 */
import { KEY_PREFIX, withRedis } from "./redis-helper.js";

const args = process.argv.slice(2);
const prefixIdx = args.indexOf("--prefix");
const filterPrefix = prefixIdx !== -1 ? args[prefixIdx + 1] : undefined;
const showFull = args.includes("--full");

withRedis(async (client) => {
  const pattern = filterPrefix
    ? `${KEY_PREFIX}${filterPrefix}:*`
    : `${KEY_PREFIX}*`;

  const keys = await client.keys(pattern);
  keys.sort();

  if (keys.length === 0) {
    console.log(`No keys found matching: ${pattern}`);
    return;
  }

  console.log(`Found ${keys.length} keys matching: ${pattern}\n`);

  for (const key of keys) {
    const shortKey = key.replace(KEY_PREFIX, "");
    const ttl = await client.ttl(key);
    const type = await client.type(key);
    const ttlStr =
      ttl === -1 ? "no expiry" : ttl === -2 ? "expired" : `${ttl}s`;

    if (showFull) {
      console.log(`${key}  [${type}] TTL: ${ttlStr}`);
    } else {
      console.log(`${shortKey}  [${type}] TTL: ${ttlStr}`);
    }
  }
});
