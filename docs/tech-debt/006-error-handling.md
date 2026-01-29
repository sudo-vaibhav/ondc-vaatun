# Tech Debt: Inconsistent Error Handling

**Priority**: Medium
**Category**: Code Quality
**Effort**: Medium

## Problem

Error handling across API routes is inconsistent, making debugging difficult and providing unclear feedback to clients.

## Issues Identified

### 1. Inconsistent HTTP Status Codes

| Route | Local Error | Gateway Error | Validation Error |
|-------|-------------|---------------|------------------|
| `/search` | 503 | 503 | 400 |
| `/select` | 503 | 503 | 400 |
| `/health` | 503 | N/A | N/A |
| `/on_subscribe` | 500 | N/A | 400 |

**Problem**: Cannot distinguish between local errors and external gateway failures.

### 2. Generic Error Messages

```typescript
// Current pattern - loses error context
catch (error) {
  console.error("[Search] Error:", error);
  return NextResponse.json(
    { error: "Failed to perform search" },
    { status: 503 }
  );
}
```

### 3. No Error Type Hierarchy

Errors are thrown as raw strings or generic Error objects without classification.

### 4. Missing Error Details in Responses

Clients receive generic messages, making debugging difficult.

## Proposed Solution

### 1. Create Error Type Hierarchy

```typescript
// src/lib/errors.ts

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

export class GatewayError extends AppError {
  constructor(
    message: string,
    public gatewayUrl: string,
    public gatewayStatus?: number
  ) {
    super(message, "GATEWAY_ERROR", 502, { gatewayUrl, gatewayStatus });
    this.name = "GatewayError";
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "CONFIGURATION_ERROR", 500, details);
    this.name = "ConfigurationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(message, "AUTHENTICATION_ERROR", 401);
    this.name = "AuthenticationError";
  }
}
```

### 2. Standardize Error Response Format

```typescript
// src/lib/error-response.ts

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}

export function createErrorResponse(
  error: unknown,
  requestId?: string
): { body: ErrorResponse; status: number } {
  if (error instanceof AppError) {
    return {
      body: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          requestId,
        },
      },
      status: error.statusCode,
    };
  }

  // Unknown errors
  return {
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        requestId,
      },
    },
    status: 500,
  };
}
```

### 3. Correct HTTP Status Usage

| Status | When to Use |
|--------|-------------|
| 400 | Invalid request body, missing fields |
| 401 | Missing/invalid authentication |
| 403 | Valid auth but not authorized |
| 404 | Resource not found |
| 500 | Internal server error (our bug) |
| 502 | Bad gateway (BPP returned invalid response) |
| 503 | Service unavailable (BPP unreachable) |
| 504 | Gateway timeout (BPP too slow) |

### 4. Route Handler Pattern

```typescript
// Standardized route handler
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid request", {
        issues: parsed.error.issues,
      });
    }

    const result = await performOperation(parsed.data);
    return NextResponse.json(result);

  } catch (error) {
    const { body, status } = createErrorResponse(error, requestId);
    return NextResponse.json(body, { status });
  }
}
```

## Migration Steps

1. Create error classes in `src/lib/errors.ts`
2. Create error response utility
3. Update all route handlers to use new patterns
4. Add request ID to all responses
5. Update tests to verify error responses

## Acceptance Criteria

- [ ] Error type hierarchy implemented
- [ ] All routes use consistent error handling
- [ ] Correct HTTP status codes for each error type
- [ ] Error responses include request ID
- [ ] Gateway vs local errors distinguishable
- [ ] Tests verify error response format
