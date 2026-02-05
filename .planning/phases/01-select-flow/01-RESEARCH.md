# Phase 1: Select Flow - Research

**Researched:** 2026-02-02
**Domain:** ONDC Beckn Protocol (FIS13 Health Insurance) + React UI with TanStack Query
**Confidence:** HIGH

## Summary

The Select Flow implements the ONDC Beckn protocol's select/on_select transaction pair for health insurance quoting. This phase builds on the existing search flow infrastructure (already implemented) and follows the same architectural pattern: tRPC endpoints for select requests, Redis-backed stores for state management, callback handlers for BPP responses, and polling-based result retrieval.

The backend implementation is straightforward because the pattern is already established in the search flow. The select endpoint sends signed ONDC requests to BPP URIs, the on_select callback receives and stores quote data in Redis, and the results endpoint enables frontend polling. The existing `select-store.ts` and gateway router already have the foundation in place.

The frontend requires a new quote display page that polls for select results and presents coverage details, premium breakdowns, and add-on selections. User decisions mandate a full-page layout with prominent premium display, comprehensive coverage details, add-on toggles (unselected by default), collapsible terms & conditions, and Captain Otter loading states.

**Primary recommendation:** Follow the established search flow patterns exactly. The backend is 80% complete with minor routing adjustments needed. Focus implementation effort on the frontend quote display page with proper polling, add-on state management, and responsive UI components.

## Standard Stack

The established libraries/tools for this domain:

### Core - ONDC Protocol (Backend)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tRPC | 11.x | Type-safe API layer | Already used for search flow, maintains type safety between frontend/backend |
| Zod | 4.x | Request/response validation | ONDC spec compliance with loose validation for BPP responses |
| ioredis | 5.x | Redis client for state | Powers search-store, select-store already in use |
| libsodium-wrappers | 0.7.15 | ONDC request signing | Cryptographic operations for Beckn protocol |
| uuid (v7) | Latest | Transaction IDs | UUIDv7 provides time-ordered IDs for debugging |

### Core - Frontend
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TanStack Query | 5.x | Data fetching & polling | Built into tRPC client, handles refetchInterval natively |
| TanStack Router | 1.x | File-based routing | Project standard, provides type-safe params |
| React | 19.x | UI framework | Latest stable version already in use |
| Vite | 6.x | Build tool | Fast dev server, HMR for rapid iteration |

### UI Components (shadcn/ui)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Card | Latest | Quote containers | Provider info, coverage details, quote breakdown |
| Badge | Latest | Coverage amounts, tenure | Premium display, add-on pricing |
| Button | Latest | CTA actions | "Proceed to Application" button |
| Separator | Latest | Visual dividers | Between quote sections |
| Collapsible | Latest | Terms & conditions | User decision: expandable section |
| Switch | Latest | Add-on toggles | User decision: toggle on/off for each add-on |

**Note on shadcn/ui:** Components are installed via CLI (`pnpm dlx shadcn@latest add [component]`) and added to `client/src/components/ui/`. These are not npm packages but copied source files.

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.562.x | Icons | Loading states, status indicators |
| Tailwind CSS | 4.x | Styling | Utility-first CSS (project standard) |
| clsx + tailwind-merge | Latest | Class composition | Conditional classes with proper merging |

**Installation:**
```bash
# Backend dependencies already installed
# Frontend: Add missing shadcn/ui components
cd client
pnpm dlx shadcn@latest add collapsible
pnpm dlx shadcn@latest add switch
```

## Architecture Patterns

### Recommended Project Structure (Additions Only)
```
server/src/
├── trpc/routers/
│   └── gateway.ts          # select and onSelect already exist
│   └── results.ts          # getSelectResults already exists
└── lib/
    └── select-store.ts     # Already implemented

client/src/
├── routes/
│   └── quote/
│       └── $transactionId/
│           └── $messageId.tsx  # NEW: Quote display page
└── components/
    ├── quote/
    │   ├── QuoteBreakdown.tsx    # EXISTS: Price breakdown component
    │   ├── QuoteHeader.tsx       # NEW: Provider + premium display
    │   ├── CoverageDetails.tsx   # NEW: Coverage info grid
    │   ├── AddOnSelector.tsx     # NEW: Add-on toggles with pricing
    │   └── TermsCollapsible.tsx  # NEW: Terms & conditions section
    └── ui/
        ├── collapsible.tsx       # INSTALL: shadcn collapsible
        └── switch.tsx            # INSTALL: shadcn switch
```

### Pattern 1: tRPC Polling with TanStack Query
**What:** Frontend polls backend endpoint at regular intervals until data arrives
**When to use:** ONDC callback-based flows where response timing is unpredictable
**Example:**
```typescript
// Source: Existing implementation in client/src/routes/quote/$transactionId/$messageId.tsx
import { trpc } from "@/trpc/client";

function QuotePage() {
  const { transactionId, messageId } = Route.useParams();

  const { data, isLoading, error } = trpc.results.getSelectResults.useQuery(
    { transactionId, messageId },
    {
      refetchInterval: (data) => {
        // Stop polling when quote received or error occurs
        if (data?.hasResponse || data?.error) return false;
        return 2000; // Poll every 2 seconds
      },
      refetchIntervalInBackground: false, // Pause when tab loses focus
    }
  );

  // Render loading state while !data?.hasResponse
  // Render quote when data?.hasResponse === true
}
```

**Why this pattern:**
- ONDC BPPs respond asynchronously via callbacks (on_select)
- Response timing varies (2-30 seconds typical)
- Redis stores intermediate state
- Frontend polls results endpoint to detect arrival
- TanStack Query handles intervals, cancellation, background behavior automatically

**Sources:**
- [TanStack Query useQuery docs](https://tanstack.com/query/v4/docs/framework/react/reference/useQuery)
- [TanStack Query Polling guide](https://javascript.plainenglish.io/tanstack-query-mastering-polling-ee11dc3625cb)

### Pattern 2: Redis Store with TTL for Transaction State
**What:** Each select request creates an entry in Redis with automatic expiration
**When to use:** Any ONDC transaction flow (search, select, init, confirm)
**Example:**
```typescript
// Source: server/src/lib/select-store.ts (already exists)
export async function createSelectEntry(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
  itemId: string,
  providerId: string,
  bppId: string,
  bppUri: string
): Promise<SelectEntry> {
  const entry: SelectEntry = {
    transactionId,
    messageId,
    itemId,
    providerId,
    bppId,
    bppUri,
    selectTimestamp: new Date().toISOString(),
    createdAt: Date.now(),
  };

  const key = keyFormatter.select(transactionId, messageId);
  await kv.set(key, entry, { ttlMs: DEFAULT_STORE_TTL_MS }); // 10 minutes

  return entry;
}

export async function addSelectResponse(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
  response: Omit<OnSelectResponse, "_receivedAt">
): Promise<boolean> {
  // Store response with timestamp
  const responseWithTimestamp: OnSelectResponse = {
    ...response,
    _receivedAt: new Date().toISOString(),
  };

  const key = keyFormatter.select(transactionId, messageId);
  const responseKey = `${key}:response`;
  await kv.set(responseKey, responseWithTimestamp, { ttlMs: DEFAULT_STORE_TTL_MS });

  // Publish event for real-time updates (optional)
  const channel = keyFormatter.selectChannel(transactionId, messageId);
  await kv.publish(channel, { type: "response_received", transactionId, messageId });

  return true;
}
```

**Key principles:**
- **Composite keys:** `select:{transactionId}:{messageId}` for entry, `select:{transactionId}:{messageId}:response` for quote data
- **TTL-based cleanup:** 10-minute default prevents Redis bloat
- **Pub/sub optional:** Enables real-time updates (not required for Phase 1)
- **Timestamps everywhere:** `_receivedAt` helps debug callback latency

### Pattern 3: ONDC Select Request Construction
**What:** Building Beckn-compliant select payload with items, add-ons, and xinput
**When to use:** Every select endpoint invocation
**Example:**
```typescript
// Source: server/src/trpc/routers/gateway.ts (already exists)
const payload = {
  context: {
    action: "select",
    bap_id: tenant.subscriberId,
    bap_uri: `https://${tenant.subscriberId}/api/ondc`,
    bpp_id: input.bppId,
    bpp_uri: input.bppUri,
    domain: tenant.domainCode, // "ONDC:FIS13"
    location: { country: { code: "IND" }, city: { code: "*" } },
    transaction_id: input.transactionId,
    message_id: messageId,
    timestamp: new Date().toISOString(),
    ttl: "PT30S", // 30 seconds
    version: "2.0.1",
  },
  message: {
    order: {
      provider: { id: input.providerId },
      items: [
        {
          id: input.itemId,
          parent_item_id: input.parentItemId || input.itemId,
          add_ons: input.addOns?.map(addon => ({
            id: addon.id,
            quantity: { selected: { count: addon.quantity } }
          })),
          xinput: input.xinputFormId ? {
            form: { id: input.xinputFormId },
            form_response: {
              submission_id: input.xinputSubmissionId,
              status: "APPROVED"
            }
          } : undefined
        }
      ]
    }
  }
};
```

**ONDC-specific rules:**
- `parent_item_id` always required (use item ID if no parent)
- `add_ons` array optional but must follow exact structure
- `xinput` used for form submissions (Phase 2 concern, not Phase 1)
- `ttl` format: ISO 8601 duration (PT30S = 30 seconds)
- Signed with Ed25519 by ondcClient (existing Tenant implementation)

**Official spec reference:**
```bash
# Fetch ONDC select request examples
gh api "repos/ONDC-Official/ONDC-FIS-Specifications/contents/api/components/examples/health-insurance/select/select-request-pan-dob-info.yaml?ref=draft-FIS13-health-2.0.1" --jq '.content' | base64 -d
```

### Pattern 4: Quote Display UI with Add-on State
**What:** Interactive quote page with toggle-based add-on selection and dynamic total calculation
**When to use:** Quote display pages across all insurance types
**Example:**
```typescript
// NEW: client/src/components/quote/AddOnSelector.tsx
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useState, useMemo } from "react";

interface AddOn {
  id: string;
  descriptor?: { name?: string; code?: string };
  price?: { currency: string; value: string };
}

export function AddOnSelector({
  addOns,
  onSelectionChange
}: {
  addOns: AddOn[];
  onSelectionChange?: (selectedIds: string[], totalPrice: number) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const totalAddOnPrice = useMemo(() => {
    return Array.from(selected).reduce((sum, id) => {
      const addon = addOns.find(a => a.id === id);
      return sum + (parseFloat(addon?.price?.value || "0"));
    }, 0);
  }, [selected, addOns]);

  const handleToggle = (addonId: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(addonId)) {
      newSelected.delete(addonId);
    } else {
      newSelected.add(addonId);
    }
    setSelected(newSelected);
    onSelectionChange?.(Array.from(newSelected), totalAddOnPrice);
  };

  return (
    <div className="space-y-3">
      {addOns.map(addon => (
        <Card key={addon.id} className="p-4 flex items-center justify-between">
          <div className="flex-1">
            <Label htmlFor={addon.id} className="font-medium">
              {addon.descriptor?.name || addon.id}
            </Label>
            {addon.descriptor?.code && (
              <p className="text-sm text-muted-foreground">{addon.descriptor.code}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">
              +{addon.price?.currency} {addon.price?.value}
            </span>
            <Switch
              id={addon.id}
              checked={selected.has(addon.id)}
              onCheckedChange={() => handleToggle(addon.id)}
            />
          </div>
        </Card>
      ))}
      {totalAddOnPrice > 0 && (
        <div className="text-right text-lg font-bold">
          Total Add-ons: ₹{totalAddOnPrice.toFixed(2)}
        </div>
      )}
    </div>
  );
}
```

**Design principles:**
- **Uncontrolled by default:** User decisions specify all add-ons start unselected
- **Real-time total:** Calculate and display add-on subtotal immediately
- **Accessible toggles:** Switch component with proper Label association
- **Clear pricing:** Show per-add-on price and running total

**Sources:**
- [shadcn/ui Switch component](https://ui.shadcn.com/docs/components/switch)
- Existing `HealthItemCard.tsx` for formatting patterns

### Anti-Patterns to Avoid

**❌ Polling without stop condition**
```typescript
// BAD: Polls forever
const { data } = trpc.results.getSelectResults.useQuery(
  { transactionId, messageId },
  { refetchInterval: 2000 }
);
```

```typescript
// GOOD: Stops when data arrives or errors
const { data } = trpc.results.getSelectResults.useQuery(
  { transactionId, messageId },
  {
    refetchInterval: (data) => {
      if (data?.hasResponse || data?.error) return false;
      return 2000;
    }
  }
);
```

**❌ Direct ONDC client usage in frontend**
```typescript
// BAD: Frontend should never call BPP directly
fetch("https://bpp-uri.com/select", { ... });
```

```typescript
// GOOD: Use tRPC layer for signing and routing
trpc.gateway.select.mutate({ transactionId, bppId, bppUri, ... });
```

**❌ Storing add-on selection in Redux/Context**
```typescript
// BAD: Over-engineering for local UI state
const [addOns, dispatch] = useReducer(addOnsReducer, initialState);
```

```typescript
// GOOD: useState sufficient for this phase
const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());
```

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Polling logic with intervals | Custom useEffect + setInterval cleanup | TanStack Query refetchInterval | Handles cleanup, background pause, stale data, error states automatically |
| ONDC request signing | Manual Ed25519 signing | Existing `ondcClient.send()` | Tenant class encapsulates key management, signing, headers |
| Redis key formatting | String concatenation | `keyFormatter.select()` | Ensures consistent namespacing, prevents key collisions |
| Quote price parsing | Manual parseFloat + formatting | `Intl.NumberFormat` with currency | Handles currency symbols, locale-specific formatting, decimal places |
| Collapsible UI | Custom useState + CSS transitions | shadcn/ui Collapsible | Accessible, keyboard navigation, animation-ready, ARIA compliant |
| Toggle switches | Checkbox styled with CSS | shadcn/ui Switch | Accessible, touch-friendly, proper ARIA roles |

**Key insight:** The codebase already has 90% of the infrastructure. Search flow and select flow are nearly identical patterns. Don't rebuild what exists in `search-store.ts`, `gateway.ts`, or `results.ts`. Copy the pattern, adjust the endpoint names, and focus effort on the new quote UI components.

## Common Pitfalls

### Pitfall 1: Polling Without BPP Response Detection
**What goes wrong:** Frontend polls forever even after BPP returns an error or times out
**Why it happens:** Not checking `hasResponse` or `error` fields in polling condition
**How to avoid:**
```typescript
refetchInterval: (data) => {
  // Stop polling if response received OR error occurred
  if (data?.hasResponse || data?.error) return false;
  return 2000;
}
```
**Warning signs:** Network tab shows continuous requests after quote loads, high Redis query count

### Pitfall 2: Not Handling BPP Errors in on_select
**What goes wrong:** BPP returns error response (item unavailable, invalid selection), callback stores error, but frontend shows "Loading..." forever
**Why it happens:** Only checking `hasResponse` without checking `error` field
**How to avoid:**
```typescript
// In on_select handler (already exists in gateway.ts)
if (input.error) {
  console.error("[on_select] BPP returned error:", input.error);
  // Still store the error response
}

// In frontend quote page
if (data?.error) {
  return <ErrorDisplay error={data.error} />;
}

if (!data?.hasResponse) {
  return <LoadingState />;
}
```
**Warning signs:** User sees infinite loading after BPP error, console shows error but UI doesn't reflect it

### Pitfall 3: Add-on Price Calculation Bugs
**What goes wrong:** Total price doesn't update when toggling add-ons, or shows incorrect amounts
**Why it happens:** Not using `useMemo` for derived calculations, stale closure over state
**How to avoid:**
```typescript
// Calculate total whenever selection changes
const totalAddOnPrice = useMemo(() => {
  return Array.from(selectedAddOns).reduce((sum, id) => {
    const addon = addOns.find(a => a.id === id);
    return sum + parseFloat(addon?.price?.value || "0");
  }, 0);
}, [selectedAddOns, addOns]);
```
**Warning signs:** Price updates lag behind toggle changes, price shows NaN, totals don't match individual prices

### Pitfall 4: Missing Redis TTL Causes Memory Bloat
**What goes wrong:** Redis fills with stale select entries that never expire
**Why it happens:** Forgot `ttlMs` option when calling `kv.set()`
**How to avoid:** Always use TTL for transaction state
```typescript
// Good: 10-minute TTL (existing pattern)
await kv.set(key, entry, { ttlMs: 10 * 60 * 1000 });
```
**Warning signs:** Redis memory usage grows indefinitely, keys from days ago still present

### Pitfall 5: Route Navigation Before messageId Available
**What goes wrong:** User clicks "Get Quote" button, navigate to quote page, but URL has `undefined` messageId
**Why it happens:** Navigate called before select mutation returns
**How to avoid:**
```typescript
// In HealthItemCard (already follows this pattern)
const handleSelect = async () => {
  try {
    const response = await fetch("/api/ondc/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId, bppId, bppUri, providerId, itemId, parentItemId })
    });

    if (!response.ok) throw new Error("Failed to select item");

    const result = await response.json();
    // Wait for response before navigating
    navigate({
      to: "/quote/$transactionId/$messageId",
      params: { transactionId: result.transactionId, messageId: result.messageId }
    });
  } catch (error) {
    console.error("Selection error:", error);
  }
};
```
**Warning signs:** 404 errors on quote page, route params show `undefined`, navigation happens instantly before request completes

### Pitfall 6: Forgetting Collapsible Requires Radix UI
**What goes wrong:** Collapsible component doesn't render, errors about missing dependencies
**Why it happens:** shadcn/ui Collapsible depends on `@radix-ui/react-collapsible`
**How to avoid:** Use shadcn CLI to install (handles dependencies automatically)
```bash
cd client
pnpm dlx shadcn@latest add collapsible
# Installs component + dependencies
```
**Warning signs:** Import errors, "Module not found: @radix-ui/react-collapsible"

## Code Examples

Verified patterns from official sources and existing codebase:

### Example 1: Complete Quote Page with Polling
```typescript
// NEW: client/src/routes/quote/$transactionId/$messageId.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { QuoteHeader } from "@/components/quote/QuoteHeader";
import { CoverageDetails } from "@/components/quote/CoverageDetails";
import { AddOnSelector } from "@/components/quote/AddOnSelector";
import { TermsCollapsible } from "@/components/quote/TermsCollapsible";
import QuoteBreakdown from "@/components/quote/QuoteBreakdown";

export const Route = createFileRoute("/quote/$transactionId/$messageId")({
  component: QuotePage,
});

function QuotePage() {
  const { transactionId, messageId } = Route.useParams();

  const { data, isLoading, error } = trpc.results.getSelectResults.useQuery(
    { transactionId, messageId },
    {
      refetchInterval: (data) => {
        // Stop polling when response received or error occurs
        if (data?.hasResponse || data?.error) return false;
        return 2000; // Poll every 2 seconds
      },
      refetchIntervalInBackground: false, // Pause when tab loses focus
    }
  );

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-4">Error</h1>
          <p className="text-destructive">{error.message}</p>
          <Link to="/health/$searchId" params={{ searchId: transactionId }}>
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Results
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  // Loading state: waiting for BPP response
  if (!data?.hasResponse) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <img
            src="/mascot/loading-steering.png"
            alt="Captain Otter loading"
            className="h-32 w-32 mx-auto mb-4 animate-pulse"
          />
          <h2 className="text-xl font-bold mb-2">Fetching Your Quote</h2>
          <p className="text-muted-foreground">
            Waiting for insurer to calculate your premium...
          </p>
        </div>
      </div>
    );
  }

  // BPP returned an error
  if (data.error) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <img
            src="/mascot/error-500-fixing.png"
            alt="Captain Otter error"
            className="h-32 w-32 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold mb-4 text-center">Quote Unavailable</h1>
          <p className="text-destructive text-center mb-4">
            {data.error.message || "The insurer could not generate a quote"}
          </p>
          <div className="text-center">
            <Link to="/health/$searchId" params={{ searchId: transactionId }}>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Results
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const { quote, provider, item } = data;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <Link to="/health/$searchId" params={{ searchId: transactionId }}>
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Results
          </Button>
        </Link>

        <QuoteHeader provider={provider} quote={quote} />

        <div className="grid gap-6 mt-6">
          <CoverageDetails item={item} />

          {quote?.breakup && <QuoteBreakdown quote={quote} />}

          {item?.add_ons && item.add_ons.length > 0 && (
            <AddOnSelector addOns={item.add_ons} />
          )}

          <TermsCollapsible />

          <Button size="lg" className="w-full">
            Proceed to Application
          </Button>
        </div>
      </main>
    </div>
  );
}
```

**Source:** Adapted from existing `client/src/routes/quote/$transactionId/$messageId.tsx`

### Example 2: ONDC on_select Response Structure (FIS13 Health)
```yaml
# Source: https://github.com/ONDC-Official/ONDC-FIS-Specifications/blob/draft-FIS13-health-2.0.1/api/components/examples/health-insurance/on_select/on_select-request-pan-dob-info.yaml
context:
  action: on_select
  bap_id: fis.test.bap.io
  bap_uri: https://fis.test.bap.io/
  bpp_id: fis.test.bpp.io
  bpp_uri: https://fis.test.bpp.io/
  domain: ONDC:FIS13
  transaction_id: c04a04ee-d892-400f-bbe6-479a43b4448a
  message_id: 519da438-68dc-4f2c-bd10-79c0f88c3924
  timestamp: "2023-07-24T05:40:26.618Z"
  ttl: P24H
  version: 2.0.1

message:
  order:
    provider:
      id: P1
      descriptor:
        name: ABC Insurance Ltd.
        short_desc: "ABC Insurance Ltd. India"
        images:
          - url: https://www.abcinsurance.com/logo.png
            size_type: xs

    items:
      - id: CHILD_ITEM_ID_I1
        parent_item_id: I1
        descriptor:
          name: Health Gain Plus Individual
          short_desc: ABC Individual Health Insurance Class A with custom addon
        category_ids: [C1, C3]
        price:
          currency: INR
          value: '900'
        time:
          duration: P1Y
          label: TENURE
        tags:
          - descriptor:
              name: General Information
              code: GENERAL_INFO
            list:
              - descriptor:
                  code: COVERAGE_AMOUNT
                value: "10000000"
              - descriptor:
                  code: CO_PAYMENT
                value: "Yes"
              - descriptor:
                  code: ROOM_RENT_CAP
                value: "25000"
              - descriptor:
                  code: CASHLESS_HOSPITALS
                value: "50"
        add_ons:
          - id: A1
            quantity:
              selected:
                count: 1
            descriptor:
              name: No Claim Bonus
              code: NO_CLAIM_BONUS
            price:
              value: "100"
              currency: INR
        xinput:
          head:
            descriptor:
              name: EKYC
            index:
              min: 0
              cur: 0
              max: 0
          form:
            id: FO4
            url: https://fis.test.bpp.io/form/ekyc_dtls?formid=FO5
            mime_type: application/html
          required: true

    quote:
      id: OFFER_ID/PROPOSAL_ID
      price:
        currency: INR
        value: "1100"
      breakup:
        - title: BASE_PRICE
          price:
            value: "900"
            currency: INR
        - title: CONVIENCE_FEE
          price:
            value: "50"
            currency: INR
        - title: TAX
          price:
            value: "40"
            currency: INR
        - title: PROCESSING_FEE
          price:
            value: "10"
            currency: INR
        - title: ADD_ONS
          item:
            id: CHILD_ITEM_ID_I1
            add_ons:
              - id: A1
          price:
            value: "100"
            currency: INR
      ttl: P15D
```

**Key fields for frontend:**
- `message.order.provider`: Provider name and logo
- `message.order.items[0].price`: Base item price
- `message.order.items[0].tags` (GENERAL_INFO): Coverage details (COVERAGE_AMOUNT, CO_PAYMENT, ROOM_RENT_CAP, etc.)
- `message.order.items[0].add_ons`: Available add-ons with pricing
- `message.order.quote.price`: Total premium
- `message.order.quote.breakup`: Price breakdown (base, tax, fees, add-ons)
- `message.order.quote.ttl`: Quote validity period

### Example 3: Coverage Details Component
```typescript
// NEW: client/src/components/quote/CoverageDetails.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Building2, Clock, Banknote } from "lucide-react";

interface SelectItem {
  tags?: Array<{
    descriptor?: { name?: string; code?: string };
    list?: Array<{
      descriptor?: { name?: string; code?: string };
      value?: string;
    }>;
  }>;
}

export function CoverageDetails({ item }: { item?: SelectItem }) {
  // Extract GENERAL_INFO tags
  const generalInfo = item?.tags?.find(
    t => t.descriptor?.code === "GENERAL_INFO"
  );

  const getTagValue = (code: string) => {
    return generalInfo?.list?.find(
      tag => tag.descriptor?.code === code
    )?.value;
  };

  const coverageAmount = getTagValue("COVERAGE_AMOUNT");
  const coPayment = getTagValue("CO_PAYMENT");
  const roomRentCap = getTagValue("ROOM_RENT_CAP");
  const cashlessHospitals = getTagValue("CASHLESS_HOSPITALS");

  if (!generalInfo) {
    return null;
  }

  const formatCurrency = (value: string) => {
    const num = parseInt(value, 10);
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(num % 100000 === 0 ? 0 : 1)}L`;
    }
    return `₹${num.toLocaleString("en-IN")}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Coverage Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {coverageAmount && (
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">
                <Shield className="h-3 w-3 mr-1" />
                Coverage
              </Badge>
              <div>
                <p className="font-medium">{formatCurrency(coverageAmount)}</p>
                <p className="text-sm text-muted-foreground">Sum Insured</p>
              </div>
            </div>
          )}

          {roomRentCap && (
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">
                <Banknote className="h-3 w-3 mr-1" />
                Room Rent
              </Badge>
              <div>
                <p className="font-medium">{formatCurrency(roomRentCap)}/day</p>
                <p className="text-sm text-muted-foreground">Cap</p>
              </div>
            </div>
          )}

          {coPayment && (
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">
                <Clock className="h-3 w-3 mr-1" />
                Co-payment
              </Badge>
              <div>
                <p className="font-medium">{coPayment}</p>
                <p className="text-sm text-muted-foreground">Your Share</p>
              </div>
            </div>
          )}

          {cashlessHospitals && (
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-1">
                <Building2 className="h-3 w-3 mr-1" />
                Network
              </Badge>
              <div>
                <p className="font-medium">{cashlessHospitals}+ Hospitals</p>
                <p className="text-sm text-muted-foreground">Cashless</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Source:** Adapted from `client/src/components/product/HealthItemCard.tsx` tag parsing logic

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| REST polling endpoints | tRPC with TanStack Query | 2024 | Type-safe polling, automatic refetch management |
| Manual state management for quotes | Redis-backed stores with TTL | Current architecture | Automatic cleanup, no memory leaks |
| WebSockets for real-time updates | Polling with smart intervals | Current pattern | Simpler deployment, works with serverless |
| Custom form libraries | shadcn/ui components | 2024 | Accessible by default, consistent styling |
| Checkbox for toggles | Switch component | Current UI standards | Better mobile UX, clearer on/off state |

**Deprecated/outdated:**
- **TanStack Query v3:** v4 and v5 have improved TypeScript inference, better error handling
- **Accordion for single items:** Use Collapsible for single expandable sections (T&C), Accordion for multiple related items
- **Toggle component for settings:** Use Switch for boolean settings, Toggle for toolbar buttons (formatting, etc.)

## Open Questions

Things that couldn't be fully resolved:

1. **Captain Otter Loading Images**
   - What we know: `docs/mascot/captain-otter/poses/README.md` lists `loading-steering.png` and `loading-pocketwatch.png`
   - What's unclear: Actual image files not found in filesystem, only README exists
   - Recommendation: Generate images using the documented process OR use placeholder images with Loader2 icon for Phase 1

2. **Add-on Selection Persistence**
   - What we know: User decisions specify "all add-ons start unselected", Phase 2 handles form submission
   - What's unclear: Should add-on selections persist if user navigates back from forms?
   - Recommendation: Phase 1 doesn't need persistence. Add-on selections are purely UI state. Phase 2 will handle this with form state management (FORM-07 requirement)

3. **Quote TTL Display Format**
   - What we know: ONDC spec returns `quote.ttl` as ISO 8601 duration (e.g., "P15D" = 15 days)
   - What's unclear: Should we show countdown timer or static validity period?
   - Recommendation: Static display for Phase 1 ("Valid for 15 days"). Countdown timer is v2 enhancement if needed.

4. **BPP-Specific Terms & Conditions**
   - What we know: User decisions mandate collapsible T&C section
   - What's unclear: Do BPPs return T&C text in on_select response? Where in the payload?
   - Recommendation: Check ONDC spec `descriptor.long_desc` fields on item/provider. If not present, use generic placeholder: "Terms and conditions apply. Full policy terms will be provided after application."

## Sources

### Primary (HIGH confidence)
- **ONDC FIS13 Spec (GitHub):** `ONDC-Official/ONDC-FIS-Specifications` branch `draft-FIS13-health-2.0.1`
  - Select request example: `api/components/examples/health-insurance/select/select-request-pan-dob-info.yaml`
  - on_select response example: `api/components/examples/health-insurance/on_select/on_select-request-pan-dob-info.yaml`
- **Existing Codebase:**
  - `server/src/trpc/routers/gateway.ts` - select and onSelect implementations
  - `server/src/lib/select-store.ts` - Redis state management
  - `client/src/routes/quote/$transactionId/$messageId.tsx` - Existing quote page
  - `client/src/components/quote/QuoteBreakdown.tsx` - Price breakdown component
  - `tests/api/gateway.spec.ts` - E2E test patterns
  - `tests/api/polling.spec.ts` - Polling flow tests

### Secondary (MEDIUM confidence)
- [TanStack Query v4 - useQuery Reference](https://tanstack.com/query/v4/docs/framework/react/reference/useQuery) - Polling configuration
- [TanStack Query v4 - Important Defaults](https://tanstack.com/query/v4/docs/react/guides/important-defaults) - Behavior expectations
- [TanStack Query Mastering Polling](https://javascript.plainenglish.io/tanstack-query-mastering-polling-ee11dc3625cb) - Best practices article
- [shadcn/ui Collapsible Docs](https://ui.shadcn.com/docs/components/collapsible) - Component API
- [shadcn/ui Switch Docs](https://ui.shadcn.com/docs/components/switch) - Toggle component

### Tertiary (LOW confidence)
- None for this phase (all findings verified with official sources or existing code)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, versions confirmed from package.json
- Architecture: HIGH - Patterns verified in existing search flow implementation
- ONDC protocol: HIGH - Spec fetched directly from official GitHub repository
- UI patterns: HIGH - shadcn/ui components verified from official docs
- Pitfalls: MEDIUM - Based on common patterns but not all tested in this codebase

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days for stable tech, ONDC spec v2.0.1 is stable)

---

*Research methodology: Examined existing codebase patterns (search flow as reference), fetched official ONDC FIS13 spec examples via GitHub API, verified UI component availability from shadcn/ui docs, cross-referenced TanStack Query polling patterns with official documentation.*
