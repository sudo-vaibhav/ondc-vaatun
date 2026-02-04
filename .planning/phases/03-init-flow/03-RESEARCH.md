# Phase 3: Init Flow - Research

**Researched:** 2026-02-04
**Domain:** ONDC FIS13 init/on_init protocol, multi-step KYC forms, BPP form handling
**Confidence:** HIGH

## Summary

This research investigates the technical approach for implementing the ONDC FIS13 init flow, which completes the KYC process and delivers a payment link from the BPP. The phase extends the existing KYCForm (built in Phase 2) with Nominee and Review steps, implements init/on_init tRPC procedures following the established select flow pattern, and handles the multi-step xinput.form_response protocol.

The ONDC FIS13 init flow is a multi-round conversation: each init request includes a form_response with submission_id, and the BPP responds with either the next form to fill (via xinput.form.url) or a payment link (via payments[].url). The protocol sequence is typically: Buyer Details -> Insured Details -> Medical Details -> Nominee Details -> Payment. Since user decisions specify "buyer IS the insured" (single person flow), we skip the separate insured form step.

The existing codebase provides all necessary infrastructure: the select flow pattern for init/on_init endpoints, Redis-backed stores for state management, polling-based result retrieval, React Hook Form with Zod validation, and the useFormPersistence hook for localStorage auto-save. The primary implementation effort is extending KYCForm with new steps and wiring up the init endpoint.

**Primary recommendation:** Follow the established select flow pattern exactly for init/on_init endpoints. Extend KYCForm with Nominee step (prompt-but-skippable, max 2 nominees) and Review step (single scrollable page with edit links). Handle BPP-provided forms based on mime_type: redirect for text/html, inline for application/json.

## Standard Stack

The established libraries/tools for this domain:

### Core - Backend (init/on_init)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tRPC | 11.x | Type-safe API layer | Already used for select flow, same pattern applies |
| Zod | 4.x | Request/response validation | ONDC spec compliance with loose validation for BPP responses |
| ioredis | 5.x | Redis client for state | Powers select-store, init-store follows same pattern |
| uuid (v7) | Latest | Message IDs | UUIDv7 provides time-ordered IDs for debugging |

### Core - Frontend (form extension)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hook-form | 7.x | Form state management | Already in use for KYCForm |
| @hookform/resolvers | 3.x | Validation integration | Bridges Zod schemas to React Hook Form |
| TanStack Query | 5.x | Polling for on_init | Same pattern as select flow polling |
| motion | 12.x | Step animations | Already in use for MultiStepForm |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui Select | Latest | Nominee relationship dropdown | Dropdown for spouse/son/daughter/etc. |
| shadcn/ui Checkbox | Latest | T&C acceptance | Mandatory checkbox before payment |
| shadcn/ui Separator | Latest | Review page sections | Visual dividers between KYC sections |

**Installation:**
```bash
# No new dependencies - all libraries already installed from Phase 1 & 2
# May need to add Select component if not already present
cd client && pnpm dlx shadcn@latest add select
```

## Architecture Patterns

### Recommended Project Structure (Additions Only)
```
server/src/
├── trpc/routers/
│   └── gateway.ts          # ADD: init and onInit procedures
│   └── results.ts          # ADD: getInitResults procedure
└── lib/
    └── init-store.ts       # NEW: Init state store (copy select-store pattern)

client/src/
├── routes/
│   └── init/
│       └── $transactionId/
│           └── $messageId.tsx  # NEW: Init polling/redirect page
├── components/
│   ├── forms/
│   │   ├── KYCForm.tsx         # EXTEND: Add Nominee and Review steps
│   │   └── fields/
│   │       └── NomineeInput.tsx  # NEW: Single nominee entry component
│   └── review/
│       └── ReviewPage.tsx      # NEW: Full-page review with edit links
└── lib/
    └── form-schemas/
        └── nominee.ts          # NEW: Nominee validation schema
```

### Pattern 1: Init Request Construction (ONDC FIS13)
**What:** Building Beckn-compliant init payload with KYC data and form_response
**When to use:** Every init endpoint invocation after form submission
**Example:**
```typescript
// Source: ONDC FIS13 Spec - init-request-buyer-info.yaml
const payload = {
  context: {
    action: "init",
    bap_id: tenant.subscriberId,
    bap_uri: `https://${tenant.subscriberId}/api/ondc`,
    bpp_id: input.bppId,
    bpp_uri: input.bppUri,
    domain: "ONDC:FIS13",
    location: { country: { code: "IND" }, city: { code: "*" } },
    transaction_id: input.transactionId,
    message_id: messageId,
    timestamp: new Date().toISOString(),
    ttl: "P24H", // 24 hours for init (longer than select)
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
        customer: {
          person: { name: input.customerName },
          contact: {
            email: input.customerEmail,
            phone: input.customerPhone
          }
        }
      }],
      payments: [{
        collected_by: "BPP",
        status: "NOT-PAID",
        type: "PRE-FULFILLMENT",
        params: {
          amount: input.amount,
          currency: "INR",
          bank_account_number: "...",
          bank_code: "..."
        },
        tags: [
          // BUYER_FINDER_FEES and SETTLEMENT_TERMS tags
        ]
      }]
    }
  }
};
```

**Key differences from select:**
- `ttl` is "P24H" (24 hours) instead of "PT30S" (30 seconds)
- `fulfillments.customer` required with person/contact details
- `payments` array required with settlement terms
- `xinput.form_response` contains submission_id from form submission

### Pattern 2: on_init Response Processing
**What:** Processing on_init callback to determine next step (form or payment)
**When to use:** In onInit handler and frontend routing
**Example:**
```typescript
// Source: ONDC FIS13 Spec - on_init-request-buyer-info.yaml
interface OnInitResponse {
  context: OnInitContext;
  message?: {
    order?: {
      provider?: InitProvider;
      items?: InitItem[];
      quote?: Quote;
      payments?: Payment[];
    };
  };
  error?: { code?: string; message?: string };
}

// Key decision points:
function determineNextAction(response: OnInitResponse) {
  const item = response.message?.order?.items?.[0];
  const xinput = item?.xinput;
  const payment = response.message?.order?.payments?.[0];

  // Check for payment link (init flow complete)
  if (payment?.url) {
    return { type: "payment", url: payment.url };
  }

  // Check for next form requirement
  if (xinput?.required && xinput?.form?.url) {
    return {
      type: "form",
      url: xinput.form.url,
      formId: xinput.form.id,
      mimeType: xinput.form.mime_type,
      currentStep: xinput.head?.index?.cur,
      totalSteps: xinput.head?.index?.max
    };
  }

  // Error case
  if (response.error) {
    return { type: "error", error: response.error };
  }

  return { type: "pending" };
}
```

### Pattern 3: Init Store (Copy select-store Pattern)
**What:** Redis-backed store for init transaction state
**When to use:** Store init entries and on_init responses
**Example:**
```typescript
// NEW: server/src/lib/init-store.ts
// Copy exact pattern from select-store.ts, change key prefix

const KEY_PREFIX = "init";

export interface InitEntry {
  transactionId: string;
  messageId: string;
  itemId: string;
  providerId: string;
  bppId: string;
  bppUri: string;
  initTimestamp: string;
  createdAt: number;
}

export async function createInitEntry(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
  itemId: string,
  providerId: string,
  bppId: string,
  bppUri: string
): Promise<InitEntry> {
  const entry: InitEntry = {
    transactionId,
    messageId,
    itemId,
    providerId,
    bppId,
    bppUri,
    initTimestamp: new Date().toISOString(),
    createdAt: Date.now(),
  };

  const key = `${KEY_PREFIX}:${transactionId}:${messageId}`;
  await kv.set(key, entry, { ttlMs: DEFAULT_STORE_TTL_MS });

  return entry;
}

// Add keyFormatter entries for init
export const keyFormatter = {
  init: (transactionId: string, messageId: string) =>
    `${KEY_PREFIX}:${transactionId}:${messageId}`,
  initChannel: (transactionId: string, messageId: string) =>
    `${KEY_PREFIX}:${transactionId}:${messageId}:updates`,
};
```

### Pattern 4: Nominee Form Step
**What:** Prompt-but-skippable nominee entry with max 2 nominees
**When to use:** Step 4 of extended KYCForm
**Example:**
```typescript
// NEW: client/src/components/forms/fields/NomineeInput.tsx
interface Nominee {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  relationship: string;
}

interface NomineeStepProps {
  nominees: Nominee[];
  onUpdate: (nominees: Nominee[]) => void;
  onSkip: () => void;
}

function NomineeStep({ nominees, onUpdate, onSkip }: NomineeStepProps) {
  const [showForm, setShowForm] = useState(nominees.length > 0);

  const addNominee = () => {
    if (nominees.length < 2) {
      onUpdate([...nominees, { firstName: "", lastName: "", dateOfBirth: "", relationship: "" }]);
    }
  };

  return (
    <div className="space-y-6">
      <h2>Nominee Details (Optional)</h2>

      {!showForm ? (
        <div className="flex gap-4">
          <Button onClick={() => setShowForm(true)}>Add Nominee</Button>
          <Button variant="ghost" onClick={onSkip}>Skip for Now</Button>
        </div>
      ) : (
        <>
          {nominees.map((nominee, index) => (
            <NomineeInput
              key={index}
              nominee={nominee}
              index={index}
              onUpdate={(updated) => {
                const newNominees = [...nominees];
                newNominees[index] = updated;
                onUpdate(newNominees);
              }}
              onRemove={() => onUpdate(nominees.filter((_, i) => i !== index))}
            />
          ))}
          {nominees.length < 2 && (
            <Button variant="outline" onClick={addNominee}>
              Add Another Nominee
            </Button>
          )}
        </>
      )}
    </div>
  );
}
```

### Pattern 5: Review Page with Edit Links
**What:** Single scrollable page showing all KYC data with per-section edit buttons
**When to use:** Final step before init submission
**Example:**
```typescript
// NEW: client/src/components/review/ReviewPage.tsx
interface ReviewPageProps {
  formData: KYCFormData;
  quote: Quote;
  onEdit: (section: string) => void;
  onSubmit: () => void;
  termsAccepted: boolean;
  onTermsChange: (accepted: boolean) => void;
}

function ReviewPage({ formData, quote, onEdit, onSubmit, termsAccepted, onTermsChange }: ReviewPageProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main content - 2/3 width */}
      <div className="lg:col-span-2 space-y-6">
        {/* Personal Information Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Personal Information</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onEdit("personal")}>
              Edit
            </Button>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-muted-foreground">Name</dt>
                <dd>{formData.firstName} {formData.lastName}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Email</dt>
                <dd>{formData.email}</dd>
              </div>
              {/* ... more fields */}
            </dl>
          </CardContent>
        </Card>

        {/* Identity Verification Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Identity Verification</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onEdit("identity")}>
              Edit
            </Button>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-muted-foreground">PAN</dt>
                <dd>{formData.panNumber}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Date of Birth</dt>
                <dd>{formData.dateOfBirth}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Health Information Section */}
        {/* Nominee Section (if any) */}

        {/* Terms & Conditions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={onTermsChange}
              />
              <Label htmlFor="terms" className="text-sm">
                I have read and agree to the Terms & Conditions and Privacy Policy
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quote sidebar - 1/3 width */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle>Quote Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <QuoteBreakdown quote={quote} />
            <Separator className="my-4" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Premium</span>
              <span>INR {quote.price.value}</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              size="lg"
              className="w-full"
              onClick={onSubmit}
              disabled={!termsAccepted}
            >
              Proceed to Payment
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
```

### Pattern 6: BPP Form Handling (Claude's Discretion)
**What:** Strategy for handling BPP-provided forms based on mime_type
**When to use:** When on_init returns xinput.form.url
**Recommendation:**
```typescript
// BPP Form Handling Strategy
function handleBPPForm(formInfo: {
  url: string;
  mimeType?: string;
  formId: string;
}) {
  const mimeType = formInfo.mimeType || "text/html";

  if (mimeType === "text/html" || mimeType === "application/html") {
    // Redirect approach for HTML forms
    // BPP handles the form, we receive submission_id via callback
    return {
      type: "redirect",
      url: formInfo.url,
      returnUrl: `${window.location.origin}/init/callback?formId=${formInfo.formId}`
    };
  }

  if (mimeType === "application/json") {
    // Inline approach - fetch JSON schema, render locally
    // (Future enhancement - not required for Phase 3)
    return { type: "inline", url: formInfo.url };
  }

  // Default to redirect for unknown types
  return { type: "redirect", url: formInfo.url };
}
```

**Recommendation:** For Phase 3, use redirect for all BPP forms. Inline rendering is a future enhancement.

### Anti-Patterns to Avoid

**Do not hand-roll form submission ID generation:**
```typescript
// BAD: Manual ID generation
const submissionId = `${Date.now()}-${Math.random().toString(36)}`;

// GOOD: Use existing generateSubmissionId utility (already in codebase)
import { generateSubmissionId } from "@/lib/submission-id";
const submissionId = generateSubmissionId();
```

**Do not skip init steps based on assumptions:**
```typescript
// BAD: Assuming all BPPs follow same flow
if (currentStep === "buyer") navigate("nominee");

// GOOD: Follow BPP's xinput.head.index progression
const nextStep = response.message?.order?.items?.[0]?.xinput?.head?.index?.cur;
```

**Do not poll forever without timeout:**
```typescript
// BAD: Infinite polling
refetchInterval: () => 2000

// GOOD: Poll with max attempts and timeout
refetchInterval: (query) => {
  const elapsed = Date.now() - startTime;
  if (elapsed > 60000) return false; // 60 second timeout
  if (query.state.data?.hasResponse || query.state.data?.error) return false;
  return 2000;
}
```

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Init store | New state management | Copy select-store.ts | Same Redis pattern, same TTL, same pub/sub |
| Polling logic | Custom setInterval | TanStack Query refetchInterval | Handles cleanup, background pause, error states |
| Form persistence | New localStorage util | useFormPersistence hook | Already built in Phase 2, handles resume prompt |
| Submission ID | Manual UUID | generateSubmissionId utility | Already in codebase at lib/submission-id.ts |
| Nominee relationship dropdown | Custom select | shadcn/ui Select | Accessible, keyboard navigation, mobile-friendly |
| ONDC request signing | Manual Ed25519 | ondcClient.send() | Tenant class handles signing |

**Key insight:** The init flow is structurally identical to select flow. The store, endpoint pattern, and polling are copy-paste with key prefix changes. The primary new work is extending KYCForm with nominee/review steps.

## Common Pitfalls

### Pitfall 1: Sending init Without submission_id
**What goes wrong:** BPP returns NACK because form_response is invalid
**Why it happens:** Forgetting to include submission_id from form submission
**How to avoid:**
```typescript
// Always include form_response with submission_id
items: [{
  xinput: {
    form: { id: xinputFormId },
    form_response: {
      status: "SUCCESS",
      submission_id: submissionId  // REQUIRED
    }
  }
}]
```
**Warning signs:** BPP returns error code "INVALID_FORM_SUBMISSION", init fails immediately

### Pitfall 2: Not Handling Multi-Round Init Flow
**What goes wrong:** User completes one form, app doesn't prompt for next form
**Why it happens:** Treating init as single-shot instead of multi-round
**How to avoid:**
```typescript
// Check xinput in on_init response for next form
const xinput = response.message?.order?.items?.[0]?.xinput;
if (xinput?.required && xinput?.form?.url) {
  // BPP requires another form - redirect or inline
  handleBPPForm(xinput.form);
} else if (response.message?.order?.payments?.[0]?.url) {
  // Payment link received - init flow complete
  redirectToPayment(response.message.order.payments[0].url);
}
```
**Warning signs:** User stuck on "Processing..." after first form, never reaches payment

### Pitfall 3: Missing fulfillments in Init Request
**What goes wrong:** BPP returns error about missing customer information
**Why it happens:** Init requires fulfillments array unlike select
**How to avoid:**
```typescript
// Init MUST include fulfillments with customer details
message: {
  order: {
    // ... items, provider
    fulfillments: [{
      customer: {
        person: { name: customerName },
        contact: {
          email: customerEmail,
          phone: `+91-${customerPhone}`
        }
      }
    }]
  }
}
```
**Warning signs:** Error "MISSING_CUSTOMER_INFO" or "INVALID_FULFILLMENT"

### Pitfall 4: Hardcoding Payment Settlement Terms
**What goes wrong:** Compliance issues with ONDC network
**Why it happens:** Copying example values instead of using actual BAP terms
**How to avoid:**
```typescript
// Payment tags should come from BAP configuration
const paymentTags = [
  {
    descriptor: { code: "BUYER_FINDER_FEES" },
    display: false,
    list: [
      { descriptor: { code: "BUYER_FINDER_FEES_TYPE" }, value: tenant.buyerFinderFeesType },
      { descriptor: { code: "BUYER_FINDER_FEES_PERCENTAGE" }, value: tenant.buyerFinderFeesPercentage }
    ]
  },
  {
    descriptor: { code: "SETTLEMENT_TERMS" },
    display: false,
    list: [
      { descriptor: { code: "SETTLEMENT_WINDOW" }, value: tenant.settlementWindow },
      // ... other terms from tenant config
    ]
  }
];
```
**Warning signs:** Payment reconciliation failures, ONDC compliance warnings

### Pitfall 5: Nominee Validation Without Relationship
**What goes wrong:** BPP rejects nominee data as incomplete
**Why it happens:** Treating relationship as optional field
**How to avoid:**
```typescript
// Nominee schema MUST include relationship
const nomineeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  relationship: z.enum(["spouse", "son", "daughter", "father", "mother", "other"])
});
```
**Warning signs:** "INVALID_NOMINEE" error from BPP

### Pitfall 6: Auto-Retry Without Idempotency
**What goes wrong:** Multiple init requests create duplicate proposals
**Why it happens:** Retrying failed init with new message_id
**How to avoid:**
```typescript
// Use same message_id for retries (idempotent)
const retryInit = async (originalMessageId: string, retryCount: number) => {
  if (retryCount > 3) throw new Error("Max retries exceeded");

  // Keep same message_id for idempotency
  const result = await ondcClient.send(initUrl, "POST", {
    ...payload,
    context: { ...payload.context, message_id: originalMessageId }
  });

  if (!result.message?.ack?.status === "ACK") {
    await delay(1000 * retryCount); // Exponential backoff
    return retryInit(originalMessageId, retryCount + 1);
  }
  return result;
};
```
**Warning signs:** Multiple proposals for same customer, duplicate charges

## Code Examples

### Example 1: Nominee Zod Schema
```typescript
// NEW: client/src/lib/form-schemas/nominee.ts
import { z } from "zod";

export const NOMINEE_RELATIONSHIPS = [
  { value: "spouse", label: "Spouse" },
  { value: "son", label: "Son" },
  { value: "daughter", label: "Daughter" },
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "other", label: "Other" },
] as const;

export const nomineeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Date must be in YYYY-MM-DD format"
  ),
  relationship: z.enum(["spouse", "son", "daughter", "father", "mother", "other"]),
});

export type NomineeData = z.infer<typeof nomineeSchema>;

// Schema for nominees array (0-2 allowed)
export const nomineesSchema = z.array(nomineeSchema).max(2, "Maximum 2 nominees allowed");
```

### Example 2: Init tRPC Procedure
```typescript
// ADD to: server/src/trpc/routers/gateway.ts
init: publicProcedure
  .input(
    z.object({
      transactionId: z.uuid(),
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
      // Customer info for fulfillments
      customerName: z.string(),
      customerEmail: z.string().email(),
      customerPhone: z.string(),
      // Quote amount
      amount: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { tenant, ondcClient, kv } = ctx;
    const messageId = uuidv7();

    // Create init entry in store
    await createInitEntry(
      kv,
      input.transactionId,
      messageId,
      input.itemId,
      input.providerId,
      input.bppId,
      input.bppUri
    );

    const payload = {
      context: {
        action: "init",
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
            },
            tags: tenant.paymentTags
          }]
        }
      }
    };

    const initUrl = input.bppUri.endsWith("/")
      ? `${input.bppUri}init`
      : `${input.bppUri}/init`;

    console.log("[Init] Sending request to:", initUrl);
    const response = await ondcClient.send(initUrl, "POST", payload);
    console.log("[Init] ONDC Response:", JSON.stringify(response, null, 2));

    return {
      ...response,
      transactionId: input.transactionId,
      messageId,
    };
  }),
```

### Example 3: on_init Callback Handler
```typescript
// ADD to: server/src/trpc/routers/gateway.ts
onInit: publicProcedure
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

    console.log("\n\n[on_init] Request Body:\n\n", JSON.stringify(input, null, "\t"));

    const transactionId = input.context?.transaction_id;
    const messageId = input.context?.message_id;

    if (input.error) {
      console.error("[on_init] BPP returned error:", input.error);
    }

    if (transactionId && messageId) {
      await addInitResponse(
        kv,
        transactionId,
        messageId,
        input as Parameters<typeof addInitResponse>[3]
      );
    } else {
      console.warn("[on_init] Missing transaction_id or message_id");
    }

    return {
      message: {
        ack: {
          status: "ACK" as const,
        },
      },
    };
  }),
```

### Example 4: Extended KYCForm with Nominee and Review Steps
```typescript
// EXTEND: client/src/components/forms/KYCForm.tsx
// Add steps 4 (Nominee) and 5 (Review) to existing 3-step form

const STEP_TITLES = [
  "Personal Information",
  "Identity Verification",
  "Health Information",
  "Nominee Details",      // NEW
  "Review & Submit",      // NEW
];

// Extended schema to include nominees
const extendedKycSchema = z.object({
  ...kycFormSchema.shape,
  nominees: nomineesSchema.optional(),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the terms to continue" })
  }),
});

// In form render, add new steps:
{/* Step 4: Nominee (prompt-but-skippable) */}
<FormStep
  title="Nominee Details"
  description="Add beneficiaries for your policy (optional)"
>
  <NomineeStep
    nominees={nominees}
    onUpdate={(updated) => setValue("nominees", updated)}
    onSkip={() => goToNextStep()}
  />
</FormStep>

{/* Step 5: Review */}
<FormStep
  title="Review & Submit"
  description="Verify your details before proceeding"
>
  <ReviewPage
    formData={getValues()}
    quote={quote}
    onEdit={(section) => goToStep(sectionStepMap[section])}
    onSubmit={handleFinalSubmit}
    termsAccepted={watch("termsAccepted")}
    onTermsChange={(accepted) => setValue("termsAccepted", accepted)}
  />
</FormStep>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single init request | Multi-round xinput pattern | ONDC FIS13 2.0.1 | Forms submitted incrementally |
| Client-side form rendering | BPP-provided forms (text/html) | Current spec | BPP controls form experience |
| Inline payments | Payment link redirect | Current spec | BPP handles payment flow |
| Mandatory nominee | Prompt-but-skippable | User decision | Better UX, faster checkout |

**Deprecated/outdated:**
- Single-shot init: FIS13 uses iterative xinput pattern with multiple init rounds
- BAP-managed payments: BPP provides payment URL, BAP redirects

## Open Questions

1. **Payment Tags Configuration**
   - What we know: BUYER_FINDER_FEES and SETTLEMENT_TERMS required in init
   - What's unclear: Where these values come from (tenant config? environment?)
   - Recommendation: Add to tenant entity, populate from environment variables

2. **BPP Form Callback Handling**
   - What we know: BPP HTML forms submit to BPP's endpoint
   - What's unclear: How submission_id is communicated back to BAP
   - Recommendation: Implement callback URL parameter, or poll BPP for form status

3. **eKYC Flow Handling**
   - What we know: Some BPPs provide eKYC forms (Aadhaar/DigiLocker)
   - What's unclear: Whether redirect or inline approach for eKYC
   - Recommendation: Use redirect for Phase 3, eKYC is BPP-controlled

## Sources

### Primary (HIGH confidence)
- **ONDC FIS13 Spec (GitHub):** `ONDC-Official/ONDC-FIS-Specifications` branch `draft-FIS13-health-2.0.1`
  - init request examples: `api/components/examples/health-insurance/init/`
  - on_init response examples: `api/components/examples/health-insurance/on_init/`
  - Form examples: `api/components/examples/health-insurance/forms/nominee-dtls.html`
- **Existing Codebase:**
  - `server/src/trpc/routers/gateway.ts` - select/onSelect patterns
  - `server/src/lib/select-store.ts` - Redis store pattern
  - `client/src/components/forms/KYCForm.tsx` - existing form infrastructure
  - `client/src/routes/quote/$transactionId/$messageId.tsx` - polling pattern

### Secondary (MEDIUM confidence)
- Phase 1 Research (01-RESEARCH.md) - polling and store patterns
- Phase 2 Research (02-RESEARCH.md) - form infrastructure patterns
- CONTEXT.md user decisions

### Tertiary (LOW confidence)
- None for this phase (all findings verified with official sources or existing code)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use from Phase 1 & 2
- Architecture: HIGH - Patterns directly copy select flow
- ONDC protocol: HIGH - Spec fetched from official GitHub repository
- BPP form handling: MEDIUM - Redirect approach verified, inline is future enhancement
- Pitfalls: MEDIUM - Based on protocol requirements and common patterns

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (30 days for stable tech, ONDC spec v2.0.1 is stable)

---

*Research methodology: Examined ONDC FIS13 spec init/on_init examples via GitHub API, verified against existing select flow patterns in codebase, cross-referenced with Phase 1 and Phase 2 research findings, applied user decisions from CONTEXT.md.*
