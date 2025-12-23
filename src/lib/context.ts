import { AsyncLocalStorage } from "node:async_hooks";
import {
  type Tenant,
  __internal_do_not_import_getTenant,
} from "@/entities/tenant";
import { ONDCClient } from "./ondc/client";

/**
 * Request-scoped context for ONDC operations
 */
export interface Context {
  tenant: Tenant;
  ondcClient: ONDCClient;
}

const contextStorage = new AsyncLocalStorage<Context>();

/**
 * Wrap a route handler to provide ONDC context throughout the async chain.
 * Context is initialized once and accessible via getContext() anywhere in the chain.
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   return withONDCContext(async () => {
 *     const { tenant, ondcClient } = getContext();
 *     // ... handle request
 *   });
 * }
 * ```
 */
export function withONDCContext<T>(fn: () => T | Promise<T>): T | Promise<T> {
  const tenant = __internal_do_not_import_getTenant();
  const context: Context = {
    tenant,
    ondcClient: new ONDCClient(tenant),
  };
  return contextStorage.run(context, fn);
}

/**
 * Get the current request's ONDC context.
 * Must be called within a withONDCContext wrapper.
 *
 * @throws Error if called outside of withONDCContext
 */
export function getContext(): Context {
  const ctx = contextStorage.getStore();
  if (!ctx) {
    throw new Error(
      "[getContext] No request context found. " +
        "Ensure this is called within withONDCContext().",
    );
  }
  return ctx;
}

/**
 * Check if currently within an ONDC context
 */
// export function hasONDCContext(): boolean {
//   return contextStorage.getStore() !== undefined;
// }

/**
 * Handler function signature - receives request and ONDC context
 */
type ONDCHandlerFn<T = Response> = (
  request: Request,
  ctx: Context,
) => Promise<T>;

/**
 * Next.js route handler signature
 */
type NextRouteHandler<T = Response> = (
  request: Request,
  routeContext: { params: Promise<Record<string, string>> },
) => Promise<T>;

/**
 * Create a route handler with ONDC context automatically initialized.
 * Context is passed as second parameter - no need to import getContext().
 *
 * @example
 * ```typescript
 * export const POST = createONDCHandler(async (request, { tenant, ondcClient }) => {
 *   const body = await request.json();
 *   const response = await ondcClient.send(url, "POST", payload);
 *   return NextResponse.json(response);
 * });
 * ```
 */
export function createONDCHandler<T = Response>(
  handler: ONDCHandlerFn<T>,
): NextRouteHandler<T> {
  return (request) => {
    return withONDCContext(() => {
      const ctx = getContext();
      return handler(request, ctx);
    }) as Promise<T>;
  };
}
