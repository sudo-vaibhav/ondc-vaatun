# Phase 3: Init Flow - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete KYC process and wire up ONDC init endpoint to receive payment link from BPP. This phase extends the existing KYCForm with nominee step and review page, implements init/on_init tRPC procedures, and handles the multi-step form submission flow per ONDC FIS13 protocol.

</domain>

<decisions>
## Implementation Decisions

### Form structure
- Buyer IS the insured (single person flow, no separate insured form)
- Extend existing KYCForm — add Nominee and Review steps to the 3-step form
- Nominee is prompt-but-skippable — "Add nominee?" with easy skip option
- Up to 2 nominees maximum

### Medical history UX
- PED step IS the medical history (per ONDC FIS13 protocol — already built in Phase 2)
- No additional lifestyle fields (height/weight/smoking) — follow protocol minimum
- EKYC is BPP-driven — if BPP provides xinput.form.url, handle it; otherwise skip

### BPP form handling
- Claude's discretion on how to handle BPP-provided forms (redirect for complex, inline for simple)
- Follow ONDC xinput pattern: BAP sends form_response with submission_id, BPP responds with next form or payment link

### Review experience
- Single scrollable page with all data visible, grouped by category headers
- Edit buttons per section — "Edit" link next to each header jumps back to that step
- Quote summary sidebar showing premium, coverage, and selected add-ons
- Mandatory T&C checkbox before proceeding to payment

### Error & edge cases
- Auto-retry silently on init failure — retry 2-3 times, only show error if all fail
- Polling with spinner for on_init response — show "Processing..." while waiting
- Show BPP error messages directly — display whatever BPP returns, let user fix and retry
- Persist everything — form data saved, resume where left off (already built via localStorage)

### Claude's Discretion
- BPP form display strategy (redirect vs inline based on mime_type)
- Polling interval and max wait time for on_init
- Error message presentation styling
- Nominee form field layout

</decisions>

<specifics>
## Specific Ideas

- ONDC FIS13 protocol uses xinput.form_response pattern — each init sends submission_id, BPP responds with next form or payment
- Protocol steps: PED → PAN/DOB → EKYC (if BPP requires) → Payment link
- Reuse existing infrastructure: useFormPersistence, MultiStepForm, field components from Phase 2
- Similar polling pattern to select flow (already built in Phase 1)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-init-flow*
*Context gathered: 2026-02-03*
