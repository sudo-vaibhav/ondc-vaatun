# Tech Debt: Redis KEYS Command Performance Issue

**Priority**: High
**Category**: Performance
**Effort**: Low

## Problem

The Redis store uses the `KEYS` command for pattern matching, which is O(N) and blocks the Redis server during execution. This will cause latency spikes in production with many active transactions.

## Affected Files

- `src/infra/key-value/redis/store.ts` (line 85)

## Current Behavior

```typescript
// redis/store.ts:85
async keys(pattern: string): Promise<string[]> {
  const fullPattern = this.#getKey(pattern);
  const result = await this.#client.send("KEYS", [fullPattern]);
  // ...
}
```

## Why This Is a Problem

From Redis documentation:

> **Warning**: Consider KEYS as a command that should only be used in production environments with extreme care. It may ruin performance when executed against large databases.

- `KEYS` scans the entire keyspace
- Blocks Redis during execution (single-threaded)
- With 10,000+ transactions, this causes noticeable latency
- All other Redis operations queue behind it

## Proposed Solution

Replace `KEYS` with `SCAN` which is non-blocking and cursor-based:

```typescript
async keys(pattern: string): Promise<string[]> {
  const fullPattern = this.#getKey(pattern);
  const keys: string[] = [];
  let cursor = "0";

  do {
    const [newCursor, batch] = await this.#client.send("SCAN", [
      cursor,
      "MATCH", fullPattern,
      "COUNT", "100"
    ]);
    cursor = newCursor;
    keys.push(...batch);
  } while (cursor !== "0");

  return keys.map(k => this.#stripPrefix(k));
}
```

## Alternative: Maintain an Index

For frequently accessed patterns, maintain a Redis SET of keys:

```typescript
// On set()
await this.#client.send("SADD", [`${prefix}:index`, key]);

// On keys()
await this.#client.send("SMEMBERS", [`${prefix}:index`]);

// On delete()
await this.#client.send("SREM", [`${prefix}:index`, key]);
```

## Performance Impact

| Approach | 1K keys | 10K keys | 100K keys |
|----------|---------|----------|-----------|
| KEYS | 1ms | 10ms | 100ms+ (blocks) |
| SCAN | 10ms | 50ms | 200ms (non-blocking) |
| Index SET | <1ms | <1ms | <1ms |

## Acceptance Criteria

- [ ] Replace KEYS with SCAN in `redis/store.ts`
- [ ] Add COUNT parameter for batch size control
- [ ] Verify no blocking during key enumeration
- [ ] Load test with 10K+ keys to confirm improvement
