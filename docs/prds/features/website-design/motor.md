# Motor Insurance Page PRD

## Document Information

**Version**: 1.0
**Created**: 2025-12-24
**Status**: Draft
**Parent PRD**: [Insurance Marketplace Overview](../homepage-insurance-redesign.md)

---

## Page Overview

**Route**: `/motor`
**Purpose**: Motor insurance hub page for car, bike, and commercial vehicle insurance
**Target Conversion**: Motor insurance quote requests

---

## Sub-Pages Structure

```
/motor                         → Motor Insurance Hub (this page)
├── /motor/car                 → Car Insurance
├── /motor/bike                → Two-Wheeler Insurance
├── /motor/commercial          → Commercial Vehicle Insurance
├── /motor/compare             → Compare Motor Plans
└── /motor/[quote-id]          → Quote Results Page
```

---

## Page Layout

```
┌────────────────────────────────────────────────────────────────────┐
│                         HEADER (shared)                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  HERO: Motor Insurance                                             │
│  "Drive With Confidence"                                           │
│  [Vehicle Type Selector + Quick Quote Form]                        │
│                                                                     │
├────────────────────────────────────────────────────────────────────┤
│  VEHICLE TYPES                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │ Car         │  │ Two-Wheeler │  │ Commercial  │                │
│  │ Insurance   │  │ Insurance   │  │ Vehicle     │                │
│  └─────────────┘  └─────────────┘  └─────────────┘                │
├────────────────────────────────────────────────────────────────────┤
│  POLICY TYPES EXPLAINED                                            │
│  [Third Party Only] vs [Comprehensive] vs [Own Damage]            │
├────────────────────────────────────────────────────────────────────┤
│  ADD-ONS WORTH CONSIDERING                                         │
│  [Zero Dep] [RSA] [Engine Protect] [NCB Protect] [Key Loss]       │
├────────────────────────────────────────────────────────────────────┤
│  CLAIMS PROCESS                                                    │
│  [Report → Document → Inspect → Repair → Settle]                  │
├────────────────────────────────────────────────────────────────────┤
│  TOP MOTOR INSURERS                                                │
│  [Insurer cards with key stats]                                    │
├────────────────────────────────────────────────────────────────────┤
│  FAQ: Motor Insurance                                              │
├────────────────────────────────────────────────────────────────────┤
│  FINAL CTA                                                         │
├────────────────────────────────────────────────────────────────────┤
│                         FOOTER (shared)                             │
└────────────────────────────────────────────────────────────────────┘
```

---

## Section Details

### Section 1: Hero

**Background**: Blue gradient or automotive imagery
**Layout**: Split - vehicle type tabs on left, form on right

**Headline**:
```
Motor Insurance
```

**Subheadline**:
```
Drive With Confidence
```

**Description**:
```
Compare motor insurance from India's leading insurers. Whether it's
your car, bike, or commercial vehicle—get instant quotes and buy
online with immediate policy issuance.
```

**Trust Badges** (inline):
```
✓ Instant Policy  ✓ 5,000+ Cashless Garages  ✓ 24/7 Roadside Assistance
```

---

### Section 2: Quote Form

**Layout**: Tabbed form with vehicle type selector

**Tabs**: `[🚗 Car]` `[🏍️ Bike]` `[🚛 Commercial]`

#### Car Insurance Form

| Field | Type | Options/Validation |
|-------|------|-------------------|
| Car Brand | Autocomplete | Maruti, Hyundai, Tata, etc. |
| Car Model | Dependent autocomplete | Based on brand |
| Variant | Dependent autocomplete | Based on model |
| Registration Year | Select | 2024 down to 2009 |
| RTO | Autocomplete | MH-01, KA-01, etc. |
| Policy Type | Radio | New / Renewal |
| Previous Insurer | Conditional | If renewal |
| NCB | Conditional select | 0%, 20%, 25%, 35%, 45%, 50% |

#### Two-Wheeler Form

| Field | Type | Options/Validation |
|-------|------|-------------------|
| Bike Brand | Autocomplete | Hero, Honda, Bajaj, etc. |
| Bike Model | Dependent autocomplete | |
| CC | Auto-filled | Based on model |
| Registration Year | Select | |
| RTO | Autocomplete | |
| Policy Type | Radio | New / Renewal |

#### Commercial Vehicle Form

| Field | Type | Options/Validation |
|-------|------|-------------------|
| Vehicle Type | Select | Truck, Bus, Taxi, Three-Wheeler |
| GVW (for trucks) | Select | Weight categories |
| Seating (for buses) | Number | |
| Permit Type | Select | Private, Commercial, National |
| Registration Year | Select | |
| RTO | Autocomplete | |

**Submit Button**: "View Motor Plans →"

---

### Section 3: Vehicle Types

**Layout**: Three cards with icons and key selling points

#### Card 1: Car Insurance

**Icon**: Car icon
**Title**: "Car Insurance"
**Description**:
```
Comprehensive protection for your four-wheeler. Cover damages,
theft, third-party liability, and more.
```
**Stats**:
- Starting from ₹2,500/year
- 5,000+ cashless garages

**CTA**: "Get Car Quote →"

#### Card 2: Two-Wheeler Insurance

**Icon**: Motorcycle icon
**Title**: "Two-Wheeler Insurance"
**Description**:
```
Protect your bike or scooter with affordable coverage. Third-party
mandatory coverage and comprehensive options available.
```
**Stats**:
- Starting from ₹500/year
- Instant policy issuance

**CTA**: "Get Bike Quote →"

#### Card 3: Commercial Vehicle

**Icon**: Truck icon
**Title**: "Commercial Vehicle Insurance"
**Description**:
```
Fleet and commercial vehicle coverage for trucks, buses, taxis,
and three-wheelers. Tailored for business use.
```
**Stats**:
- Multi-vehicle discounts
- Goods in transit coverage

**CTA**: "Get Commercial Quote →"

---

### Section 4: Policy Types Explained

**Layout**: Comparison cards
**Purpose**: Educate on coverage options

**Section Header**:
```
Understanding Motor Insurance Types
```

#### Third-Party Only

**Icon**: Shield with arrow pointing out
**Price Indicator**: "₹" (cheapest)
**Legal Status**: "Mandatory by law"

**What's Covered**:
- ✓ Damage to third-party vehicle
- ✓ Injury to third-party person
- ✓ Death of third-party

**What's NOT Covered**:
- ✗ Damage to your own vehicle
- ✗ Theft of your vehicle
- ✗ Fire damage
- ✗ Natural disasters

**Best For**: "Older vehicles or tight budgets"

#### Comprehensive

**Icon**: Full shield
**Price Indicator**: "₹₹₹" (premium)
**Badge**: "RECOMMENDED"

**What's Covered**:
- ✓ Everything in Third-Party
- ✓ Own damage (accidents, collisions)
- ✓ Theft
- ✓ Fire
- ✓ Natural disasters
- ✓ Personal accident cover

**What's NOT Covered**:
- ✗ Wear and tear
- ✗ Mechanical breakdown
- ✗ Drunk driving damages

**Best For**: "New vehicles and peace of mind"

#### Own Damage Only

**Icon**: Car with shield
**Price Indicator**: "₹₹"
**Note**: "For third-party renewal separately"

**What's Covered**:
- ✓ Own vehicle damage
- ✓ Theft
- ✓ Fire
- ✓ Natural disasters

**What's NOT Covered**:
- ✗ Third-party liability
- ✗ Personal accident

**Best For**: "When third-party is still valid"

---

### Section 5: Add-Ons Worth Considering

**Layout**: Horizontal scrollable cards or grid
**Purpose**: Upsell valuable add-ons

**Section Header**:
```
Popular Add-Ons to Enhance Your Coverage
```

#### Add-On Cards

**1. Zero Depreciation**
- **Icon**: 100% badge
- **Description**: "Get full claim value without depreciation deductions on parts"
- **Cost**: "+15-20% premium"
- **Worth It?**: "Essential for new cars under 5 years"

**2. Roadside Assistance (RSA)**
- **Icon**: Tow truck
- **Description**: "24/7 help for breakdowns—towing, battery jump, flat tyre"
- **Cost**: "₹500-1,500/year"
- **Worth It?**: "Great for long-distance drivers"

**3. Engine Protect**
- **Icon**: Engine
- **Description**: "Covers engine damage due to water ingression"
- **Cost**: "+5-10% premium"
- **Worth It?**: "Must-have in flood-prone areas"

**4. NCB Protect**
- **Icon**: Percentage badge
- **Description**: "Keep your No Claim Bonus even after making a claim"
- **Cost**: "+10-15% premium"
- **Worth It?**: "If you have 35%+ NCB"

**5. Return to Invoice**
- **Icon**: Invoice/receipt
- **Description**: "Get full invoice value in case of total loss or theft"
- **Cost**: "+10% premium"
- **Worth It?**: "For cars under 3 years old"

**6. Key & Lock Replacement**
- **Icon**: Key
- **Description**: "Coverage for lost keys and lock replacement"
- **Cost**: "₹500-1,000/year"
- **Worth It?**: "Convenient for forgetful drivers"

---

### Section 6: Claims Process

**Layout**: Horizontal stepper/timeline
**Purpose**: Demystify the claims process

**Section Header**:
```
How Motor Claims Work
```

**Steps**:

**Step 1: Report**
- **Icon**: Phone/alert
- **Title**: "Report the Incident"
- **Description**: "Call insurer helpline or report via app within 24 hours"
- **Tip**: "Always file an FIR for theft or third-party injury"

**Step 2: Document**
- **Icon**: Camera
- **Title**: "Document Everything"
- **Description**: "Take photos of damage, collect driver details, note location"
- **Tip**: "More documentation = faster settlement"

**Step 3: Inspect**
- **Icon**: Magnifying glass
- **Title**: "Vehicle Inspection"
- **Description**: "Surveyor inspects damage—can be at garage or your location"
- **Tip**: "Some insurers offer video-based inspection"

**Step 4: Repair**
- **Icon**: Wrench
- **Title**: "Get Repairs Done"
- **Description**: "Choose network garage for cashless or any garage for reimbursement"
- **Tip**: "Network garages mean zero upfront payment"

**Step 5: Settle**
- **Icon**: Checkmark/money
- **Title**: "Claim Settlement"
- **Description**: "Insurer pays garage (cashless) or reimburses you"
- **Tip**: "Most claims settle in 7-14 days"

---

### Section 7: Top Insurers

**Layout**: Insurer cards grid
**Dynamic**: Should pull from API when available

**Section Header**:
```
Leading Motor Insurers on ONDC
```

**Insurer Card Template**:
```
┌────────────────────────────────────────┐
│  [Logo]  Insurer Name                  │
│                                        │
│  Claim Settlement: 96%                 │
│  Network Garages: 4,500+               │
│  Avg. Claim Time: 12 days              │
│                                        │
│  [Get Quote →]                         │
└────────────────────────────────────────┘
```

**Insurers to Feature**:
- ICICI Lombard
- HDFC Ergo
- Bajaj Allianz
- Tata AIG
- New India Assurance
- United India
- (Based on ONDC availability)

---

### Section 8: FAQ

**Layout**: Accordion

**Q1**: Is motor insurance mandatory in India?
```
Yes, third-party motor insurance is mandatory under the Motor Vehicles
Act, 1988. Driving without valid insurance can result in:
- Fine up to ₹2,000 (first offense)
- Fine up to ₹4,000 and/or imprisonment (repeat offense)
- Impounding of vehicle
```

**Q2**: What is IDV and how is it calculated?
```
IDV (Insured Declared Value) is your vehicle's current market value
and the maximum amount you'll receive in case of total loss or theft.

IDV = (Manufacturer's listed price – Depreciation) + Accessories

Depreciation rates:
- 6 months to 1 year: 5%
- 1-2 years: 10%
- 2-3 years: 15%
- 3-4 years: 25%
- 4-5 years: 35%
- 5+ years: 40-50%
```

**Q3**: What is No Claim Bonus (NCB)?
```
NCB is a discount reward for each claim-free year:
- 1 year: 20% discount
- 2 years: 25% discount
- 3 years: 35% discount
- 4 years: 45% discount
- 5+ years: 50% discount

NCB is yours—it transfers when you buy a new vehicle. You lose it
if you make a claim (unless you have NCB Protect add-on).
```

**Q4**: Cashless vs Reimbursement—what's the difference?
```
**Cashless**: Take your car to a network garage. Insurer pays the
garage directly. You pay nothing upfront (except non-covered items).

**Reimbursement**: Get repairs at any garage. Pay yourself, then
submit bills to insurer for reimbursement. Takes 7-14 days.

Tip: Always prefer cashless for hassle-free claims.
```

**Q5**: Can I renew a lapsed motor policy?
```
- Lapsed up to 90 days: Renewal usually possible, NCB may be lost
- Lapsed 90+ days: Treated as new policy, inspection required

If your policy has lapsed, don't drive until renewed—you're
uninsured and legally liable for any incident.
```

**Q6**: What's not covered in motor insurance?
```
Standard exclusions include:
- Normal wear and tear
- Mechanical/electrical breakdown
- Damage while driving under influence
- Driving without valid license
- Using vehicle for purposes not in policy (e.g., racing)
- Consequential losses
- War and nuclear perils
```

---

### Section 9: Final CTA

**Layout**: Full-width banner

**Headline**:
```
Ready to Protect Your Vehicle?
```

**Subheadline**:
```
Instant quotes from 10+ insurers. Policy in your inbox within minutes.
```

**CTA Button**: "Get Motor Insurance Quote →"

---

## Quote Results Page (`/motor/[quote-id]`)

### Layout

Similar to health results with motor-specific details:

```
┌────────────────────────────────────────────────────────────────────┐
│  SUMMARY BAR                                                        │
│  "Maruti Swift VXI (2022) | MH-02 | Comprehensive"                 │
│  IDV: ₹5,50,000 | [Edit Details]                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  FILTERS               │  RESULTS                                   │
│                        │                                            │
│  Price Range           │  ┌─────────────────────────────────────┐  │
│  Policy Type           │  │ Plan Card                           │  │
│  ○ Comprehensive       │  │ [Logo] Insurer | Premium            │  │
│  ○ Third Party         │  │ Coverage highlights | Add-ons       │  │
│  ○ Own Damage          │  │ [Compare] [Customize] [Buy Now]     │  │
│                        │  └─────────────────────────────────────┘  │
│  Add-ons               │                                            │
│  ☐ Zero Depreciation   │                                            │
│  ☐ RSA                 │                                            │
│  ☐ Engine Protect      │                                            │
│                        │                                            │
└────────────────────────┴────────────────────────────────────────────┘
```

### Plan Card Details

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Insurer Logo]                                                     │
│  ICICI Lombard | Comprehensive Plan                                 │
│                                                                     │
│  ₹12,450/year                         IDV: ₹5,50,000               │
│                                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                  │
│  │Cashless │ │ Roadside│ │ Zero Dep│ │ Personal│                  │
│  │ 4,500+  │ │ Assist  │ │Included │ │Accident │                  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘                  │
│                                                                     │
│  Claim Settlement: 96% | Avg. Claim Time: 12 days                   │
│                                                                     │
│  [+ Add-ons ▼]                                                      │
│                                                                     │
│  [☐ Compare]              [Customize →]  [Buy Now →]               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Requirements

### New Components

| Component | File | Description |
|-----------|------|-------------|
| `MotorQuoteForm` | `src/components/motor/QuoteForm.tsx` | Tabbed vehicle quote form |
| `VehicleTypeCard` | `src/components/motor/VehicleTypeCard.tsx` | Car/Bike/Commercial cards |
| `PolicyTypeComparison` | `src/components/motor/PolicyTypes.tsx` | TP vs Comp vs OD |
| `AddOnCard` | `src/components/motor/AddOnCard.tsx` | Add-on explainer cards |
| `ClaimsTimeline` | `src/components/motor/ClaimsTimeline.tsx` | Claims process stepper |
| `MotorInsurerCard` | `src/components/motor/InsurerCard.tsx` | Motor-specific insurer card |
| `MotorPlanCard` | `src/components/motor/PlanCard.tsx` | Quote result card |
| `IDVCalculator` | `src/components/motor/IDVCalculator.tsx` | IDV display/edit |

### Data Dependencies

- Vehicle master data (brands, models, variants)
- RTO codes database
- IDV calculation logic
- Add-on pricing

---

## SEO Requirements

### Meta Tags

```html
<title>Motor Insurance — Car, Bike & Commercial Vehicle | Vaatun</title>
<meta name="description" content="Compare motor insurance for cars, bikes, and commercial vehicles. Instant policy issuance, 5000+ cashless garages, 24/7 roadside assistance." />
```

### Structured Data

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Motor Insurance",
  "description": "Compare car, bike, and commercial vehicle insurance",
  "category": "Insurance",
  "offers": {
    "@type": "AggregateOffer",
    "lowPrice": "500",
    "highPrice": "50000",
    "priceCurrency": "INR"
  }
}
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Quote form submissions | 300/week |
| Form completion rate | 70%+ |
| Vehicle data accuracy | < 2% correction rate |
| Quote-to-purchase rate | 5% |
| Add-on attach rate | 40% |

---

## Open Questions

1. **Vehicle Database**: Source for make/model/variant data?
2. **IDV Flexibility**: Allow users to adjust IDV in quotes?
3. **Renewal Flow**: How to handle policy renewal differently?
4. **Commercial Complexity**: Simplify or separate commercial flow?

---

## Approvals

- [ ] Product Owner
- [ ] Design Lead
- [ ] Engineering Lead
- [ ] Content Review
