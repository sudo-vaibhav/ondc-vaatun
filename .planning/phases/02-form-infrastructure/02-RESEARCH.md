# Phase 2: Form Infrastructure - Research

**Researched:** 2026-02-03
**Domain:** Multi-step form system with React, animations, and state persistence
**Confidence:** HIGH

## Summary

This research investigates the technical approach for building a Typeform-style multi-step form infrastructure in React. The codebase already uses React Hook Form patterns (via manual state management in `PurchaserInfoDialog`) and Zod for validation. The motion library is already installed (v12.15.0) and used for animations.

The standard approach for multi-step forms in React combines React Hook Form with Zod for type-safe validation, uses localStorage for state persistence, and leverages the motion library's AnimatePresence for smooth slide transitions. The existing codebase patterns (shadcn/ui components, Zod schemas, motion usage) align well with this approach.

**Primary recommendation:** Build a reusable `MultiStepForm` component using React Hook Form with `mode: 'onBlur'` for validation, motion's AnimatePresence with direction-aware variants for slide transitions, and a custom `useFormPersistence` hook for localStorage auto-save on blur.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hook-form | 7.x | Form state management | Already used pattern in codebase; minimal re-renders, uncontrolled components by default |
| @hookform/resolvers | 3.x | Validation integration | Bridges Zod schemas to React Hook Form |
| zod | 4.x | Schema validation & types | Already in codebase (v4.3.6); single source of truth for validation + TypeScript types |
| motion | 12.x | Slide animations | Already installed (v12.15.0); AnimatePresence for exit animations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui Form components | latest | Form field wrappers | Already available - Input, Label, Checkbox, Select components exist |
| @radix-ui/react-collapsible | 1.x | PED "Other" field expand | Already installed; use for conditional "Other" text field |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-hook-form | TanStack Form | TanStack Form has better TypeScript inference but RHF is more mature, widely adopted, and matches existing codebase patterns |
| Manual localStorage | little-state-machine | LSM adds abstraction; manual localStorage is simpler and sufficient for this use case |
| motion | react-spring | motion already installed and used; no need to add another animation library |

**Installation:**
```bash
# Only need to add react-hook-form and resolver (zod and motion already installed)
pnpm add react-hook-form @hookform/resolvers
```

## Architecture Patterns

### Recommended Project Structure
```
client/src/
├── components/
│   ├── forms/                    # New form infrastructure
│   │   ├── MultiStepForm.tsx     # Core multi-step container
│   │   ├── FormStep.tsx          # Individual step wrapper
│   │   ├── StepProgress.tsx      # Progress indicator
│   │   ├── FormField.tsx         # Enhanced field with error display
│   │   ├── ResumePrompt.tsx      # "Resume where you left off?" dialog
│   │   └── fields/               # Specialized field components
│   │       ├── PANInput.tsx      # PAN formatting on blur
│   │       ├── PhoneInput.tsx    # Phone formatting on blur
│   │       ├── DateInput.tsx     # DOB formatting on blur
│   │       └── PEDSelector.tsx   # Checkbox list + "Other"
│   └── ui/                       # Existing shadcn components
├── hooks/
│   └── useFormPersistence.ts     # localStorage auto-save hook
└── lib/
    └── form-schemas/             # Zod schemas for form steps
        ├── personal-info.ts
        ├── pan-dob.ts
        └── ped.ts
```

### Pattern 1: Multi-Step Form with Direction-Aware Animations

**What:** Wrapper component that manages step state and provides slide animations between steps
**When to use:** All multi-step KYC forms in the application

**Example:**
```typescript
// Source: https://sinja.io/blog/direction-aware-animations-in-framer-motion
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

type Direction = "forward" | "back";

const slideVariants = {
  initial: (direction: Direction) => ({
    x: direction === "forward" ? "100%" : "-100%",
    opacity: 0,
  }),
  animate: {
    x: "0%",
    opacity: 1,
  },
  exit: (direction: Direction) => ({
    x: direction === "forward" ? "-100%" : "100%",
    opacity: 0,
  }),
};

interface MultiStepFormProps<T> {
  steps: React.ComponentType<{ data: T; onUpdate: (data: Partial<T>) => void }>[];
  initialData: T;
  onComplete: (data: T) => void;
}

function MultiStepForm<T>({ steps, initialData, onComplete }: MultiStepFormProps<T>) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<Direction>("forward");
  const [formData, setFormData] = useState<T>(initialData);

  const goNext = () => {
    setDirection("forward");
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const goPrev = () => {
    setDirection("back");
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const CurrentStepComponent = steps[currentStep];

  return (
    <div className="overflow-hidden">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          variants={slideVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          <CurrentStepComponent
            data={formData}
            onUpdate={(updates) => setFormData((prev) => ({ ...prev, ...updates }))}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
```

### Pattern 2: React Hook Form with onBlur Validation

**What:** Form configuration that validates fields when user leaves them (blur event)
**When to use:** All form steps - matches user decision for validation timing

**Example:**
```typescript
// Source: https://react-hook-form.com/docs/useform
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const personalInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid 10-digit mobile number"),
});

type PersonalInfoData = z.infer<typeof personalInfoSchema>;

function PersonalInfoStep({ onNext }: { onNext: (data: PersonalInfoData) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonalInfoData>({
    resolver: zodResolver(personalInfoSchema),
    mode: "onBlur", // Validate on blur - matches user decision
    reValidateMode: "onBlur", // Re-validate on blur after first error
  });

  return (
    <form onSubmit={handleSubmit(onNext)}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            {...register("firstName")}
            id="firstName"
            aria-invalid={!!errors.firstName}
          />
          {errors.firstName && (
            <p className="text-xs text-destructive mt-1">{errors.firstName.message}</p>
          )}
        </div>
        {/* ... more fields */}
      </div>
    </form>
  );
}
```

### Pattern 3: localStorage Persistence with Auto-Save on Blur

**What:** Custom hook that persists form state to localStorage on every blur event
**When to use:** All multi-step forms to enable resume functionality

**Example:**
```typescript
// Source: https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/
import { useEffect, useCallback, useRef } from "react";

const STORAGE_KEY_PREFIX = "ondc-form-";

interface UseFormPersistenceOptions<T> {
  formId: string;
  defaultValues: T;
  onRestore?: (data: T) => void;
}

function useFormPersistence<T>({ formId, defaultValues, onRestore }: UseFormPersistenceOptions<T>) {
  const storageKey = `${STORAGE_KEY_PREFIX}${formId}`;
  const hasRestoredRef = useRef(false);

  // Check if there's stored data on mount
  const getStoredData = useCallback((): T | null => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [storageKey]);

  // Save on blur
  const saveData = useCallback((data: T) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn("[FormPersistence] Failed to save:", error);
    }
  }, [storageKey]);

  // Clear on submission
  const clearData = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  // Check for existing data
  const hasStoredData = useCallback(() => {
    return getStoredData() !== null;
  }, [getStoredData]);

  return {
    getStoredData,
    saveData,
    clearData,
    hasStoredData,
  };
}
```

### Pattern 4: Input Formatting on Blur

**What:** Format input values (PAN, phone, DOB) when user leaves the field
**When to use:** PAN, phone, and DOB fields - as specified in user decisions

**Example:**
```typescript
// PAN formatting: uppercase, no spaces
function formatPAN(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
}

// Phone formatting: remove non-digits, limit to 10
function formatPhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

// DOB formatting: ensure YYYY-MM-DD format
function formatDOB(value: string): string {
  // If already in date format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  // Otherwise try to parse and format
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toISOString().split("T")[0];
}

// Usage in a form field
<Input
  {...register("panNumber")}
  onBlur={(e) => {
    const formatted = formatPAN(e.target.value);
    setValue("panNumber", formatted);
    // Trigger RHF's onBlur for validation
    register("panNumber").onBlur(e);
  }}
/>
```

### Anti-Patterns to Avoid

- **Re-rendering entire form on each keystroke:** Use React Hook Form's uncontrolled inputs to avoid this
- **Validating in real-time for complex validations:** Only validate on blur as per user decision
- **Storing sensitive data in localStorage:** Never persist passwords, full credit card numbers, or authentication tokens
- **Using AnimatePresence without unique keys:** Each step must have a unique `key` for animations to work
- **Formatting input as user types:** Format on blur only - real-time formatting disrupts typing flow

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form state management | Custom useState for each field | react-hook-form | Handles dirty tracking, touched state, error state, submission |
| Validation | Manual if/else validation | Zod + @hookform/resolvers | Type inference, composable, testable schemas |
| Exit animations | CSS transitions with timeouts | motion AnimatePresence | Handles React tree removal, waits for animation completion |
| Input formatting | Manual string manipulation on every keystroke | Format on blur only | Simpler, doesn't fight with cursor position issues |
| Progress indicator | DIY progress bar | Dedicated StepProgress component | Consistent styling, accessibility (aria-valuenow) |

**Key insight:** Form state management is deceptively complex. Re-render optimization, dirty tracking, validation timing, and error state management have many edge cases. React Hook Form handles these with a mature, well-tested implementation.

## Common Pitfalls

### Pitfall 1: Animation Direction on Exit
**What goes wrong:** Exiting components animate in wrong direction because they no longer receive updated props
**Why it happens:** When React removes a component, it can't receive new props
**How to avoid:** Pass `custom` prop to AnimatePresence, not to motion component directly
**Warning signs:** Step slides out in the same direction it slid in

### Pitfall 2: localStorage Hydration Mismatch
**What goes wrong:** SSR/initial render doesn't match client-side hydrated state
**Why it happens:** localStorage is unavailable during server render
**How to avoid:** Use lazy initialization with useEffect, or check `typeof window !== "undefined"`
**Warning signs:** React hydration warnings, flash of default content

### Pitfall 3: Form State Lost Between Steps
**What goes wrong:** Data entered in step 1 disappears when going to step 2 and back
**Why it happens:** Each step unmounts and remounts with fresh state
**How to avoid:** Lift form state to parent MultiStepForm component, or use form-wide React Hook Form instance
**Warning signs:** Fields reset when navigating between steps

### Pitfall 4: Validation Triggers Too Early
**What goes wrong:** Errors appear before user finishes typing
**Why it happens:** Using `mode: 'onChange'` instead of `mode: 'onBlur'`
**How to avoid:** Configure useForm with `mode: 'onBlur'` as specified in user decisions
**Warning signs:** Error messages flashing during typing

### Pitfall 5: Cursor Position Jumps During Formatting
**What goes wrong:** When formatting input in real-time, cursor jumps to end
**Why it happens:** Replacing the entire value resets cursor position
**How to avoid:** Format on blur only, not on every keystroke
**Warning signs:** User can't edit middle of input

## Code Examples

### PAN Validation Schema
```typescript
// Source: https://www.geeksforgeeks.org/how-to-validate-pan-card-number-using-regular-expression/
const panSchema = z.string()
  .length(10, "PAN must be exactly 10 characters")
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format (e.g., ABCDE1234F)");
```

### Indian Phone Number Validation
```typescript
// Source: https://medium.com/@abhishekmailservices/validating-indian-phone-numbers-using-regular-expressions-regex-db4670bbc5d5
const phoneSchema = z.string()
  .length(10, "Phone must be 10 digits")
  .regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number");
```

### PED Selector Component Structure
```typescript
// Based on existing PurchaserInfoDialog pattern in codebase
const pedCategories = [
  { id: "diabetes", label: "Diabetes" },
  { id: "bloodPressure", label: "Blood Pressure / Hypertension" },
  { id: "heartAilments", label: "Heart Ailments" },
  { id: "asthma", label: "Asthma / Respiratory" },
  { id: "thyroid", label: "Thyroid Disorders" },
  { id: "cancer", label: "Cancer" },
  { id: "other", label: "Other" },
] as const;

// "Other" field visibility controlled by Collapsible (already installed)
```

### Progress Indicator (Claude's Discretion - Recommendation)
```typescript
// Recommendation: Step indicator with numbered circles (clearer than bar for 3-5 steps)
function StepProgress({ currentStep, totalSteps, stepTitles }: StepProgressProps) {
  return (
    <div className="flex items-center justify-between mb-6" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={totalSteps}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div key={index} className="flex items-center">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center border-2 font-semibold transition-colors",
              index < currentStep && "bg-primary border-primary text-primary-foreground",
              index === currentStep && "border-primary text-primary",
              index > currentStep && "border-muted-foreground text-muted-foreground"
            )}
          >
            {index + 1}
          </div>
          {index < totalSteps - 1 && (
            <div className={cn(
              "h-0.5 w-12 mx-2 transition-colors",
              index < currentStep ? "bg-primary" : "bg-muted"
            )} />
          )}
        </div>
      ))}
    </div>
  );
}
```

### Transition Configuration (Claude's Discretion - Recommendation)
```typescript
// Recommendation: Spring animation for natural feel, 300ms duration
const slideTransition = {
  type: "spring",
  damping: 25,      // Reduces bounce
  stiffness: 300,   // Responsive but not snappy
  mass: 0.8,        // Slightly lighter for quicker response
};
// Effective duration: ~300ms to settle
```

### Field Label Placement (Claude's Discretion - Recommendation)
```typescript
// Recommendation: Labels above fields (standard form pattern, better for mobile)
<div className="space-y-2">
  <Label htmlFor="email">Email Address</Label>
  <Input id="email" {...register("email")} />
  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
</div>
```

### "Other" Text Field Behavior (Claude's Discretion - Recommendation)
```typescript
// Recommendation: Animate expand with Collapsible (already in codebase)
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// When "Other" checkbox is checked, smoothly reveal text input
<Collapsible open={pedSelections.other}>
  <CollapsibleContent>
    <div className="mt-2 ml-6">
      <Input
        placeholder="Please describe your condition"
        {...register("pedOtherDescription")}
      />
    </div>
  </CollapsibleContent>
</Collapsible>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Controlled inputs with useState | Uncontrolled inputs with React Hook Form | 2020+ | Fewer re-renders, better performance |
| Custom validation logic | Zod schema + resolver | 2022+ | Type inference, composable schemas |
| framer-motion package | motion package | 2024 | Same API, rebranded, unified React/JS/Vue |
| Form-per-step pattern | Single form with stepped visibility | Current | Simpler state management, validation across steps |

**Deprecated/outdated:**
- Formik: Still works but React Hook Form has better performance characteristics
- Manual form state with useState: Loses dirty tracking, touched state, validation timing

## Open Questions

1. **Submission ID Generation**
   - What we know: ONDC protocol requires submission_id for compliance
   - What's unclear: Whether this should be UUID v4, or if ONDC specifies a format
   - Recommendation: Use `crypto.randomUUID()` (available in modern browsers) and verify against ONDC spec

2. **PED Category List**
   - What we know: Common categories include diabetes, blood pressure, heart ailments, asthma, thyroid, cancer
   - What's unclear: Whether ONDC FIS13 spec defines a canonical list
   - Recommendation: Use the categories from existing `PurchaserInfoDialog` as starting point, verify against ONDC health insurance spec

## Sources

### Primary (HIGH confidence)
- React Hook Form official docs - useForm mode configuration, validation timing
- motion.dev docs - AnimatePresence, direction-aware animations
- Existing codebase - `PurchaserInfoDialog.tsx`, `purchaser-context.tsx`, `RotatingText.tsx`

### Secondary (MEDIUM confidence)
- [Direction-aware animations in Framer Motion](https://sinja.io/blog/direction-aware-animations-in-framer-motion) - custom prop pattern verified against motion docs
- [shadcn/ui Form documentation](https://ui.shadcn.com/docs/components/form) - React Hook Form integration
- [Building multi-step forms with RHF and Zod](https://blog.logrocket.com/building-reusable-multi-step-form-react-hook-form-zod/) - architecture patterns

### Tertiary (LOW confidence)
- PAN regex pattern from multiple sources - verify against actual PAN format requirements
- Indian phone number regex - verify coverage of all valid prefixes

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries already in codebase or well-established
- Architecture: HIGH - Patterns verified against official docs and existing codebase
- Pitfalls: MEDIUM - Based on common issues documented in community discussions
- Validation patterns: MEDIUM - Regex patterns should be tested against real data

**Research date:** 2026-02-03
**Valid until:** 60 days (stable libraries, patterns unlikely to change)
