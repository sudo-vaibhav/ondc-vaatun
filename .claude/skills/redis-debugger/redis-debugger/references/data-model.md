# Redis Data Model Reference

## Key Prefix

All keys are prefixed with `tenant:{SUBSCRIBER_ID}:` (e.g., `tenant:moved-starfish-rapid.ngrok-free.app:`).

## Store Types and Key Patterns

### Search
| Key | Type | Description |
|-----|------|-------------|
| `search:{txnId}` | string (JSON) | Search entry metadata |
| `search:{txnId}:responses` | list (JSON items) | on_search callback responses |
| `search:{txnId}:updates` | pub/sub channel | Real-time update notifications |

**SearchEntry fields**: `transactionId`, `messageId`, `searchTimestamp`, `categoryCode`, `createdAt`, `ttlMs`, `ttlExpiresAt`, `traceparent?`

### Select
| Key | Type | Description |
|-----|------|-------------|
| `select:{txnId}:{msgId}` | string (JSON) | Select entry metadata |
| `select:{txnId}:{msgId}:response` | string (JSON) | on_select callback response |
| `select:{txnId}:{msgId}:updates` | pub/sub channel | Update notifications |

**SelectEntry fields**: `transactionId`, `messageId`, `itemId`, `providerId`, `bppId`, `bppUri`, `selectTimestamp`, `createdAt`, `traceparent?`

### Init
| Key | Type | Description |
|-----|------|-------------|
| `init:{txnId}:{msgId}` | string (JSON) | Init entry metadata |
| `init:{txnId}:{msgId}:response` | string (JSON) | on_init callback response |
| `init:{txnId}:{msgId}:updates` | pub/sub channel | Update notifications |

**InitEntry fields**: `transactionId`, `messageId`, `itemId`, `providerId`, `bppId`, `bppUri`, `initTimestamp`, `createdAt`, `traceparent?`

### Confirm
| Key | Type | Description |
|-----|------|-------------|
| `confirm:{txnId}:{msgId}` | string (JSON) | Confirm entry metadata |
| `confirm:{txnId}:{msgId}:response` | string (JSON) | on_confirm callback response |
| `confirm:{txnId}:{msgId}:updates` | pub/sub channel | Update notifications |

**ConfirmEntry fields**: `transactionId`, `messageId`, `orderId?`, `itemId`, `providerId`, `bppId`, `bppUri`, `quoteId`, `amount`, `confirmTimestamp`, `createdAt`, `traceparent?`

### Status
| Key | Type | Description |
|-----|------|-------------|
| `status:{orderId}` | string (JSON) | Status entry |
| `status:{orderId}:updates` | pub/sub channel | Update notifications |

**StatusEntry fields**: `orderId`, `transactionId`, `bppId`, `bppUri`, `statusTimestamp`, `createdAt`, `traceparent?`

## Traceparent Format

W3C trace context: `00-{traceId}-{spanId}-{flags}`

Example: `00-9e59cf71868201f4875b453fcedde39e-a591efff73176bb9-01`
- `9e59cf71868201f4875b453fcedde39e` = traceId (use with otel-debugger's get-trace.sh)
- `a591efff73176bb9` = spanId of the originating request
- `01` = sampled flag
