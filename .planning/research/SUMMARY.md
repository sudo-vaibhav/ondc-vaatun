# Research Summary: ONDC Health Insurance BAP

**Research Date:** 2026-02-02
**Sources:** ONDC FIS13 spec (draft-FIS13-health-2.0.1), codebase analysis

## Key Findings

### Stack
- **No new dependencies needed** — existing Express + tRPC + Redis + libsodium stack is sufficient
- **Main technical challenge**: XInput form protocol — BPPs provide HTML forms that BAP renders in iframe
- **State machine required** for tracking multi-step form progress

### Features (Table Stakes for v1)
| Flow | Must Have |
|------|-----------|
| Select | Product card, "Get Quote" action, form rendering |
| Init | Multi-step KYC forms, progress indicator |
| Confirm | Payment redirect, success/failure handling |
| Status | Policy document display, status check |

### Architecture
- Extend gateway router with select/init/confirm/status procedures
- Add transaction state machine for flow tracking
- Add xinput store for form state
- New frontend routes for each flow stage

### Critical Pitfalls
1. **Context consistency** — same bpp_id, transaction_id across all requests
2. **Submission ID** — must use BPP's ID, not generate own
3. **Form index tracking** — respect xinput.head.index progression
4. **Payment flow** — verify payment before confirm

## Recommended Build Order

```
Phase 1: Select endpoints + basic select UI
    ↓
Phase 2: XInput form handling (used by both select and init)
    ↓
Phase 3: Init endpoints + KYC forms
    ↓
Phase 4: Confirm + payment integration
    ↓
Phase 5: Status + policy display
```

## Decision Recommendations

| Decision | Recommendation | Rationale |
|----------|----------------|-----------|
| Form rendering | Iframe | Safest; BPP controls form, we just embed |
| State storage | Redis hashes | Efficient for transaction state |
| Form progress | Server-side tracking | Prevents manipulation |
| Payment handling | Redirect flow | Standard for payment gateways |

## Risk Areas

| Risk | Impact | Mitigation |
|------|--------|------------|
| BPP form compatibility | High | Test with multiple BPPs early |
| Payment callback timing | Medium | Implement retry + idempotency |
| Form abandonment | Medium | Clear TTL handling + restart flow |

## Open Questions

1. **Form styling** — Can we style BPP forms or must they render as-is?
2. **Multiple insureds** — Family plans need multiple form sequences?
3. **Payment failures** — Retry policy? New transaction?

---

## Quick Reference

**Fetch ONDC specs:**
```bash
# Select example
gh api "repos/ONDC-Official/ONDC-FIS-Specifications/contents/api/components/examples/health-insurance/select/select-request-personal-info.yaml?ref=draft-FIS13-health-2.0.1" --jq '.content' | base64 -d

# on_select example
gh api "repos/ONDC-Official/ONDC-FIS-Specifications/contents/api/components/examples/health-insurance/on_select/on_select-request-personal-info.yaml?ref=draft-FIS13-health-2.0.1" --jq '.content' | base64 -d
```

**Key schema locations in spec:**
- Order schema: `#/components/schemas/Order`
- XInput schema: `#/components/schemas/XInput`
- Context schema: `#/components/schemas/Context`

---

*Research synthesized: 2026-02-02*
