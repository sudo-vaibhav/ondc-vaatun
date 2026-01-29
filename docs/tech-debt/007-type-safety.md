# Tech Debt: Type Safety Improvements

**Priority**: Medium
**Category**: Code Quality
**Effort**: Medium

## Problem

The codebase has several type safety issues that reduce compile-time guarantees and could lead to runtime errors.

## Issues Identified

### 1. Explicit `any` Types (3 occurrences)

**File: `src/lib/ondc/client.ts:29-30`**
```typescript
// biome-ignore lint/suspicious/noExplicitAny: ignore
async createAuthorizationHeader(body: any): Promise<string> {
```

**File: `src/lib/search-store.ts:84-85`**
```typescript
// biome-ignore lint/suspicious/noExplicitAny: ignore
tags?: Array<any>;
```

**File: `src/lib/select-store.ts`**
Similar patterns for handling ONDC's complex nested structures.

### 2. Excessive `.passthrough()` Usage (28 occurrences)

Throughout all API routes, Zod schemas use `.passthrough()`:

```typescript
// Example from on_search/route.ts
const ProviderSchema = z.object({
  id: z.string(),
  descriptor: z.object({
    name: z.string(),
  }).passthrough(),
  items: z.array(ItemSchema).optional(),
}).passthrough();  // Allows unknown fields
```

**Why this exists**: ONDC catalog structure is complex and evolving, making strict typing difficult.

**Problems**:
- No compile-time checks for typos in field access
- Unknown fields silently pass through
- Schema documentation becomes incomplete

### 3. Missing Return Type Annotations

Some functions lack explicit return types, relying on inference:

```typescript
// Could benefit from explicit return type
export async function POST(request: NextRequest) {
  // Return type inferred, not explicit
}
```

## Proposed Solutions

### 1. Replace `any` with Proper Types

**For client.ts**:
```typescript
// Create a type for signable request bodies
type SignableBody = {
  context: {
    transaction_id: string;
    message_id: string;
    timestamp: string;
    // ... other context fields
  };
  message: Record<string, unknown>;
};

async createAuthorizationHeader(body: SignableBody): Promise<string> {
```

**For store files**:
```typescript
// Define proper tag types based on ONDC spec
type ONDCTag = {
  code: string;
  list: Array<{
    code: string;
    value: string;
  }>;
};

tags?: Array<ONDCTag>;
```

### 2. Create Strict Internal DTOs

Separate passthrough validation from internal types:

```typescript
// schemas/ondc/provider.ts

// External validation (lenient - for parsing incoming data)
export const ProviderResponseSchema = z.object({
  id: z.string(),
  descriptor: z.object({
    name: z.string(),
  }).passthrough(),
}).passthrough();

// Internal type (strict - for application code)
export interface Provider {
  id: string;
  descriptor: {
    name: string;
    shortDesc?: string;
    longDesc?: string;
    images?: string[];
  };
  items: Item[];
  categories?: Category[];
}

// Transform function
export function toProvider(raw: z.infer<typeof ProviderResponseSchema>): Provider {
  return {
    id: raw.id,
    descriptor: {
      name: raw.descriptor.name,
      shortDesc: raw.descriptor.short_desc,
      // Explicit mapping with type safety
    },
    items: raw.items?.map(toItem) ?? [],
  };
}
```

### 3. Add Type Guards

```typescript
// src/lib/type-guards.ts

export function isONDCError(response: unknown): response is ONDCError {
  return (
    typeof response === "object" &&
    response !== null &&
    "error" in response &&
    typeof (response as ONDCError).error?.code === "string"
  );
}

export function hasProvider(
  catalog: unknown
): catalog is { providers: Provider[] } {
  return (
    typeof catalog === "object" &&
    catalog !== null &&
    "providers" in catalog &&
    Array.isArray((catalog as { providers: unknown }).providers)
  );
}
```

### 4. Strict Function Return Types

```typescript
// Explicit return types for route handlers
export async function POST(
  request: NextRequest
): Promise<NextResponse<SearchResponse | ErrorResponse>> {
  // ...
}
```

## Migration Steps

1. Create internal DTO types for all ONDC entities
2. Create transform functions from raw schemas to DTOs
3. Replace `any` with proper types
4. Add type guards for runtime checks
5. Enable stricter TypeScript options gradually
6. Update tests to use typed mocks

## TypeScript Config Improvements

Consider enabling in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

## Acceptance Criteria

- [ ] All `any` types replaced with proper types
- [ ] Internal DTOs created for ONDC entities
- [ ] Transform functions for schema → DTO conversion
- [ ] Type guards for runtime validation
- [ ] No new biome-ignore comments added
- [ ] Stricter tsconfig options enabled
