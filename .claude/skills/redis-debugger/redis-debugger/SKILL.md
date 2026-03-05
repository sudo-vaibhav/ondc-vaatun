---
name: redis-debugger
description: Inspect Redis data stored by the ONDC BAP application for debugging. Use when investigating transaction state (search, select, init, confirm, status entries), checking stored traceparent values for OTel trace correlation, verifying callback responses arrived, or understanding why a transaction is stuck. Complements the otel-debugger skill by showing the application's Redis-side state.
---

# Redis Debugger

Inspect tenant-scoped Redis data from the ONDC BAP app. All scripts read `REDIS_URL` and `SUBSCRIBER_ID` from the project `.env` file automatically.

## Prerequisites

- Dev server `.env` must have `REDIS_URL` and `SUBSCRIBER_ID` set
- Scripts must be run via `npx tsx` from the `server/` directory

## Scripts

All scripts are in this skill's `scripts/` directory. Run from `server/`:

```bash
cd server
npx tsx ../.claude/skills/redis-debugger/redis-debugger/scripts/<script>.ts [args]
```

### list-keys.ts
List all tenant-scoped keys, optionally filtered by store type.

```bash
npx tsx <path>/list-keys.ts                      # all keys
npx tsx <path>/list-keys.ts --prefix search      # only search keys
npx tsx <path>/list-keys.ts --prefix init         # only init keys
npx tsx <path>/list-keys.ts --full                # show full key (with tenant prefix)
```

### get-entry.ts
Get a specific store entry by type and IDs.

```bash
npx tsx <path>/get-entry.ts --type search --txn <transactionId>
npx tsx <path>/get-entry.ts --type select --txn <transactionId> --msg <messageId>
npx tsx <path>/get-entry.ts --type init --txn <transactionId> --msg <messageId>
npx tsx <path>/get-entry.ts --type confirm --txn <transactionId> --msg <messageId>
npx tsx <path>/get-entry.ts --type status --order <orderId>
npx tsx <path>/get-entry.ts --key <raw-key>       # arbitrary key (without tenant prefix)
```

### get-responses.ts
Get callback responses for a transaction.

```bash
npx tsx <path>/get-responses.ts --type search --txn <transactionId>
npx tsx <path>/get-responses.ts --type select --txn <transactionId> --msg <messageId>
```

### inspect-txn.ts
Find and display ALL Redis data for a transaction ID across all store types. Best for quick overview.

```bash
npx tsx <path>/inspect-txn.ts <transactionId>
```

Shows: entry metadata, traceparent values, whether callbacks arrived, response summaries.

## Debugging Workflows

### "Transaction stuck" investigation
1. Run `inspect-txn.ts <txnId>` to see all state
2. Check if the entry has `hasResponse: false` — callback never arrived
3. Extract `traceparent` and use otel-debugger's `get-trace.sh` with the traceId portion to see the outbound request trace

### Verify trace linking
1. Run `get-entry.ts` for the outbound request (search/select/init)
2. Note the `traceparent` value (format: `00-{traceId}-{spanId}-{flags}`)
3. Use otel-debugger to fetch the callback trace and verify its References/Links point back to this traceId+spanId

### Check callback data
1. For search: `get-responses.ts --type search --txn <txnId>` shows all on_search responses
2. For select/init/confirm: `get-entry.ts` shows the entry; the `:response` sibling key holds callback data

## Data Model

See `references/data-model.md` for full key patterns, entry schemas, and traceparent format.
