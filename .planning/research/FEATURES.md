# Features Research: ONDC Health Insurance BAP

**Research Date:** 2026-02-02
**Source:** ONDC-Official/ONDC-FIS-Specifications (branch: draft-FIS13-health-2.0.1)

## Executive Summary

Health insurance on ONDC involves a multi-step form journey where the BPP controls the form sequence. The BAP's job is to render these forms, collect user input, and submit back. Key features needed are form rendering, state persistence across steps, and clear progress indication.

## User Journey

```
[Search Results] → [Select Product] → [Fill Forms 1-3] → [Review Quote]
                                           ↓
[Policy Issued] ← [Payment] ← [Final Review] ← [Fill Forms 4-6]
```

## Features by Flow Stage

### 1. Select Stage (Quote Request)

**Table Stakes:**
- Display product from on_search (name, coverage, premium)
- Show add-ons if available
- "Get Quote" button triggers select

**User Sees:**
- Product card with coverage details
- Premium estimate (may change after forms)
- List of add-ons with prices

**Data Collected:**
- Selected item ID
- Selected add-on IDs
- (Forms come in on_select response)

---

### 2. XInput Forms Stage (PED/PAN/eKYC)

**Table Stakes:**
- Render BPP-provided HTML forms
- Show progress indicator (step X of Y)
- Handle form submission
- Show validation errors

**User Sees:**
- Progress bar: "Step 1 of 3: PED Details"
- Form from BPP (embedded or rendered)
- Next/Submit button

**Forms Typically Required (from spec examples):**

| Step | Form | Fields |
|------|------|--------|
| 1 | PED Details | Pre-existing diseases, conditions |
| 2 | PAN & DOB | PAN number, date of birth |
| 3 | eKYC | Aadhaar-based verification |

**Technical Note:** Forms are HTML served from BPP URL. Can be:
- Rendered in iframe
- Fetched and re-styled (risky, may break)
- Opened in new tab (poor UX)

---

### 3. Init Stage (KYC/Medical/Nominee)

**Table Stakes:**
- Continue form sequence from on_init responses
- Collect detailed personal information
- Show updated premium after each step

**User Sees:**
- More detailed forms for insurance application
- Running total of premium
- Form validation feedback

**Forms Typically Required:**

| Step | Form | Fields |
|------|------|--------|
| 1 | Buyer Info | Name, address, contact |
| 2 | Insured Info | Who is covered (self/family) |
| 3 | Medical Info | Health conditions, medications |
| 4 | Nominee Info | Beneficiary details |
| 5 | Review | Final terms acceptance |

---

### 4. Quote Review Stage

**Table Stakes:**
- Display final quote with all details
- Show coverage breakdown
- Show premium breakdown
- Display terms and conditions
- "Proceed to Pay" button

**User Sees:**
```
Health Gain Plus Individual
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Coverage: ₹1,00,00,000
Co-payment: Yes (20%)
Room Rent Cap: ₹25,000/day
Cashless Hospitals: 50+

Premium: ₹15,000/year
Add-ons: ₹1,000
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: ₹16,000/year

[✓] I accept the terms and conditions
[Proceed to Payment]
```

---

### 5. Confirm Stage (Payment)

**Table Stakes:**
- Redirect to payment gateway (from on_init)
- Handle payment success/failure
- Send confirm on success
- Show policy on on_confirm

**User Sees:**
- Payment page (BPP's payment gateway)
- Loading state during confirmation
- Success/failure message

**Payment Flow:**
1. on_init provides `payments[].url` for payment gateway
2. User completes payment on gateway
3. Gateway redirects back with status
4. BAP sends confirm with payment reference
5. on_confirm returns policy document

---

### 6. Status Stage (Post-Purchase)

**Table Stakes:**
- View policy document
- Check policy status
- Download policy PDF

**User Sees:**
- Policy number
- Coverage period
- Download links
- Status (Active/Processing/etc.)

---

## Feature Priority Matrix

| Feature | Priority | Complexity | Notes |
|---------|----------|------------|-------|
| Product selection UI | P0 | Low | Reuse search results card |
| XInput form rendering | P0 | Medium | Core of the flow |
| Progress indicator | P0 | Low | UX essential |
| Quote review page | P0 | Low | Display only |
| Payment redirect | P0 | Medium | Gateway integration |
| Policy display | P0 | Low | Display only |
| Form re-submission | P1 | Medium | Error recovery |
| Form validation | P1 | Medium | BPP may handle |
| Premium live update | P2 | Low | Nice to have |
| Multiple insured | P2 | High | Family plans |

## Out of Scope (v1)

- **Offline form caching** — Requires complex state management
- **Form pre-filling** — User data management not in scope
- **Comparison view** — Protocol doesn't support well
- **Renewal flow** — Focus on new purchase first
- **Claims filing** — Separate flow entirely

---

*Features analysis: 2026-02-02 | Source: ONDC FIS13 Health 2.0.1 examples*
