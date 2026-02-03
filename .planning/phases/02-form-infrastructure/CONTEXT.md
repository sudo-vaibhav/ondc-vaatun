# Phase 2: Form Infrastructure - Context

**Gathered:** 2026-02-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Reusable Typeform-style form system for KYC data collection. This phase builds the form infrastructure (multi-step component, progress tracking, state persistence) that Phase 3 (Init Flow) will use for actual KYC forms. The forms are custom UI based on ONDC spec fields — NOT BPP-provided iframe forms.

</domain>

<decisions>
## Implementation Decisions

### Form layout & flow
- Logical groups of 3-5 related fields per step (not one question per screen)
- Slide animation left/right between steps (Typeform-style)
- Mobile: stack vertically with same grouping as desktop
- Each step has title + description at top

### Field design & validation
- Validation errors appear on blur (when leaving field)
- Error display: inline below the field in red text
- Input formatting (PAN, phone, DOB) applied on blur, not real-time
- PED (Pre-Existing Disease) selection: checkbox list of categories + "Other" text field

### State persistence
- Store form state in browser localStorage (client-side only)
- Auto-save on blur (when user leaves any field)
- On return to partial form: show prompt "Resume where you left off?"
- State never expires (until submission or manual clear)

### Claude's Discretion
- Progress indicator visual style (bar vs steps vs percentage)
- Exact transition duration and easing
- Field label placement (above vs inline)
- "Other" text field expand/collapse behavior for PED

</decisions>

<specifics>
## Specific Ideas

- "Typeform-style" — smooth, focused, one thing at a time feel even with grouped fields
- Resume prompt should be dismissible (user can choose to start fresh)
- Forms should feel light, not overwhelming despite collecting detailed KYC data

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-form-infrastructure*
*Context gathered: 2026-02-02*
