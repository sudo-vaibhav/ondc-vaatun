#!/usr/bin/env -S npx tsx
/**
 * Get callback responses for a transaction.
 *
 * Usage:
 *   npx tsx scripts/get-responses.ts --type search --txn <transactionId>
 *
 * For search: reads the responses list at search:<txn>:responses
 * For select/init/confirm: reads the response field from the entry itself
 */
import { KEY_PREFIX, withRedis } from "./redis-helper.js";

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const entryType = getArg("type") || "search";
const txn = getArg("txn");
const msg = getArg("msg");

if (!txn) {
  console.error("--txn <transactionId> is required");
  process.exit(1);
}

withRedis(async (client) => {
  if (entryType === "search") {
    // Search responses are stored in a list
    const responsesKey = `${KEY_PREFIX}search:${txn}:responses`;
    const items = await client.lrange(responsesKey, 0, -1);

    if (items.length === 0) {
      console.log(`No search responses found for txn: ${txn}`);

      // Check if entry exists
      const entryKey = `${KEY_PREFIX}search:${txn}`;
      const entry = await client.get(entryKey);
      if (entry) {
        console.log("\nSearch entry exists:");
        try {
          console.log(JSON.stringify(JSON.parse(entry), null, 2));
        } catch {
          console.log(entry);
        }
      } else {
        console.log("Search entry also not found.");
      }
      return;
    }

    console.log(`Found ${items.length} search response(s) for txn: ${txn}\n`);
    for (let i = 0; i < items.length; i++) {
      console.log(`--- Response [${i}] ---`);
      try {
        const parsed = JSON.parse(items[i]);
        // Show summary first
        const bppId = parsed.context?.bpp_id || "unknown";
        const hasError = !!parsed.error;
        const providerCount = parsed.message?.catalog?.providers?.length || 0;
        console.log(
          `BPP: ${bppId} | Error: ${hasError} | Providers: ${providerCount}`,
        );
        console.log(JSON.stringify(parsed, null, 2));
      } catch {
        console.log(items[i]);
      }
      console.log();
    }
  } else {
    // select/init/confirm store response inline
    let key: string;
    if (!msg) {
      console.error("--msg <messageId> required for select/init/confirm");
      process.exit(1);
    }
    key = `${KEY_PREFIX}${entryType}:${txn}:${msg}`;

    const val = await client.get(key);
    if (!val) {
      console.log(`No entry found for ${entryType} txn:${txn} msg:${msg}`);
      return;
    }

    try {
      const parsed = JSON.parse(val);
      console.log(`${entryType} entry for txn:${txn} msg:${msg}:\n`);
      console.log(JSON.stringify(parsed, null, 2));

      // Highlight key fields
      if (parsed.traceparent) {
        console.log(`\nTraceparent: ${parsed.traceparent}`);
      }
      if (parsed.response) {
        console.log("\n--- Callback Response ---");
        console.log(JSON.stringify(parsed.response, null, 2));
      } else {
        console.log("\nNo callback response received yet.");
      }
    } catch {
      console.log(val);
    }
  }
});
