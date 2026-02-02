# Phase 1 Context: Select Flow

**Created:** 2026-02-02
**Status:** Ready for planning

## Decisions

### Quote Display Layout

| Decision | Choice |
|----------|--------|
| Page type | Full page dedicated to the quote |
| Information hierarchy | Premium price prominent at top (big number) |
| Coverage detail level | Comprehensive — show all coverage details (room rent, co-pay, waiting periods) |
| Terms & conditions | Collapsible/expandable section |

### Add-ons Presentation

| Decision | Choice |
|----------|--------|
| Selection mechanism | Toggles (switch on/off for each) |
| Default selection | All add-ons start unselected |
| Pricing display | Per add-on price + total at bottom |
| Descriptions | Show inline with each add-on |

### Loading Experience

| Decision | Choice |
|----------|--------|
| Loading indicator | Captain Otter mascot (steering wheel or pocket watch pose) |
| Error timeout | Case-by-case basis per route (implement with sensible defaults) |
| Error display | Technical error with details |
| Cancel option | No — just wait or let it timeout |

### Next Action Flow

| Decision | Choice |
|----------|--------|
| After quote | Proceed to forms (Phase 2 handles this) |
| Back navigation | Return to search results |

## UI Components Needed

### Quote Page (`/health/quote/$transactionId`)

```
┌─────────────────────────────────────────┐
│ ← Back to Results                       │
├─────────────────────────────────────────┤
│                                         │
│  [Provider Logo]  Health Gain Plus      │
│                                         │
│  ₹15,000/year                          │
│  ~~~~~~~~~~~~~ (big, prominent)         │
│                                         │
├─────────────────────────────────────────┤
│ Coverage Details                        │
│ ┌─────────────────────────────────────┐│
│ │ Sum Insured      ₹10,00,000        ││
│ │ Room Rent Cap    ₹25,000/day       ││
│ │ Co-payment       20%               ││
│ │ Waiting Period   30 days           ││
│ │ Network          50+ hospitals     ││
│ └─────────────────────────────────────┘│
├─────────────────────────────────────────┤
│ Add-ons                                 │
│ ┌─────────────────────────────────────┐│
│ │ [ ] Critical Illness    +₹500/yr   ││
│ │     Covers 12 critical conditions   ││
│ │                                     ││
│ │ [ ] Maternity Cover     +₹800/yr   ││
│ │     Pregnancy and delivery          ││
│ └─────────────────────────────────────┘│
│                                         │
│ Total: ₹15,000/year                    │
│                                         │
├─────────────────────────────────────────┤
│ ▼ Terms & Conditions                   │
│   (collapsible section)                 │
├─────────────────────────────────────────┤
│                                         │
│     [   Proceed to Application   ]     │
│                                         │
└─────────────────────────────────────────┘
```

### Loading State

- Use Captain Otter `loading-steering.png` or `loading-pocketwatch.png`
- Center in viewport
- Message below: "Fetching your personalized quote..."
- No cancel button

### Error State

- Use Captain Otter `error-500-fixing.png` (serious expression)
- Show technical error details
- Retry button
- Back to search link

## Implementation Notes

### Backend

1. **select endpoint** (`gateway.select`)
   - Input: transactionId, itemId, add-on IDs
   - Signs request with Tenant
   - Sends to BPP URI from search results
   - Returns ACK

2. **on_select callback** (`gateway.onSelect`)
   - Receives quote from BPP
   - Stores in Redis: `select:{transactionId}`
   - Returns ACK immediately

3. **getSelectResults** (`results.getSelectResults`)
   - Polls Redis for quote data
   - Returns quote or "pending" status

### Frontend

1. **Quote page route**: `/health/quote/$transactionId`
2. **Poll for results** using tRPC query with refetch interval
3. **Use existing shadcn/ui components** (Card, Toggle, Collapsible)
4. **Captain Otter images** from `docs/mascot/captain-otter/poses/`

## Deferred Ideas

*Ideas mentioned during discussion but out of scope for this phase:*

- None captured

## Open Questions

*Resolved during discussion:*

- ✓ Quote layout → Full page
- ✓ Premium prominence → Yes, big at top
- ✓ Coverage detail → Comprehensive
- ✓ Add-on toggles → Yes, unselected by default
- ✓ Loading indicator → Captain Otter mascot
- ✓ Error handling → Technical details + retry

---

*Context gathered: 2026-02-02*
