# Tenant Architecture

## Overview

The Tenant entity (`src/entities/tenant.ts`) is the centralized system for managing ONDC credentials and cryptographic operations. It replaces direct environment variable access and provides a clean, type-safe interface for all ONDC integration points.

## Design Principles

### 1. **Singleton Pattern**
- Single instance throughout application lifecycle
- Prevents redundant cryptographic computations
- Ensures consistent configuration across all requests

### 2. **Encapsulation**
- Private credentials never exposed directly
- All sensitive operations encapsulated within the class
- Public API provides safe, validated access

### 3. **Security**
- Credentials loaded only once at initialization
- Shared secrets pre-computed for performance
- Private keys stored as class private fields

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Environment Variables               │
│  • SUBSCRIBER_ID                                     │
│  • STATIC_SUBSCRIBE_REQUEST_ID                       │
│  • ENCRYPTION_PRIVATE_KEY                            │
│  • ONDC_PUBLIC_KEY                                   │
│  • SIGNING_PRIVATE_KEY                               │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ Loaded once at startup
                   ▼
┌─────────────────────────────────────────────────────┐
│              Tenant (Singleton)                      │
│                                                      │
│  Private Fields:                                     │
│  • encryptionPrivateKey                              │
│  • ondcPublicKey                                     │
│  • signingPrivateKey                                 │
│  • sharedSecret (pre-computed)                       │
│                                                      │
│  Public Interface:                                   │
│  • decryptChallenge(challenge)                       │
│  • signMessage(message)                              │
│  • signSubscribeRequestId()                          │
│  • validate()                                        │
│  • getInfo()                                         │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ Used by
                   ▼
┌─────────────────────────────────────────────────────┐
│              API Routes                              │
│  • POST /api/ondc/on_subscribe                       │
│  • GET  /ondc-site-verification.html                 │
│  • GET  /api/ondc/health                             │
└─────────────────────────────────────────────────────┘
```

## Usage

### Basic Usage

```typescript
import { getTenant } from '@/entities/tenant';

// Get tenant instance
const tenant = getTenant();

// Decrypt ONDC challenge
const answer = tenant.decryptChallenge(encryptedChallenge);

// Sign a message
const signature = await tenant.signMessage(message);

// Sign subscribe request ID for domain verification
const verificationSignature = await tenant.signSubscribeRequestId();
```

### In API Routes

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getTenant } from '@/entities/tenant';

export async function POST(request: NextRequest) {
  try {
    const tenant = getTenant();
    const body = await request.json();

    // Use tenant for operations
    const answer = tenant.decryptChallenge(body.challenge);

    return NextResponse.json({ answer });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Health Checks

```typescript
const tenant = getTenant();
const validation = tenant.validate();

if (!validation.valid) {
  console.error('Tenant validation failed:', validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn('Tenant warnings:', validation.warnings);
}
```

## API Reference

### `Tenant.getInstance(): Tenant`

Get singleton instance of Tenant. Creates instance on first call, returns existing instance on subsequent calls.

**Returns**: `Tenant` instance

**Example**:
```typescript
const tenant = Tenant.getInstance();
```

### `getTenant(): Tenant`

Helper function to get tenant instance. Equivalent to `Tenant.getInstance()`.

**Returns**: `Tenant` instance

**Example**:
```typescript
const tenant = getTenant();
```

### `tenant.decryptChallenge(encryptedChallenge: string): string`

Decrypt ONDC challenge using AES-256-ECB with pre-computed shared secret.

**Parameters**:
- `encryptedChallenge` - Base64 encoded encrypted challenge from ONDC

**Returns**: Decrypted plaintext challenge

**Throws**: Error if decryption fails

**Example**:
```typescript
const answer = tenant.decryptChallenge('base64_encrypted_string');
```

### `tenant.signMessage(message: string): Promise<string>`

Sign a message using Ed25519 (libsodium).

**Parameters**:
- `message` - Message to sign

**Returns**: Promise resolving to base64 encoded signature

**Throws**: Error if signing fails

**Example**:
```typescript
const signature = await tenant.signMessage('Hello, ONDC!');
```

### `tenant.signSubscribeRequestId(): Promise<string>`

Sign the subscribe request ID for domain verification.

**Returns**: Promise resolving to base64 encoded signature of STATIC_SUBSCRIBE_REQUEST_ID

**Example**:
```typescript
const verificationSignature = await tenant.signSubscribeRequestId();
```

### `tenant.validate(): { valid: boolean; errors: string[]; warnings: string[] }`

Validate tenant configuration and credentials.

**Returns**: Validation result object containing:
- `valid` - `true` if no errors, `false` otherwise
- `errors` - Array of error messages (critical issues)
- `warnings` - Array of warning messages (non-critical issues)

**Example**:
```typescript
const validation = tenant.validate();

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn('Validation warnings:', validation.warnings);
}
```

### `tenant.getInfo(): TenantInfo`

Get safe tenant information (excludes sensitive credentials).

**Returns**: Object containing:
- `subscriberId` - ONDC subscriber identifier
- `subscribeRequestId` - UUID for domain verification
- `hasEncryptionKey` - Boolean indicating if encryption key is loaded
- `hasSigningKey` - Boolean indicating if signing key is loaded
- `sharedSecretLength` - Length of pre-computed shared secret (should be 32 for AES-256)

**Example**:
```typescript
const info = tenant.getInfo();
console.log('Tenant info:', info);
```

## Environment Variables

### Required Variables

All environment variables must be set before application startup:

```env
# Subscriber Identity
SUBSCRIBER_ID=ondc-staging.vaatun.com
STATIC_SUBSCRIBE_REQUEST_ID=019aa6d1-8906-704b-9929-64be78bb83cc

# Encryption Keys (X25519, base64 encoded DER format)
ENCRYPTION_PRIVATE_KEY=<base64_x25519_private_key>
ONDC_PUBLIC_KEY=<base64_ondc_public_key>

# Signing Key (Ed25519, base64 encoded)
SIGNING_PRIVATE_KEY=<base64_ed25519_private_key>
```

### Environment Variable Details

| Variable | Type | Format | Description |
|----------|------|--------|-------------|
| `SUBSCRIBER_ID` | String | Domain name | ONDC subscriber identifier (e.g., "ondc-staging.vaatun.com") |
| `STATIC_SUBSCRIBE_REQUEST_ID` | String | UUID | Unique identifier for site verification |
| `ENCRYPTION_PRIVATE_KEY` | String | Base64 (DER) | X25519 private key for Diffie-Hellman |
| `ONDC_PUBLIC_KEY` | String | Base64 (DER) | ONDC's X25519 public key |
| `SIGNING_PRIVATE_KEY` | String | Base64 | Ed25519 private key for signatures |

## Migration Guide

### From ondc-utils.ts to Tenant

**Before** (using ondc-utils.ts):
```typescript
import { sharedKey, decryptAES256ECB, SIGNING_PRIVATE_KEY, signMessage } from '@/lib/ondc-utils';

// Decrypt challenge
const answer = decryptAES256ECB(sharedKey, challenge);

// Sign message
const signature = await signMessage(message, SIGNING_PRIVATE_KEY);
```

**After** (using Tenant):
```typescript
import { getTenant } from '@/entities/tenant';

const tenant = getTenant();

// Decrypt challenge
const answer = tenant.decryptChallenge(challenge);

// Sign message
const signature = await tenant.signMessage(message);
```

### Benefits of Migration

1. **Type Safety**: All operations are methods with proper TypeScript types
2. **Encapsulation**: No direct access to sensitive keys
3. **Validation**: Built-in configuration validation
4. **Testing**: Easier to mock and test with singleton pattern
5. **Maintainability**: Centralized credential management

## Security Considerations

### 1. Private Key Storage
- Private keys loaded only once at startup
- Stored as private class fields (not accessible outside class)
- Never logged or exposed through public API

### 2. Shared Secret
- Pre-computed at initialization
- Not recalculated on each request (performance optimization)
- Stored in memory only (never persisted)

### 3. Environment Separation
- Use different credentials for dev/staging/production
- Never commit `.env` files
- Rotate keys periodically

### 4. Validation
- Built-in validation checks key formats and lengths
- Warns about potential configuration issues
- Fails fast on missing or invalid credentials

## Testing

### Unit Testing

```typescript
import { Tenant } from '@/entities/tenant';

describe('Tenant', () => {
  beforeEach(() => {
    // Reset singleton between tests
    Tenant.resetInstance();
  });

  it('should decrypt challenge correctly', () => {
    const tenant = Tenant.getInstance();
    const decrypted = tenant.decryptChallenge('encrypted_challenge');
    expect(decrypted).toBe('expected_plaintext');
  });

  it('should validate configuration', () => {
    const tenant = Tenant.getInstance();
    const validation = tenant.validate();
    expect(validation.valid).toBe(true);
  });
});
```

### Integration Testing

```typescript
import { getTenant } from '@/entities/tenant';

describe('ONDC Integration', () => {
  it('should handle subscription flow', async () => {
    const tenant = getTenant();

    // Test decryption
    const answer = tenant.decryptChallenge(mockChallenge);
    expect(answer).toBeDefined();

    // Test signing
    const signature = await tenant.signSubscribeRequestId();
    expect(signature).toBeDefined();
  });
});
```

## Troubleshooting

### Common Issues

#### 1. "Missing required environment variable: X"
**Cause**: Required environment variable not set

**Solution**: Ensure all 5 required variables are set in `.env`:
```env
SUBSCRIBER_ID=...
STATIC_SUBSCRIBE_REQUEST_ID=...
ENCRYPTION_PRIVATE_KEY=...
ONDC_PUBLIC_KEY=...
SIGNING_PRIVATE_KEY=...
```

#### 2. "Failed to initialize Tenant: Invalid cryptographic keys"
**Cause**: Keys are not in correct format (must be base64-encoded DER)

**Solution**:
- Verify keys are base64 encoded
- Verify ENCRYPTION_PRIVATE_KEY is X25519 in PKCS8 DER format
- Verify ONDC_PUBLIC_KEY is X25519 in SPKI DER format

#### 3. "Invalid shared secret length: X (expected 32)"
**Cause**: Diffie-Hellman computation failed or keys incompatible

**Solution**:
- Verify ENCRYPTION_PRIVATE_KEY is X25519
- Verify ONDC_PUBLIC_KEY is X25519
- Ensure keys are from same curve

#### 4. "Failed to decrypt challenge"
**Cause**: Challenge encrypted with different key or algorithm

**Solution**:
- Verify ONDC is using your public key
- Verify ONDC is using AES-256-ECB
- Check shared secret computation

## Best Practices

### 1. Use getTenant() Helper
```typescript
// Good
import { getTenant } from '@/entities/tenant';
const tenant = getTenant();

// Avoid
import { Tenant } from '@/entities/tenant';
const tenant = Tenant.getInstance();
```

### 2. Validate on Startup
```typescript
// In application startup
const tenant = getTenant();
const validation = tenant.validate();

if (!validation.valid) {
  console.error('Tenant validation failed:', validation.errors);
  process.exit(1);
}
```

### 3. Use Type-Safe Methods
```typescript
// Good - type-safe
const answer = tenant.decryptChallenge(challenge);

// Avoid - bypasses type checking
const answer = (tenant as any).decryptAES256ECB(...);
```

### 4. Log Safely
```typescript
// Good - safe info only
console.log('[Tenant]', tenant.getInfo());

// Avoid - might expose credentials
console.log('[Tenant]', tenant);
```

## Future Enhancements

### Multi-Tenant Support
Currently singleton pattern supports one tenant. Future versions may support:
- Multiple tenant instances
- Tenant selection based on request context
- Tenant-specific databases

### Database-Backed Configuration
Instead of environment variables, load credentials from:
- Encrypted database
- Secrets management service (AWS Secrets Manager, HashiCorp Vault)
- Key management service (AWS KMS, Google Cloud KMS)

### Key Rotation
Automated key rotation with:
- Scheduled rotation jobs
- Zero-downtime rotation
- Key version management

### Audit Logging
Track all cryptographic operations:
- Challenge decryptions
- Message signatures
- Failed operations
- Validation checks
