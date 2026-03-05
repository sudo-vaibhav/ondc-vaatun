#!/usr/bin/env -S npx tsx
/**
 * Get a specific store entry by type and IDs.
 *
 * Usage:
 *   npx tsx scripts/get-entry.ts --type search --txn <transactionId>
 *   npx tsx scripts/get-entry.ts --type select --txn <transactionId> --msg <messageId>
 *   npx tsx scripts/get-entry.ts --type init --txn <transactionId> --msg <messageId>
 *   npx tsx scripts/get-entry.ts --type confirm --txn <transactionId> --msg <messageId>
 *   npx tsx scripts/get-entry.ts --type status --order <orderId>
 *   npx tsx scripts/get-entry.ts --key <raw-key>  (without tenant prefix)
 */
import { KEY_PREFIX, withRedis } from "./redis-helper.js";

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const entryType = getArg("type");
const txn = getArg("txn");
const msg = getArg("msg");
const orderId = getArg("order");
const rawKey = getArg("key");

function buildKey(): string {
  if (rawKey) return rawKey;
  if (!entryType) {
    console.error(
      "Provide --type (search|select|init|confirm|status) or --key <raw-key>",
    );
    process.exit(1);
  }
  switch (entryType) {
    case "search":
      if (!txn) {
        console.error("--txn required for search");
        process.exit(1);
      }
      return `search:${txn}`;
    case "select":
      if (!txn || !msg) {
        console.error("--txn and --msg required for select");
        process.exit(1);
      }
      return `select:${txn}:${msg}`;
    case "init":
      if (!txn || !msg) {
        console.error("--txn and --msg required for init");
        process.exit(1);
      }
      return `init:${txn}:${msg}`;
    case "confirm":
      if (!txn || !msg) {
        console.error("--txn and --msg required for confirm");
        process.exit(1);
      }
      return `confirm:${txn}:${msg}`;
    case "status":
      if (!orderId) {
        console.error("--order required for status");
        process.exit(1);
      }
      return `status:${orderId}`;
    default:
      console.error(`Unknown type: ${entryType}`);
      process.exit(1);
  }
}

withRedis(async (client) => {
  const key = buildKey();
  const fullKey = `${KEY_PREFIX}${key}`;

  const type = await client.type(fullKey);
  if (type === "none") {
    console.log(`Key not found: ${key}`);
    return;
  }

  console.log(`Key: ${key}`);
  console.log(`Type: ${type}`);

  const ttl = await client.ttl(fullKey);
  console.log(
    `TTL: ${ttl === -1 ? "no expiry" : ttl === -2 ? "expired" : `${ttl}s`}`,
  );
  console.log("---");

  if (type === "string") {
    const val = await client.get(fullKey);
    if (val) {
      try {
        console.log(JSON.stringify(JSON.parse(val), null, 2));
      } catch {
        console.log(val);
      }
    }
  } else if (type === "list") {
    const items = await client.lrange(fullKey, 0, -1);
    console.log(`List length: ${items.length}`);
    for (let i = 0; i < items.length; i++) {
      console.log(`\n--- [${i}] ---`);
      try {
        console.log(JSON.stringify(JSON.parse(items[i]), null, 2));
      } catch {
        console.log(items[i]);
      }
    }
  } else {
    console.log(`(unsupported type: ${type})`);
  }
});
