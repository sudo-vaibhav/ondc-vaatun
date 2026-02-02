# Roadmap: ONDC Health Insurance BAP

## Overview

This roadmap delivers a complete health insurance purchase flow through ONDC. Starting with quote selection, we build custom form UI for seamless KYC capture, then implement payment and policy issuance flows. Each phase follows the ONDC protocol sequence (select → init → confirm → status) with protocol context embedded for vibe-coding.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Select Flow** - User can get detailed quotes for health insurance products
- [ ] **Phase 2: Form Infrastructure** - Custom Typeform-style multi-step forms for KYC
- [ ] **Phase 3: Init Flow** - User can submit KYC data and reach payment stage
- [ ] **Phase 4: Confirm & Status Flows** - User can pay and receive policy document
- [ ] **Phase 5: Protocol Context & Testing** - Protocol specs embedded, full E2E test coverage

## Phase Details

### Phase 1: Select Flow
**Goal**: Users can select health insurance products and view detailed quotes with coverage and pricing
**Depends on**: Nothing (first phase)
**Requirements**: SEL-01, SEL-02, SEL-03, SEL-04, SEL-05
**Success Criteria** (what must be TRUE):
  1. User can click "Get Quote" on a product from search results
  2. Select request is sent to BPP with proper ONDC authorization headers
  3. on_select callback stores quote details in Redis
  4. Quote display page shows coverage amount, premium, co-payment, and room rent cap
  5. Quote display shows available add-ons with their prices
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Install UI components, create QuoteHeader and CoverageDetails
- [x] 01-02-PLAN.md — Create AddOnSelector, TermsCollapsible, wire up quote page with polling
- [x] 01-03-PLAN.md — E2E tests and OpenAPI documentation

### Phase 2: Form Infrastructure
**Goal**: Reusable Typeform-style form system for all KYC flows with progress tracking and state persistence
**Depends on**: Phase 1
**Requirements**: FORM-01, FORM-02, FORM-03, FORM-04, FORM-05, FORM-06, FORM-07, FORM-08, INFRA-01, INFRA-02, INFRA-03
**Success Criteria** (what must be TRUE):
  1. Multi-step form component renders with smooth transitions between steps
  2. Progress indicator shows current step and total steps
  3. Form fields are based on ONDC spec, not BPP-provided HTML
  4. PED (Pre-Existing Disease) form allows condition selection
  5. PAN & DOB form validates input before allowing progression
  6. Personal info form captures name, address, and contact details
  7. Form state persists across page refreshes
  8. Form submission generates submission_id for ONDC protocol compliance
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 3: Init Flow
**Goal**: Users can complete full KYC process (buyer info, insured info, medical history, nominees) and receive payment link
**Depends on**: Phase 2
**Requirements**: INIT-01, INIT-02, INIT-03, INIT-04, INIT-05, INIT-06, INIT-07
**Success Criteria** (what must be TRUE):
  1. User can fill buyer information form (proposer details)
  2. User can fill insured information form (who is covered)
  3. User can answer medical history questions
  4. User can add nominee information (beneficiary details)
  5. User can review all entered data before proceeding to payment
  6. init endpoint sends complete KYC payload to BPP with proper signing
  7. on_init callback captures response with payment link
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 4: Confirm & Status Flows
**Goal**: Users can complete payment, receive policy confirmation, and check policy status
**Depends on**: Phase 3
**Requirements**: CONF-01, CONF-02, CONF-03, CONF-04, CONF-05, STAT-01, STAT-02, STAT-03, STAT-04
**Success Criteria** (what must be TRUE):
  1. User is redirected to BPP's payment gateway after init
  2. Payment callback handler processes success and failure cases
  3. confirm endpoint sends payment confirmation to BPP
  4. on_confirm callback stores policy document
  5. Success page displays policy summary
  6. User can query policy status from BPP
  7. Policy view page displays policy details
  8. User can download policy document (PDF if available)
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 5: Protocol Context & Testing
**Goal**: ONDC FIS13 protocol specs embedded in codebase and comprehensive E2E test coverage
**Depends on**: Phase 4
**Requirements**: CTX-01, CTX-02, CTX-03, TEST-01, TEST-02, TEST-03, TEST-04
**Success Criteria** (what must be TRUE):
  1. ONDC FIS13 health insurance reference docs exist in codebase
  2. Example payloads for each endpoint (select, init, confirm, status) are documented
  3. Zod schemas defined for all request/response types
  4. E2E tests verify select flow (select → on_select → quote display)
  5. E2E tests verify init flow (init → on_init → payment redirect)
  6. E2E tests verify confirm flow (payment callback → confirm → on_confirm)
  7. E2E tests verify status flow (status → on_status → policy display)
**Plans**: TBD

Plans:
- [ ] TBD during planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Select Flow | 3/3 | Complete | 2026-02-02 |
| 2. Form Infrastructure | 0/TBD | Ready to plan | - |
| 3. Init Flow | 0/TBD | Not started | - |
| 4. Confirm & Status Flows | 0/TBD | Not started | - |
| 5. Protocol Context & Testing | 0/TBD | Not started | - |
