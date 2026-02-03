# Requirements: ONDC Health Insurance BAP

**Version:** 1.0
**Last Updated:** 2026-02-03

## v1 Requirements

### Select Flow

- [x] **SEL-01**: User can select a health insurance product from search results
- [x] **SEL-02**: select endpoint sends properly signed request to BPP
- [x] **SEL-03**: on_select callback stores quote details in Redis
- [x] **SEL-04**: Quote display page shows coverage amount, premium, co-payment, room rent cap
- [x] **SEL-05**: Quote display shows add-ons with prices

### Custom Form UI

- [x] **FORM-01**: Typeform-style multi-step form component with smooth transitions
- [x] **FORM-02**: Progress indicator showing current step and total steps
- [x] **FORM-03**: Form fields based on ONDC spec (not BPP HTML)
- [x] **FORM-04**: PED (Pre-Existing Disease) form with condition selection
- [x] **FORM-05**: PAN & DOB form with validation
- [x] **FORM-06**: Personal info form (name, address, contact)
- [x] **FORM-07**: Form state persists across page refreshes
- [x] **FORM-08**: Form submission generates submission_id for ONDC protocol

### Init Flow

- [ ] **INIT-01**: init endpoint sends KYC data to BPP
- [ ] **INIT-02**: on_init callback stores response with payment link
- [ ] **INIT-03**: Buyer information form (proposer details)
- [ ] **INIT-04**: Insured information form (who is covered)
- [ ] **INIT-05**: Medical history form with health questions
- [ ] **INIT-06**: Nominee information form (beneficiary details)
- [ ] **INIT-07**: Review page showing all entered data before payment

### Confirm Flow

- [ ] **CONF-01**: Payment redirect to BPP's payment gateway
- [ ] **CONF-02**: Payment callback handler for success/failure
- [ ] **CONF-03**: confirm endpoint sends payment confirmation to BPP
- [ ] **CONF-04**: on_confirm callback stores policy document
- [ ] **CONF-05**: Success page with policy summary

### Status Flow

- [ ] **STAT-01**: status endpoint queries order status from BPP
- [ ] **STAT-02**: on_status callback handler
- [ ] **STAT-03**: Policy view page with document display
- [ ] **STAT-04**: Policy download capability (PDF if available)

### Protocol Context

- [ ] **CTX-01**: ONDC FIS13 health insurance reference docs in codebase
- [ ] **CTX-02**: Example payloads for each endpoint documented
- [ ] **CTX-03**: Zod schemas for all request/response types

### Testing

- [ ] **TEST-01**: E2E tests for select flow
- [ ] **TEST-02**: E2E tests for init flow
- [ ] **TEST-03**: E2E tests for confirm flow
- [ ] **TEST-04**: E2E tests for status flow

### Infrastructure

- [ ] **INFRA-01**: Transaction state machine for flow tracking
- [ ] **INFRA-02**: Form state persistence in Redis
- [ ] **INFRA-03**: TTL handling for expired transactions

---

## v2 Requirements (Deferred)

- [ ] Family plans with multiple insured members
- [ ] Form pre-filling from saved profiles
- [ ] Quote comparison across providers
- [ ] Policy renewal flow
- [ ] Claims submission flow
- [ ] Offline form caching
- [ ] User authentication and saved policies

---

## Out of Scope

| Exclusion | Reason |
|-----------|--------|
| Motor/Marine/Life insurance | Health only for this milestone |
| Quote comparison | ONDC protocol doesn't standardize this well |
| User authentication | Public prototype; auth is separate concern |
| Policy renewal | New purchase flow first |
| Claims flow | Different protocol flow entirely |
| Iframe BPP forms | Building custom Typeform-style UI instead |

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| SEL-01 | Phase 1 | Complete |
| SEL-02 | Phase 1 | Complete |
| SEL-03 | Phase 1 | Complete |
| SEL-04 | Phase 1 | Complete |
| SEL-05 | Phase 1 | Complete |
| FORM-01 | Phase 2 | Complete |
| FORM-02 | Phase 2 | Complete |
| FORM-03 | Phase 2 | Complete |
| FORM-04 | Phase 2 | Complete |
| FORM-05 | Phase 2 | Complete |
| FORM-06 | Phase 2 | Complete |
| FORM-07 | Phase 2 | Complete |
| FORM-08 | Phase 2 | Complete |
| INFRA-01 | Phase 2 | Deferred |
| INFRA-02 | Phase 2 | Complete |
| INFRA-03 | Phase 2 | Deferred |
| INIT-01 | Phase 3 | Pending |
| INIT-02 | Phase 3 | Pending |
| INIT-03 | Phase 3 | Pending |
| INIT-04 | Phase 3 | Pending |
| INIT-05 | Phase 3 | Pending |
| INIT-06 | Phase 3 | Pending |
| INIT-07 | Phase 3 | Pending |
| CONF-01 | Phase 4 | Pending |
| CONF-02 | Phase 4 | Pending |
| CONF-03 | Phase 4 | Pending |
| CONF-04 | Phase 4 | Pending |
| CONF-05 | Phase 4 | Pending |
| STAT-01 | Phase 4 | Pending |
| STAT-02 | Phase 4 | Pending |
| STAT-03 | Phase 4 | Pending |
| STAT-04 | Phase 4 | Pending |
| CTX-01 | Phase 5 | Pending |
| CTX-02 | Phase 5 | Pending |
| CTX-03 | Phase 5 | Pending |
| TEST-01 | Phase 5 | Pending |
| TEST-02 | Phase 5 | Pending |
| TEST-03 | Phase 5 | Pending |
| TEST-04 | Phase 5 | Pending |

---

*Requirements defined: 2026-02-02*
