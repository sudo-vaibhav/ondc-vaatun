---
phase: 02-form-infrastructure
plan: 01
subsystem: forms
tags: [react-hook-form, zod, validation, localStorage, formatters]

dependency-graph:
  requires: [01-select-flow]
  provides: [form-infrastructure, zod-schemas, persistence-hook, formatters]
  affects: [02-02, 02-03, 02-04]

tech-stack:
  added:
    - react-hook-form@7.71.1
    - "@hookform/resolvers@5.2.2"
  patterns:
    - Zod schemas for form validation
    - localStorage persistence for form state
    - Blur-time formatting for input fields

key-files:
  created:
    - client/src/hooks/useFormPersistence.ts
    - client/src/lib/form-schemas/personal-info.ts
    - client/src/lib/form-schemas/pan-dob.ts
    - client/src/lib/form-schemas/ped.ts
    - client/src/lib/form-formatters.ts
  modified:
    - client/package.json
    - pnpm-lock.yaml

decisions:
  - key: form-library
    choice: react-hook-form with @hookform/resolvers
    reason: Performant uncontrolled inputs, mature library, Zod integration

metrics:
  duration: 4 min
  completed: 2026-02-03
---

# Phase 2 Plan 1: Form Foundation Summary

React Hook Form dependencies installed with Zod schemas for personal info, PAN/DOB, and PED validation plus localStorage persistence hook and blur-time formatters.

## What Was Built

### 1. Dependencies Installed

```json
{
  "react-hook-form": "^7.71.1",
  "@hookform/resolvers": "^5.2.2"
}
```

### 2. useFormPersistence Hook

**File:** `client/src/hooks/useFormPersistence.ts`

Provides localStorage-based form state persistence:

```typescript
const { getStoredData, saveData, clearData, hasStoredData } = useFormPersistence<T>({
  formId: "health-kyc"
});
```

- Storage key pattern: `ondc-form-{formId}`
- SSR-safe with `typeof window` checks
- Used on blur events per CONTEXT.md

### 3. Zod Form Schemas

**personal-info.ts** - 8 fields with validation:
- `firstName`, `lastName`: min 1 char
- `email`: valid email format
- `phone`: Indian mobile regex `/^[6-9]\d{9}$/`
- `address`: min 1 char
- `pincode`: exactly 6 digits
- `city`, `state`: min 1 char

**pan-dob.ts** - KYC identity fields:
- `panNumber`: regex `/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/` (e.g., ABCDE1234F)
- `dateOfBirth`: required string

**ped.ts** - Pre-existing disease selection:
- `hasPED`: boolean
- `conditions`: object with 7 boolean fields (diabetes, bloodPressure, heartAilments, asthma, thyroid, cancer, other)
- `otherDescription`: conditionally required when `conditions.other` is true
- Exports `pedConditionLabels` for UI display

### 4. Form Formatters

**File:** `client/src/lib/form-formatters.ts`

All formatters applied on blur (not real-time) per CONTEXT.md:

| Function | Transform | Example |
|----------|-----------|---------|
| `formatPAN` | Uppercase, alphanumeric, max 10 | "abcde 1234f" -> "ABCDE1234F" |
| `formatPhone` | Digits only, max 10 | "98765-43210" -> "9876543210" |
| `formatDOB` | ISO YYYY-MM-DD | "Jan 15, 2024" -> "2024-01-15" |
| `formatPincode` | Digits only, max 6 | "110 001" -> "110001" |

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| ef61327 | chore | Install react-hook-form dependencies |
| 5bf0a73 | feat | Create useFormPersistence hook and Zod schemas |
| f456da4 | feat | Create form input formatters |

## Next Phase Readiness

All infrastructure ready for Plan 02 (MultiStepForm component):
- React Hook Form available for form state management
- Zod schemas ready to wire with `zodResolver`
- Persistence hook ready for blur-time auto-save
- Formatters ready for input field blur handlers

## Usage Example

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { personalInfoSchema, PersonalInfoData } from "@/lib/form-schemas/personal-info";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { formatPhone, formatPincode } from "@/lib/form-formatters";

function PersonalInfoStep() {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<PersonalInfoData>({
    resolver: zodResolver(personalInfoSchema),
    mode: "onBlur",
  });

  const { saveData, getStoredData } = useFormPersistence<PersonalInfoData>({
    formId: "health-kyc-personal"
  });

  // Restore on mount, save on blur
  // Format phone on blur: setValue("phone", formatPhone(value))
}
```
