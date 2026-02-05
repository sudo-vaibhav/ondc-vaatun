# Phase 4: Confirm & Status Flows - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete payment processing and policy issuance. User returns from BPP payment gateway, we confirm the transaction via ONDC protocol, poll for policy status, and display the issued policy with download capability.

**ONDC Protocol Flow (from FIS13 spec):**
1. User returns from BPP payment page
2. BAP sends `confirm` request to BPP
3. BPP responds with `on_confirm` (order created, payment NOT-PAID initially)
4. BAP polls `status` endpoint
5. BPP responds with `on_status` showing `status: PAID` and `status: ACTIVE` with policy document

</domain>

<decisions>
## Implementation Decisions

### Payment Return Handling
- Follow ONDC protocol exactly: confirm → poll status → show policy
- Dedicated callback route: `/payment-callback/:transactionId`
- On payment failure: show error + contact support (no automatic retry)
- No special handling for abandoned payments (user must return to see any state)

### Policy Success Page
- Full policy details: coverage, premium, validity dates, nominee, all info from on_status
- Captain Otter celebration pose on success
- Document download: open PDF in new tab (let browser handle)
- Show both options: "View Policy Details" button AND "Return to Home"

### Policy Status & Details
- Dedicated policy page at `/policy/:orderId` for later access
- Simple status view: status + download link (not full details on status page)
- Full details shown on success page (everything from on_status response)
- Validity format: start and end dates ("Valid: Jan 1, 2026 - Dec 31, 2026")
- Hybrid caching: store in Redis but allow manual refresh button

### Error & Edge Cases
- Confirm request auto-retries 3 times with exponential backoff (same as init)
- If status shows NOT-PAID after return: show instructions ("If you completed payment, please wait. Otherwise contact support")
- Status polling timeout: 2 minutes (payment processing can be slow)
- Invalid/missing policy: 404 page ("Policy not found")

### Claude's Discretion
- Exact layout of success page sections
- Captain Otter pose selection for celebration
- Polling interval for status checks
- Redis TTL for policy cache

</decisions>

<specifics>
## Specific Ideas

- Success page should feel rewarding with Captain Otter celebration
- Policy document opens in new tab so user doesn't lose their place
- Error messages should be helpful: "If you completed payment, please wait" rather than just "Error"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-confirm-status*
*Context gathered: 2026-02-04*
