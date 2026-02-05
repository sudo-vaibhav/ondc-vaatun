# Phase 4: Confirm & Status Flows - Research

**Researched:** 2026-02-04
**Domain:** ONDC FIS13 confirm/on_confirm/status/on_status protocol, payment callback handling, policy display
**Confidence:** HIGH

## Summary

This research investigates the technical approach for implementing the ONDC FIS13 confirm and status flows, which complete the payment processing and policy issuance journey. After the user returns from the BPP payment gateway, the BAP sends a `confirm` request with payment confirmation, receives `on_confirm` with order status, then polls `status` to get the final policy document.

The protocol flow is well-defined in the ONDC FIS13 spec. The `confirm` request mirrors the init structure but includes a quote reference. The `on_confirm` response returns order status (ACTIVE) with payment status (initially NOT-PAID). The `status` request is simpler, containing only `order_id`. The `on_status` response contains the complete policy with a downloadable document URL.

The existing codebase provides all infrastructure: init-store pattern for confirm-store, init polling page pattern for payment-callback routing, and results router for polling. The primary work is: (1) adding confirm/onConfirm/status/onStatus endpoints, (2) creating confirm-store and status-store for state management, (3) building payment callback and policy success pages, (4) creating the policy detail view page.

**Primary recommendation:** Follow the established init flow pattern exactly for confirm/on_confirm. Create a simpler status-store for status/on_status (status is simpler than confirm). Payment callback route triggers confirm request, polls status with 2-minute timeout per user decision, then redirects to success page showing full policy details with Captain Otter celebration pose.

## Standard Stack

The established libraries/tools for this domain:

### Core - Backend (confirm/status)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tRPC | 11.x | Type-safe API layer | Already used for init flow, same pattern applies |
| Zod | 4.x | Request/response validation | ONDC spec compliance with loose validation for BPP responses |
| ioredis | 5.x | Redis client for state | Powers init-store, confirm-store follows same pattern |
| uuid (v7) | Latest | Message IDs | UUIDv7 provides time-ordered IDs for debugging |

### Core - Frontend (policy pages)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TanStack Router | 1.x | File-based routing | New routes for payment-callback, policy success, policy view |
| TanStack Query | 5.x | Polling for on_status | Same pattern as init polling with 2-minute timeout |
| lucide-react | 0.562.x | Icons | Download, check, file icons for policy display |
| motion | 12.x | Animations | Success page celebration animation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui Card | Latest | Policy summary cards | Success page sections |
| shadcn/ui Separator | Latest | Visual dividers | Between policy sections |
| shadcn/ui Badge | Latest | Status indicators | PAID, ACTIVE, NOT-PAID badges |
| shadcn/ui Button | Latest | Actions | Download, refresh, return home |

**Installation:**
```bash
# No new dependencies - all libraries already installed from Phase 1-3
# May need to add Badge component if not already present
cd client && pnpm dlx shadcn@latest add badge
```

## Architecture Patterns

### Recommended Project Structure (Additions Only)
```
server/src/
├── trpc/routers/
│   └── gateway.ts          # ADD: confirm, onConfirm, status, onStatus procedures
│   └── results.ts          # ADD: getConfirmResults, getStatusResults procedures
└── lib/
    ├── confirm-store.ts    # NEW: Confirm state store (copy init-store pattern)
    └── status-store.ts     # NEW: Status state store (simpler than confirm)

server/src/infra/key-value/redis/
└── key-formatter.ts        # ADD: confirm and status key formatters

client/src/
├── routes/
│   ├── payment-callback/
│   │   └── $transactionId.tsx  # NEW: Payment return handling
│   ├── policy-success/
│   │   └── $orderId.tsx        # NEW: Success page with full details
│   └── policy/
│       └── $orderId.tsx        # NEW: Policy detail view for later access
└── components/
    └── policy/
        ├── PolicySummaryCard.tsx    # NEW: Policy overview card
        ├── PolicyDetailsSection.tsx # NEW: Full policy details
        ├── PolicyDocument.tsx       # NEW: Document download card
        └── PaymentStatusBadge.tsx   # NEW: PAID/NOT-PAID badge
```

### Pattern 1: Confirm Request Construction (ONDC FIS13)
**What:** Building Beckn-compliant confirm payload after payment return
**When to use:** Every confirm endpoint invocation
**Example:**
```typescript
// Source: ONDC FIS13 Spec - confirm-request.yaml
const payload = {
  context: {
    action: "confirm",
    bap_id: tenant.subscriberId,
    bap_uri: `https://${tenant.subscriberId}/api/ondc`,
    bpp_id: input.bppId,
    bpp_uri: input.bppUri,
    domain: "ONDC:FIS13",
    location: { country: { code: "IND" }, city: { code: "*" } },
    transaction_id: input.transactionId,
    message_id: messageId,
    timestamp: new Date().toISOString(),
    ttl: "P24H",
    version: "2.0.1",
  },
  message: {
    order: {
      provider: { id: input.providerId },
      items: [{
        id: input.itemId,
        parent_item_id: input.parentItemId,
        add_ons: input.addOns?.map(addon => ({
          id: addon.id,
          quantity: { selected: { count: addon.quantity } }
        })),
        xinput: {
          form: { id: input.xinputFormId },
          form_response: {
            status: "SUCCESS",
            submission_id: input.submissionId
          }
        }
      }],
      fulfillments: [{
        id: "F1",
        type: "POLICY",
        customer: {
          person: { name: input.customerName },
          contact: {
            email: input.customerEmail,
            phone: `+91-${input.customerPhone}`
          }
        }
      }],
      payments: [{
        collected_by: "BPP",
        status: "NOT-PAID", // BPP updates this after payment verification
        type: "PRE-FULFILLMENT",
        params: {
          amount: input.amount,
          currency: "INR",
          bank_account_number: input.bankAccountNumber,
          bank_code: input.bankCode
        },
        tags: [
          // BUYER_FINDER_FEES and SETTLEMENT_TERMS tags
        ]
      }],
      quote: {
        id: input.quoteId,
        price: { currency: "INR", value: input.amount },
        breakup: input.quoteBreakup,
        ttl: "P15D"
      }
    }
  }
};
```

**Key differences from init:**
- Includes `quote` object with full breakup
- `fulfillments[].id` and `fulfillments[].type` are specified (F1, POLICY)
- Response includes `order.id` (the POLICY_ID)
- Response may include `payments[].url` again if payment not completed

### Pattern 2: on_confirm Response Processing
**What:** Processing on_confirm callback to extract order status and payment URL
**When to use:** In onConfirm handler
**Example:**
```typescript
// Source: ONDC FIS13 Spec - on_confirm-request.yaml
interface OnConfirmResponse {
  context: OnConfirmContext;
  message?: {
    order?: {
      id?: string;  // POLICY_ID - critical for status polling
      status?: string; // "ACTIVE"
      provider?: ConfirmProvider;
      items?: ConfirmItem[];
      quote?: Quote;
      payments?: Payment[];
      fulfillments?: Fulfillment[];
      created_at?: string;
      updated_at?: string;
      cancellation_terms?: CancellationTerm[];
    };
  };
  error?: { code?: string; message?: string };
}

// Key decision points:
function determineNextAction(response: OnConfirmResponse) {
  const order = response.message?.order;
  const payment = order?.payments?.[0];

  // Check if order created
  if (!order?.id) {
    return { type: "error", message: "Order not created" };
  }

  // Check payment status
  if (payment?.status === "PAID") {
    return { type: "success", orderId: order.id };
  }

  // Payment pending - may have URL to retry
  if (payment?.status === "NOT-PAID") {
    if (payment?.url) {
      return { type: "payment_required", url: payment.url, orderId: order.id };
    }
    return { type: "pending", orderId: order.id };
  }

  // Error case
  if (response.error) {
    return { type: "error", error: response.error };
  }

  return { type: "pending", orderId: order.id };
}
```

### Pattern 3: Status Request (Simpler than Confirm)
**What:** Building status request to check policy status
**When to use:** After confirm, polling for payment completion
**Example:**
```typescript
// Source: ONDC FIS13 Spec - status-request.yaml
// NOTE: Status request is much simpler than other requests
const payload = {
  context: {
    action: "status",
    bap_id: tenant.subscriberId,
    bap_uri: `https://${tenant.subscriberId}/api/ondc`,
    bpp_id: input.bppId,
    bpp_uri: input.bppUri,
    domain: "ONDC:FIS13",
    location: { country: { code: "IND" }, city: { code: "*" } },
    transaction_id: input.transactionId,
    message_id: messageId,
    timestamp: new Date().toISOString(),
    ttl: "PT10M", // Shorter TTL than confirm
    version: "2.0.1",
  },
  message: {
    order_id: input.orderId // Just the order ID, nothing else!
  }
};
```

**Key differences:**
- `ttl` is "PT10M" (10 minutes) instead of "P24H"
- `message` only contains `order_id` - much simpler
- No items, fulfillments, or payments needed

### Pattern 4: on_status Response with Policy Document
**What:** Processing on_status callback to extract policy document
**When to use:** In onStatus handler and frontend display
**Example:**
```typescript
// Source: ONDC FIS13 Spec - on_status-request.yaml
interface OnStatusResponse {
  context: OnStatusContext;
  message?: {
    order?: {
      id?: string;
      status?: string; // "ACTIVE" when policy issued
      provider?: StatusProvider;
      items?: StatusItem[];
      quote?: Quote;
      payments?: Payment[]; // status: "PAID" when complete
      fulfillments?: Fulfillment[]; // state.descriptor.code: "GRANTED"
      documents?: PolicyDocument[]; // THE KEY ADDITION
    };
  };
  error?: { code?: string; message?: string };
}

interface PolicyDocument {
  descriptor?: {
    code?: string;  // "policy-doc"
    name?: string;  // "Insurance Policy Document"
    short_desc?: string;
    long_desc?: string;
  };
  mime_type?: string; // "application/pdf"
  url?: string; // Download URL
}

// Determine if policy is ready
function isPolicyReady(response: OnStatusResponse): boolean {
  const order = response.message?.order;
  const payment = order?.payments?.[0];
  const fulfillment = order?.fulfillments?.[0];

  return (
    payment?.status === "PAID" &&
    fulfillment?.state?.descriptor?.code === "GRANTED" &&
    order?.documents?.length > 0
  );
}
```

### Pattern 5: Confirm Store (Copy init-store Pattern)
**What:** Redis-backed store for confirm transaction state
**When to use:** Store confirm entries and on_confirm responses
**Example:**
```typescript
// NEW: server/src/lib/confirm-store.ts
// Copy exact pattern from init-store.ts, change key prefix

export interface ConfirmEntry {
  transactionId: string;
  messageId: string;
  orderId?: string; // Added after on_confirm
  itemId: string;
  providerId: string;
  bppId: string;
  bppUri: string;
  quoteId: string;
  amount: string;
  confirmTimestamp: string;
  createdAt: number;
}

export interface OnConfirmResponse {
  context: OnConfirmContext;
  message?: {
    order?: {
      id?: string;
      status?: string;
      provider?: ConfirmProvider;
      items?: ConfirmItem[];
      quote?: Quote;
      payments?: Payment[];
      fulfillments?: Fulfillment[];
      created_at?: string;
      updated_at?: string;
    };
  };
  error?: { code?: string; message?: string };
  _receivedAt: string;
}

export interface ConfirmResult {
  found: boolean;
  transactionId: string;
  messageId: string;
  orderId?: string;
  hasResponse: boolean;
  paymentStatus?: string;
  paymentUrl?: string;
  orderStatus?: string;
  error?: { code?: string; message?: string };
}

// Add to key-formatter.ts
export const keyFormatter = {
  // ... existing
  confirm: (transactionId: string, messageId: string) =>
    `confirm:${transactionId}:${messageId}`,
  confirmChannel: (transactionId: string, messageId: string) =>
    `confirm:${transactionId}:${messageId}:updates`,
};
```

### Pattern 6: Status Store (Simpler - Order-Based Keys)
**What:** Redis-backed store for status polling results
**When to use:** Store status entries and on_status responses
**Example:**
```typescript
// NEW: server/src/lib/status-store.ts
// Simpler than confirm - keyed by orderId not transactionId+messageId

export interface StatusEntry {
  orderId: string;
  transactionId: string;
  bppId: string;
  bppUri: string;
  statusTimestamp: string;
  createdAt: number;
}

export interface OnStatusResponse {
  context: OnStatusContext;
  message?: {
    order?: {
      id?: string;
      status?: string;
      provider?: StatusProvider;
      items?: StatusItem[];
      quote?: Quote;
      payments?: Payment[];
      fulfillments?: Fulfillment[];
      documents?: PolicyDocument[];
    };
  };
  error?: { code?: string; message?: string };
  _receivedAt: string;
}

export interface StatusResult {
  found: boolean;
  orderId: string;
  transactionId: string;
  hasResponse: boolean;
  orderStatus?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  policyDocument?: PolicyDocument;
  provider?: StatusProvider;
  items?: StatusItem[];
  quote?: Quote;
  error?: { code?: string; message?: string };
}

// Add to key-formatter.ts
export const keyFormatter = {
  // ... existing
  status: (orderId: string) => `status:${orderId}`,
  statusChannel: (orderId: string) => `status:${orderId}:updates`,
};

// Store TTL: 24 hours for policy data (user may return later)
const POLICY_STORE_TTL_MS = 24 * 60 * 60 * 1000;
```

### Pattern 7: Payment Callback Page
**What:** Route handling user return from BPP payment gateway
**When to use:** Dedicated callback route: `/payment-callback/:transactionId`
**Example:**
```typescript
// NEW: client/src/routes/payment-callback/$transactionId.tsx
export const Route = createFileRoute("/payment-callback/$transactionId")({
  component: PaymentCallbackPage,
});

function PaymentCallbackPage() {
  const { transactionId } = Route.useParams();
  const [stage, setStage] = useState<"confirming" | "polling" | "success" | "error">("confirming");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [pollStartTime] = useState(() => Date.now());

  // Step 1: Send confirm request on mount
  const confirmMutation = trpc.gateway.confirm.useMutation({
    onSuccess: (data) => {
      if (data.orderId) {
        setOrderId(data.orderId);
        setStage("polling");
      } else if (data.error) {
        setStage("error");
      }
    },
    onError: () => setStage("error"),
    retry: 3, // Per user decision: 3 retries with exponential backoff
    retryDelay: (attempt) => Math.min(1000 * Math.pow(2, attempt), 10000),
  });

  // Auto-trigger confirm on mount (need to get transaction data from somewhere)
  useEffect(() => {
    // Get confirm data from localStorage or URL params
    const confirmData = getConfirmDataFromStorage(transactionId);
    if (confirmData) {
      confirmMutation.mutate(confirmData);
    }
  }, [transactionId]);

  // Step 2: Poll status after confirm succeeds
  const { data: statusData, error: statusError } = trpc.results.getStatusResults.useQuery(
    { orderId: orderId! },
    {
      enabled: stage === "polling" && !!orderId,
      refetchInterval: (query) => {
        const elapsed = Date.now() - pollStartTime;
        // 2 minute timeout per user decision
        if (elapsed > 120000) return false;
        // Stop on payment complete or policy ready
        if (query.state.data?.paymentStatus === "PAID") return false;
        if (query.state.data?.policyDocument) return false;
        if (query.state.data?.error) return false;
        return 3000; // Poll every 3 seconds (Claude's discretion)
      },
    }
  );

  // Redirect to success page when policy ready
  useEffect(() => {
    if (statusData?.policyDocument && statusData?.paymentStatus === "PAID") {
      navigate({ to: "/policy-success/$orderId", params: { orderId: orderId! } });
    }
  }, [statusData, orderId]);

  // ... render states based on stage
}
```

### Pattern 8: Policy Success Page with Captain Otter Celebration
**What:** Full policy display page with celebration animation
**When to use:** After successful payment and policy issuance
**Example:**
```typescript
// NEW: client/src/routes/policy-success/$orderId.tsx
// Per user decision: full policy details, Captain Otter celebration, PDF download

function PolicySuccessPage() {
  const { orderId } = Route.useParams();

  const { data: statusData } = trpc.results.getStatusResults.useQuery(
    { orderId },
    { staleTime: 5 * 60 * 1000 } // Cache for 5 minutes
  );

  const policyDocument = statusData?.policyDocument;
  const order = statusData;

  // Open PDF in new tab per user decision
  const handleDownload = () => {
    if (policyDocument?.url) {
      window.open(policyDocument.url, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Celebration Header with Captain Otter */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            {/* Captain Otter success-salute.png or protection-shield.png */}
            <img
              src="/mascot/captain-otter/poses/success-salute.png"
              alt="Success!"
              className="h-32 mx-auto mb-4"
            />
          </motion.div>
          <motion.h1
            className="text-3xl font-bold text-green-600"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Policy Issued Successfully!
          </motion.h1>
          <p className="text-muted-foreground mt-2">
            Your insurance coverage is now active
          </p>
        </div>

        {/* Policy Summary Card */}
        <PolicySummaryCard
          orderId={orderId}
          providerName={order?.provider?.descriptor?.name}
          productName={order?.items?.[0]?.descriptor?.name}
          coverageAmount={/* from tags */}
          premium={order?.quote?.price?.value}
          validFrom={/* from time */}
          validTo={/* calculated from time.duration */}
        />

        {/* Full Policy Details */}
        <PolicyDetailsSection
          items={order?.items}
          quote={order?.quote}
          fulfillments={order?.fulfillments}
        />

        {/* Document Download */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Policy Document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {policyDocument?.descriptor?.long_desc}
            </p>
            <Button onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Download Policy (PDF)
            </Button>
          </CardContent>
        </Card>

        {/* Action Buttons - per user decision: both options */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Button variant="outline" asChild>
            <Link to="/policy/$orderId" params={{ orderId }}>
              View Policy Details
            </Link>
          </Button>
          <Button asChild>
            <Link to="/">
              Return to Home
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
```

### Pattern 9: Policy View Page (For Later Access)
**What:** Simple policy status view with refresh capability
**When to use:** Dedicated policy page at `/policy/:orderId`
**Example:**
```typescript
// NEW: client/src/routes/policy/$orderId.tsx
// Per user decision: simple status view + download link, not full details

function PolicyViewPage() {
  const { orderId } = Route.useParams();

  // Hybrid caching per user decision: Redis-backed with manual refresh
  const { data, refetch, isFetching } = trpc.results.getStatusResults.useQuery(
    { orderId },
    { staleTime: 5 * 60 * 1000 }
  );

  if (!data?.found) {
    return <NotFoundPage message="Policy not found" />;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Policy Status</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={data.paymentStatus === "PAID" ? "success" : "warning"}>
                {data.paymentStatus}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Order ID</span>
              <span className="font-mono text-sm">{orderId}</span>
            </div>
            {/* Validity format per user decision: "Valid: Jan 1, 2026 - Dec 31, 2026" */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Validity</span>
              <span>
                Valid: {formatDate(data.validFrom)} - {formatDate(data.validTo)}
              </span>
            </div>

            {/* Download link */}
            {data.policyDocument?.url && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => window.open(data.policyDocument.url, "_blank")}
              >
                <Download className="h-4 w-4" />
                Download Policy Document
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
```

### Anti-Patterns to Avoid

**Do not poll status without orderId:**
```typescript
// BAD: Polling status with transactionId
const { data } = trpc.results.getStatusResults.useQuery({ transactionId });

// GOOD: Status uses orderId from on_confirm response
const { data } = trpc.results.getStatusResults.useQuery({ orderId });
```

**Do not assume payment is complete after confirm:**
```typescript
// BAD: Immediately showing success after confirm
if (confirmResponse.message?.ack?.status === "ACK") {
  showSuccess();
}

// GOOD: Poll status until payment is PAID
if (statusResponse.paymentStatus === "PAID") {
  showSuccess();
}
```

**Do not skip the confirm step:**
```typescript
// BAD: Going directly to status after payment return
// User returns from payment -> status request

// GOOD: Follow protocol: confirm -> on_confirm -> status -> on_status
// User returns from payment -> confirm request -> wait for on_confirm ->
// status request -> wait for on_status with PAID status
```

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Confirm store | New state management | Copy init-store.ts | Same Redis pattern, same TTL, same pub/sub |
| Status store | Complex state machine | Simplified order-keyed store | Status is simpler - just needs orderId lookup |
| Polling logic | Custom setInterval | TanStack Query refetchInterval | Handles cleanup, background pause, error states |
| Retry with backoff | Manual setTimeout | tRPC mutation retry option | Built-in exponential backoff support |
| Payment status badges | Custom styled divs | shadcn/ui Badge | Consistent styling, accessibility |
| Date formatting | Manual string concat | Intl.DateTimeFormat | Locale-aware, handles edge cases |
| PDF handling | Complex viewer | window.open in new tab | Per user decision, let browser handle |

**Key insight:** The confirm/status flow is structurally identical to init flow. The store, endpoint pattern, and polling are copy-paste with key prefix changes. The simpler status request (just order_id) makes status-store even simpler than init-store.

## Common Pitfalls

### Pitfall 1: Sending Status Without order_id
**What goes wrong:** BPP returns NACK because order reference is missing
**Why it happens:** Using transactionId instead of orderId from on_confirm
**How to avoid:**
```typescript
// Status request must use orderId from on_confirm response
const orderId = onConfirmResponse.message?.order?.id;
if (!orderId) {
  throw new Error("No order ID in on_confirm response");
}

await statusMutation.mutate({
  transactionId, // Still needed for context
  orderId, // Required for message.order_id
  bppId,
  bppUri
});
```
**Warning signs:** BPP returns error code "INVALID_ORDER_ID", status fails immediately

### Pitfall 2: Not Handling NOT-PAID After Payment Return
**What goes wrong:** User sees error when they actually completed payment
**Why it happens:** Payment verification is async, may take seconds
**How to avoid:**
```typescript
// Per user decision: show instructions for NOT-PAID status
if (statusData.paymentStatus === "NOT-PAID") {
  return (
    <Card>
      <CardContent className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-semibold mt-4">Payment Processing</h2>
        <p className="text-muted-foreground mt-2">
          If you completed payment, please wait a moment.
          Otherwise, please contact support.
        </p>
        <Button onClick={() => refetch()} className="mt-4 gap-2">
          <RefreshCw className="h-4 w-4" />
          Check Status
        </Button>
      </CardContent>
    </Card>
  );
}
```
**Warning signs:** Users calling support about "failed" payments that actually succeeded

### Pitfall 3: Infinite Status Polling
**What goes wrong:** App keeps polling forever, wasting resources
**Why it happens:** Not implementing timeout (2 minutes per user decision)
**How to avoid:**
```typescript
const [startTime] = useState(() => Date.now());

refetchInterval: (query) => {
  const elapsed = Date.now() - startTime;
  // 2 minute timeout per user decision
  if (elapsed > 120000) return false;
  // Stop on success
  if (query.state.data?.paymentStatus === "PAID") return false;
  // Stop on error
  if (query.state.data?.error) return false;
  // Continue polling
  return 3000;
}
```
**Warning signs:** Network tab shows continuous requests after timeout

### Pitfall 4: Missing Policy Document URL Handling
**What goes wrong:** Download button does nothing or crashes
**Why it happens:** Assuming document always exists
**How to avoid:**
```typescript
// Always check before using
const policyDocument = statusData?.policyDocument;

{policyDocument?.url ? (
  <Button onClick={() => window.open(policyDocument.url, "_blank")}>
    Download Policy
  </Button>
) : (
  <p className="text-muted-foreground">
    Policy document will be available shortly
  </p>
)}
```
**Warning signs:** "Cannot read property 'url' of undefined" errors

### Pitfall 5: Hardcoding Policy Validity Calculation
**What goes wrong:** Wrong validity dates displayed
**Why it happens:** Assuming P1Y always means calendar year
**How to avoid:**
```typescript
// Parse ISO 8601 duration properly
function calculateValidityEnd(startDate: Date, duration: string): Date {
  // duration format: P1Y (1 year), P6M (6 months), etc.
  const match = duration.match(/P(\d+)([YMD])/);
  if (!match) return startDate;

  const [, amount, unit] = match;
  const result = new Date(startDate);

  switch (unit) {
    case 'Y': result.setFullYear(result.getFullYear() + parseInt(amount)); break;
    case 'M': result.setMonth(result.getMonth() + parseInt(amount)); break;
    case 'D': result.setDate(result.getDate() + parseInt(amount)); break;
  }

  return result;
}

// Format per user decision: "Valid: Jan 1, 2026 - Dec 31, 2026"
const formatValidity = (start: Date, end: Date) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  return `Valid: ${formatter.format(start)} - ${formatter.format(end)}`;
};
```
**Warning signs:** Validity dates that don't match policy duration

### Pitfall 6: Auto-Retry Creating Duplicate Orders
**What goes wrong:** Multiple orders created for same payment
**Why it happens:** Retrying confirm with new message_id
**How to avoid:**
```typescript
// Use same message_id for retries (idempotent)
const [messageId] = useState(() => uuidv7());

const confirmMutation = trpc.gateway.confirm.useMutation({
  retry: 3,
  retryDelay: (attempt) => Math.min(1000 * Math.pow(2, attempt), 10000),
});

// Pass consistent messageId
confirmMutation.mutate({
  ...confirmData,
  messageId, // Same ID across retries
});
```
**Warning signs:** Multiple policy IDs for same customer/transaction

## Code Examples

### Example 1: Confirm tRPC Procedure
```typescript
// ADD to: server/src/trpc/routers/gateway.ts
confirm: publicProcedure
  .input(
    z.object({
      transactionId: z.uuid(),
      messageId: z.uuid().optional(), // Allow passing for idempotency
      bppId: z.string(),
      bppUri: z.url(),
      providerId: z.string(),
      itemId: z.string(),
      parentItemId: z.string(),
      xinputFormId: z.string(),
      submissionId: z.string(),
      addOns: z.array(z.object({
        id: z.string(),
        quantity: z.number().int().positive(),
      })).optional(),
      customerName: z.string(),
      customerEmail: z.string().email(),
      customerPhone: z.string(),
      quoteId: z.string(),
      amount: z.string(),
      quoteBreakup: z.array(z.object({
        title: z.string(),
        price: z.object({
          currency: z.string(),
          value: z.string(),
        }),
      })).optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { tenant, ondcClient, kv } = ctx;
    const messageId = input.messageId || uuidv7();

    // Create confirm entry in store
    await createConfirmEntry(
      kv,
      input.transactionId,
      messageId,
      input.itemId,
      input.providerId,
      input.bppId,
      input.bppUri,
      input.quoteId,
      input.amount
    );

    const payload = {
      context: {
        action: "confirm",
        bap_id: tenant.subscriberId,
        bap_uri: `https://${tenant.subscriberId}/api/ondc`,
        bpp_id: input.bppId,
        bpp_uri: input.bppUri,
        domain: tenant.domainCode,
        location: { country: { code: "IND" }, city: { code: "*" } },
        transaction_id: input.transactionId,
        message_id: messageId,
        timestamp: new Date().toISOString(),
        ttl: "P24H",
        version: "2.0.1",
      },
      message: {
        order: {
          provider: { id: input.providerId },
          items: [{
            id: input.itemId,
            parent_item_id: input.parentItemId,
            add_ons: input.addOns?.map(addon => ({
              id: addon.id,
              quantity: { selected: { count: addon.quantity } }
            })),
            xinput: {
              form: { id: input.xinputFormId },
              form_response: {
                status: "SUCCESS",
                submission_id: input.submissionId
              }
            }
          }],
          fulfillments: [{
            id: "F1",
            type: "POLICY",
            customer: {
              person: { name: input.customerName },
              contact: {
                email: input.customerEmail,
                phone: `+91-${input.customerPhone}`
              }
            }
          }],
          payments: [{
            collected_by: "BPP",
            status: "NOT-PAID",
            type: "PRE-FULFILLMENT",
            params: {
              amount: input.amount,
              currency: "INR"
            }
          }],
          quote: {
            id: input.quoteId,
            price: { currency: "INR", value: input.amount },
            breakup: input.quoteBreakup,
            ttl: "P15D"
          }
        }
      }
    };

    const confirmUrl = input.bppUri.endsWith("/")
      ? `${input.bppUri}confirm`
      : `${input.bppUri}/confirm`;

    console.log("[Confirm] Sending request to:", confirmUrl);
    const response = await ondcClient.send(confirmUrl, "POST", payload);
    console.log("[Confirm] ONDC Response:", JSON.stringify(response, null, 2));

    return {
      ...response,
      transactionId: input.transactionId,
      messageId,
    };
  }),
```

### Example 2: Status tRPC Procedure
```typescript
// ADD to: server/src/trpc/routers/gateway.ts
status: publicProcedure
  .input(
    z.object({
      transactionId: z.uuid(),
      orderId: z.string(),
      bppId: z.string(),
      bppUri: z.url(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { tenant, ondcClient, kv } = ctx;
    const messageId = uuidv7();

    // Create status entry in store
    await createStatusEntry(
      kv,
      input.orderId,
      input.transactionId,
      input.bppId,
      input.bppUri
    );

    // Status request is much simpler
    const payload = {
      context: {
        action: "status",
        bap_id: tenant.subscriberId,
        bap_uri: `https://${tenant.subscriberId}/api/ondc`,
        bpp_id: input.bppId,
        bpp_uri: input.bppUri,
        domain: tenant.domainCode,
        location: { country: { code: "IND" }, city: { code: "*" } },
        transaction_id: input.transactionId,
        message_id: messageId,
        timestamp: new Date().toISOString(),
        ttl: "PT10M", // Shorter TTL
        version: "2.0.1",
      },
      message: {
        order_id: input.orderId // Just the order ID!
      }
    };

    const statusUrl = input.bppUri.endsWith("/")
      ? `${input.bppUri}status`
      : `${input.bppUri}/status`;

    console.log("[Status] Sending request to:", statusUrl);
    const response = await ondcClient.send(statusUrl, "POST", payload);
    console.log("[Status] ONDC Response:", JSON.stringify(response, null, 2));

    return {
      ...response,
      transactionId: input.transactionId,
      orderId: input.orderId,
      messageId,
    };
  }),
```

### Example 3: on_confirm and on_status Callback Handlers
```typescript
// ADD to: server/src/trpc/routers/gateway.ts
onConfirm: publicProcedure
  .input(
    z.object({
      context: z.object({
        transaction_id: z.string().optional(),
        message_id: z.string().optional(),
        bpp_id: z.string().optional(),
        bpp_uri: z.string().optional(),
      }).passthrough().optional(),
      message: z.any().optional(),
      error: z.object({
        type: z.string().optional(),
        code: z.string().optional(),
        message: z.string().optional(),
      }).passthrough().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { kv } = ctx;

    console.log("\n\n[on_confirm] Request Body:\n\n", JSON.stringify(input, null, "\t"));

    const transactionId = input.context?.transaction_id;
    const messageId = input.context?.message_id;
    const orderId = input.message?.order?.id;

    if (input.error) {
      console.error("[on_confirm] BPP returned error:", input.error);
    }

    if (transactionId && messageId) {
      await addConfirmResponse(
        kv,
        transactionId,
        messageId,
        orderId,
        input as Parameters<typeof addConfirmResponse>[4]
      );
    } else {
      console.warn("[on_confirm] Missing transaction_id or message_id");
    }

    return {
      message: {
        ack: { status: "ACK" as const },
      },
    };
  }),

onStatus: publicProcedure
  .input(
    z.object({
      context: z.object({
        transaction_id: z.string().optional(),
        message_id: z.string().optional(),
        bpp_id: z.string().optional(),
        bpp_uri: z.string().optional(),
      }).passthrough().optional(),
      message: z.any().optional(),
      error: z.object({
        type: z.string().optional(),
        code: z.string().optional(),
        message: z.string().optional(),
      }).passthrough().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { kv } = ctx;

    console.log("\n\n[on_status] Request Body:\n\n", JSON.stringify(input, null, "\t"));

    const orderId = input.message?.order?.id;

    if (input.error) {
      console.error("[on_status] BPP returned error:", input.error);
    }

    if (orderId) {
      await addStatusResponse(
        kv,
        orderId,
        input as Parameters<typeof addStatusResponse>[2]
      );
    } else {
      console.warn("[on_status] Missing order_id in response");
    }

    return {
      message: {
        ack: { status: "ACK" as const },
      },
    };
  }),
```

### Example 4: Key Formatter Additions
```typescript
// ADD to: server/src/infra/key-value/redis/key-formatter.ts

const KEY_PREFIXES = {
  SEARCH: "search",
  SELECT: "select",
  INIT: "init",
  CONFIRM: "confirm",  // NEW
  STATUS: "status",    // NEW
} as const;

// NEW: Confirm key functions
export function confirmKey(transactionId: string, messageId: string): string {
  return `${KEY_PREFIXES.CONFIRM}:${transactionId}:${messageId}`;
}

export function confirmChannel(transactionId: string, messageId: string): string {
  return `${KEY_PREFIXES.CONFIRM}:${transactionId}:${messageId}:updates`;
}

// NEW: Status key functions (simpler - keyed by orderId)
export function statusKey(orderId: string): string {
  return `${KEY_PREFIXES.STATUS}:${orderId}`;
}

export function statusChannel(orderId: string): string {
  return `${KEY_PREFIXES.STATUS}:${orderId}:updates`;
}

export const keyFormatter = {
  // ... existing
  confirm: confirmKey,
  confirmChannel,
  status: statusKey,
  statusChannel,
} as const;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single confirm response | Confirm + status polling | Current spec | Need to poll status for payment verification |
| BAP collects payment | BPP collects via redirect | Current spec | Payment URL in on_init, verify via on_status |
| Inline policy display | Document URL download | Current spec | PDF via BPP-hosted URL |
| Sync payment confirmation | Async via status polling | Current spec | Cannot assume payment complete after redirect |

**Deprecated/outdated:**
- Single-shot confirm: FIS13 requires status polling to verify payment
- Inline payment: BPP handles payment flow via redirect URL

## Open Questions

1. **Confirm Data Persistence Across Payment**
   - What we know: User leaves to BPP payment page, returns via callback URL
   - What's unclear: How to pass confirm data (transactionId, items, etc.) across redirect
   - Recommendation: Store in localStorage before payment redirect, retrieve on callback

2. **Captain Otter Celebration Pose**
   - What we know: User decision specifies celebration pose on success page
   - What's unclear: Which exact pose - success-salute.png or protection-shield.png
   - Recommendation: Use success-salute.png for policy success (protection-shield.png for coverage display)

3. **Polling Interval (Claude's Discretion)**
   - What we know: 2-minute timeout decided, interval is Claude's discretion
   - Recommendation: 3 seconds - balances responsiveness with server load

4. **Redis TTL for Policy Cache (Claude's Discretion)**
   - What we know: Hybrid caching with Redis + manual refresh
   - Recommendation: 24 hours for status-store (user may return next day)

## Sources

### Primary (HIGH confidence)
- **ONDC FIS13 Spec (GitHub):** `ONDC-Official/ONDC-FIS-Specifications` branch `draft-FIS13-health-2.0.1`
  - confirm request: `api/components/examples/health-insurance/confirm/confirm-request.yaml`
  - on_confirm response: `api/components/examples/health-insurance/on_confirm/on_confirm-request.yaml`
  - status request: `api/components/examples/health-insurance/status/status-request.yaml`
  - on_status response: `api/components/examples/health-insurance/on_status/on_status-request.yaml`
- **Existing Codebase:**
  - `server/src/trpc/routers/gateway.ts` - init/onInit patterns
  - `server/src/lib/init-store.ts` - Redis store pattern
  - `server/src/infra/key-value/redis/key-formatter.ts` - key formatting
  - `client/src/routes/init/$transactionId/$messageId.tsx` - polling page pattern
  - `docs/mascot/captain-otter/poses/README.md` - mascot pose reference

### Secondary (MEDIUM confidence)
- Phase 3 Research (03-RESEARCH.md) - init flow patterns
- 04-CONTEXT.md user decisions

### Tertiary (LOW confidence)
- None for this phase (all findings verified with official sources or existing code)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use from Phase 1-3
- Architecture: HIGH - Patterns directly copy init flow
- ONDC protocol: HIGH - Spec fetched from official GitHub repository
- Payment callback handling: MEDIUM - Based on protocol, but BPP behavior varies
- Pitfalls: HIGH - Based on protocol requirements and existing patterns

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (30 days for stable tech, ONDC spec v2.0.1 is stable)

---

*Research methodology: Examined ONDC FIS13 spec confirm/status examples via GitHub API, verified against existing init flow patterns in codebase, cross-referenced with Phase 3 research findings, applied user decisions from CONTEXT.md.*
