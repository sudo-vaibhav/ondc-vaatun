#!/usr/bin/env -S npx tsx
/**
 * Inspect all Redis data for a given transaction ID.
 * Finds all keys related to the transaction across all store types.
 *
 * Usage:
 *   npx tsx scripts/inspect-txn.ts <transactionId>
 */
import { KEY_PREFIX, withRedis } from "./redis-helper.js";

const txn = process.argv[2];
if (!txn) {
  console.error("Usage: npx tsx scripts/inspect-txn.ts <transactionId>");
  process.exit(1);
}

withRedis(async (client) => {
  const pattern = `${KEY_PREFIX}*${txn}*`;
  const keys = await client.keys(pattern);
  keys.sort();

  if (keys.length === 0) {
    console.log(`No keys found for transaction: ${txn}`);
    return;
  }

  console.log(`Found ${keys.length} key(s) for transaction: ${txn}\n`);

  for (const fullKey of keys) {
    const shortKey = fullKey.replace(KEY_PREFIX, "");
    const type = await client.type(fullKey);
    const ttl = await client.ttl(fullKey);
    const ttlStr =
      ttl === -1 ? "no expiry" : ttl === -2 ? "expired" : `${ttl}s`;

    console.log(`=== ${shortKey} [${type}] TTL: ${ttlStr} ===`);

    if (type === "string") {
      const val = await client.get(fullKey);
      if (val) {
        try {
          const parsed = JSON.parse(val);
          // Highlight traceparent if present
          if (parsed.traceparent) {
            console.log(`  traceparent: ${parsed.traceparent}`);
          }
          // Show key fields based on entry type
          if (parsed.transactionId)
            console.log(`  transactionId: ${parsed.transactionId}`);
          if (parsed.messageId) console.log(`  messageId: ${parsed.messageId}`);
          if (parsed.bppId) console.log(`  bppId: ${parsed.bppId}`);
          if (parsed.createdAt)
            console.log(
              `  createdAt: ${new Date(parsed.createdAt).toISOString()}`,
            );
          if (parsed.response) console.log(`  hasResponse: true`);
          else if (
            shortKey.includes("init:") ||
            shortKey.includes("select:") ||
            shortKey.includes("confirm:")
          ) {
            console.log(`  hasResponse: false (callback not received)`);
          }
          console.log(`  Full data: ${JSON.stringify(parsed, null, 2)}`);
        } catch {
          console.log(`  ${val}`);
        }
      }
    } else if (type === "list") {
      const len = await client.llen(fullKey);
      console.log(`  List length: ${len}`);
      const items = await client.lrange(fullKey, 0, -1);
      for (let i = 0; i < items.length; i++) {
        try {
          const parsed = JSON.parse(items[i]);
          const bppId = parsed.context?.bpp_id || "";
          const hasError = !!parsed.error;
          console.log(`  [${i}] bpp: ${bppId} error: ${hasError}`);
        } catch {
          console.log(`  [${i}] ${items[i].slice(0, 100)}...`);
        }
      }
    }
    console.log();
  }
});
