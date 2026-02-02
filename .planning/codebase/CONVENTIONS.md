# Coding Conventions

**Analysis Date:** 2026-02-02

## Naming Patterns

**Files:**
- Kebab-case for file names: `site-verification.ts`, `ondc-compat.ts`, `key-formatter.ts`
- PascalCase for class-based files: `Tenant.ts`, `ONDCClient.ts`, `UUID.ts`
- Index files export public API: `index.ts` files re-export from subdirectories
- Test files: co-located with source, named with `.spec.ts` extension (Playwright)

**Functions:**
- camelCase for all functions: `createContext()`, `calculateDigest()`, `generateToken()`
- Hooks use `use` prefix: `usePurchaser()`, `useQuery()` (tRPC and React)
- Private/internal functions: no leading underscore, access control via file organization

**Variables:**
- camelCase for all variables: `subscriberId`, `messageId`, `encryptionPrivateKey`
- SCREAMING_SNAKE_CASE for constants: `ALLOWED_DOMAIN_CODES`, `UUID_REGEX`, `CLOCK_DRIFT_OFFSET_SECONDS`
- Single-letter variables acceptable only in map/filter: `(e) =>`, `(item) =>`

**Types:**
- PascalCase for interfaces and types: `Context`, `ONDCResponse`, `SubscriberDetails`, `PurchaserInfo`
- Zod schemas use camelCase: `TenantEnvSchema`, `SubscriberSchema`, `PurchaserInfoSchema`
- Type inference from Zod: `type SubscriberDetails = z.infer<typeof SubscriberSchema>`

**Route/Component Names:**
- React components: PascalCase, match file structure: `RootComponent`, `DirectoryPage`, `PurchaserInfoDialog`
- TanStack Router files follow file-based naming: `__root.tsx`, `$searchId.tsx`, `index.tsx`
- tRPC routers: camelCase with "Router" suffix: `healthRouter`, `registryRouter`, `gatewayRouter`

## Code Style

**Formatting:**
- Tool: Biome 2.x (linter + formatter)
- Indent: 2 spaces
- Line length: No enforced limit, but keep under 120 for readability
- Trailing commas: Enabled (Biome default)
- Single quotes: Use double quotes (Biome default)

**Linting:**
- Biome with recommended rules enabled
- React recommendations enabled via `domains.react: "recommended"`
- Next.js recommendations enabled via `domains.next: "recommended"`
- CSS modules and Tailwind directives enabled
- Biome ignores unknown at-rules: `noUnknownAtRules: "off"`

**Configuration:**
- `biome.json` at root controls all formatting and linting
- Import organization enabled via `assist.actions.source.organizeImports: "on"`
- Biome ignores used in code: `// biome-ignore lint/suspicious/noExplicitAny: <reason>`

## Import Organization

**Order:**
1. External libraries (React, tRPC, Zod, etc.)
2. Internal absolute imports (using path aliases)
3. Relative imports from parent directories
4. Relative imports from same directory

**Path Aliases:**
- Client: `@/*` → `client/src/*` (defined in `client/tsconfig.json`)
- Example: `import { cn } from "@/lib/utils"` instead of `../../../lib/utils`
- Server: No path aliases, use relative imports or full paths

**Conventions:**
- One import per line for clarity
- Group related imports together
- No unused imports (Biome linter enforces this)
- Type imports: Use `type` keyword to avoid circular dependencies
  ```typescript
  import type { AppRouter } from "../../server-types";
  import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
  ```

## Error Handling

**Patterns:**
- Try-catch with console.error logging: See `server/src/lib/ondc/client.ts`
  ```typescript
  try {
    const authHeader = await this.createAuthorizationHeader(body);
    const response = await fetch(url, { /* ... */ });
  } catch (error) {
    console.error(`[ONDCClient] Error sending to ${url}:`, error);
    throw error;
  }
  ```

- Express middleware error handler: Global error handler in `server/src/app.ts`
  ```typescript
  app.use((err: any, _req: express.Request, res: express.Response, next) => {
    console.error("[Server Error]", err);
    if (res.headersSent) return next(err);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
      error: message,
      ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
  });
  ```

- Form validation errors: React components parse Zod validation and display per-field
  ```typescript
  const result = PurchaserInfoSchema.safeParse(formData);
  if (!result.success) {
    const newErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join(".");
      newErrors[path] = issue.message;
    }
    setErrors(newErrors);
  }
  ```

- No error suppression: Never use empty catch blocks or ignore errors silently

## Logging

**Framework:** console (no dedicated logging library)

**Patterns:**
- Prefixed logs for context: `[Server]`, `[Signing]`, `[Lookup]`, `[ngrok]`, `[ONDCClient]`
- Development logs: Include detailed information for debugging
  ```typescript
  console.log("[Signing] Created:", created, "from timestamp:", timestamp);
  console.log("[Lookup] Sending request to:", registryUrl.toString());
  console.log("[Lookup] Payload:", JSON.stringify(lookupPayload, null, 2));
  ```

- Errors always logged: Every catch block logs with `console.error()`
- No production secrets: Stack traces only shown in development: `...(process.env.NODE_ENV !== "production" && { stack: err.stack })`

## Comments

**When to Comment:**
- Only comment non-obvious logic or business requirements
- Avoid commenting obvious code: Good function/variable names are sufficient
- Biome ignores: Use comments to suppress linter rules with reasoning
  ```typescript
  // biome-ignore lint/suspicious/noExplicitAny: Express error handler signature
  ```

**JSDoc/TSDoc:**
- Used minimally, only for public API functions
- Presence in: `server/src/lib/ondc/signing.ts`, `server/src/lib/ondc/client.ts`
- Format:
  ```typescript
  /**
   * Calculate Blake2b-512 digest of the request body
   */
  export function calculateDigest(body: object): string { }
  ```

- Classes and methods: Document only constructor and public methods, not properties
- No parameter/return descriptions: Type system is sufficient for clarity

## Function Design

**Size:**
- Keep functions under 30 lines when possible
- Extract complex logic into separate functions
- Example: `createAuthorizationHeader()` handles signature creation, separate from `send()`

**Parameters:**
- Single parameter preferred; use object destructuring for multiple params
- Avoid optional parameters; use overloads for different signatures
- tRPC procedures: Destructure context and input separately
  ```typescript
  publicProcedure.query(async ({ ctx }) => { })
  publicProcedure.mutation(async ({ ctx, input }) => { })
  ```

**Return Values:**
- Explicit return types required for public functions
- Async functions always return Promise
- Nullable returns use `T | null` not `T | undefined`
- No implicit undefined returns

## Module Design

**Exports:**
- Named exports preferred over default
- Each module exports one logical unit
- Barrel files (`index.ts`) aggregate related exports
  ```typescript
  export { Tenant } from "./tenant";
  export { UUID } from "./uuid";
  ```

- tRPC routers exported as named exports: `export const healthRouter = router({ })`

**File Organization:**
- One class per file
- Utility functions grouped logically by feature
- Related value objects in `value-objects/` directory
- Infrastructure code isolated in `infra/` directory

**Interfaces vs Types:**
- Prefer types for data structures: `type SubscriberDetails = z.infer<typeof SubscriberSchema>`
- Use interfaces for class contracts: `interface Context { }`
- Zod schemas define truth source; type inference preferred over manual types

## Zod Schema Conventions

**Request Validation:**
- Use `z.object()` for strict validation of outgoing requests
- Validate before sending, reject invalid requests early
- Example in `server/src/trpc/routers/registry.ts`:
  ```typescript
  const SubscriberSchema = z.object({
    subscriber_id: z.string(),
    subscriber_url: z.string().optional(),
    // ... strict fields
  });
  ```

**Response Validation:**
- Use `z.looseObject()` to allow additional fields from external APIs
- Don't reject unknown fields from third-party responses
- Focus on validating fields you actually use

**Environment Variables:**
- Zod schema for all env vars: `TenantEnvSchema` in `server/src/entities/tenant.ts`
- Validation at startup, fail fast with clear error messages
- Use `.refine()` for complex cross-field validation
- Use `.transform()` for normalization (e.g., converting to UUID type)

## React Conventions

**Hooks:**
- Use React hooks: `useState`, `useCallback`, `useEffect`, `useContext`
- tRPC data fetching: `trpc.procedure.useQuery()`, `trpc.procedure.useMutation()`
- Custom hooks return objects with named properties: `{ purchaserInfo, setPurchaserInfo }`
- `useCallback` for event handlers to prevent unnecessary re-renders

**Component Props:**
- Interfaces for all component props: `interface PurchaserInfoDialogProps { }`
- Destructure props in function parameters: `function Component({ open, onOpenChange }: Props)`
- Default values via optional properties, not function defaults

**Form Handling:**
- Validation via Zod schemas
- Error state tracking: `const [errors, setErrors] = useState<Record<string, string>>({})`
- Per-field error display in UI
- Form submission validates before calling API

**Styling:**
- Tailwind CSS utility classes only, no custom CSS
- shadcn/ui components for common patterns
- Class utility: `cn()` helper from `@/lib/utils.ts` for merging classes
  ```typescript
  import { cn } from "@/lib/utils";
  <div className={cn("base-class", isActive && "active-class")} />
  ```

---

*Convention analysis: 2026-02-02*
