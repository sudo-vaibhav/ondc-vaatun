# Health Insurance Page PRD

## Document Information

**Version**: 1.0
**Created**: 2025-12-24
**Status**: Draft
**Parent PRD**: [Insurance Marketplace Overview](../homepage-insurance-redesign.md)

---

## Page Overview

**Route**: `/health`
**Purpose**: Health insurance hub page for discovering and comparing health insurance plans
**Target Conversion**: Health insurance quote requests

---

## Sub-Pages Structure

```
/health                        → Health Insurance Hub (this page)
├── /health/individual         → Individual Health Plans
├── /health/family             → Family Floater Plans
├── /health/senior             → Senior Citizen Plans
├── /health/compare            → Compare Health Plans
└── /health/[quote-id]         → Quote Results Page
```

---

## Page Layout

```
┌────────────────────────────────────────────────────────────────────┐
│                         HEADER (shared)                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  HERO: Health Insurance                                            │
│  "Protect What Matters Most"                                       │
│  [Get Health Quote - Full Width Form]                              │
│                                                                     │
├────────────────────────────────────────────────────────────────────┤
│  PLAN TYPES                                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │ Individual  │  │ Family      │  │ Senior      │                │
│  │ Plans       │  │ Floater     │  │ Citizen     │                │
│  └─────────────┘  └─────────────┘  └─────────────┘                │
├────────────────────────────────────────────────────────────────────┤
│  WHY HEALTH INSURANCE                                              │
│  [Rising medical costs] [Cashless treatment] [Tax benefits]       │
├────────────────────────────────────────────────────────────────────┤
│  KEY FEATURES TO COMPARE                                           │
│  [Coverage] [Network] [Waiting Period] [Copay] [Room Rent]        │
├────────────────────────────────────────────────────────────────────┤
│  TOP INSURERS                                                      │
│  [Insurer cards with key stats]                                    │
├────────────────────────────────────────────────────────────────────┤
│  FAQ: Health Insurance                                             │
├────────────────────────────────────────────────────────────────────┤
│  FINAL CTA                                                         │
├────────────────────────────────────────────────────────────────────┤
│                         FOOTER (shared)                             │
└────────────────────────────────────────────────────────────────────┘
```

---

## Section Details

### Section 1: Hero

**Background**: Teal gradient or health-themed imagery
**Layout**: Centered headline with full-width quote form below

**Headline**:
```
Health Insurance
```

**Subheadline**:
```
Protect What Matters Most
```

**Description**:
```
Compare health insurance plans from India's top insurers on the
ONDC network. Find coverage that fits your needs and budget—from
individual plans to comprehensive family floaters.
```

**Trust Badges** (inline):
```
✓ 10,000+ Network Hospitals  ✓ Cashless Claims  ✓ No Hidden Charges
```

---

### Section 2: Quote Form

**Layout**: Full-width card with form fields

**Form Fields**:

| Field | Type | Options/Validation |
|-------|------|-------------------|
| Who do you want to cover? | Multi-select chips | Self, Spouse, Son, Daughter, Father, Mother |
| Your Age | Number | 18-65 (self), dependent ages auto-requested |
| City | Autocomplete | Top cities + search |
| Existing Illnesses? | Yes/No toggle | If yes, show condition selector |
| Desired Coverage | Select | ₹3 Lakh, ₹5 Lakh, ₹10 Lakh, ₹25 Lakh, ₹50 Lakh, ₹1 Crore |
| Mobile Number | Phone input | For quote delivery |

**Submit Button**: "View Health Plans →"

**Below Form**:
```
By continuing, you agree to our Terms of Service and Privacy Policy.
Your information is secure and will only be shared with insurers you choose.
```

---

### Section 3: Plan Types

**Layout**: Three equal cards in a row
**Mobile**: Horizontal scroll or stack

#### Card 1: Individual Plans

**Icon**: User icon
**Title**: "Individual Health Plans"
**Description**:
```
Personal health coverage for single individuals. Ideal for young
professionals and those starting their insurance journey.
```
**Key Points**:
- Coverage from ₹3 Lakh to ₹1 Crore
- Lower premiums for younger individuals
- Basic to comprehensive options

**CTA**: "Explore Individual Plans →"
**Starting Price**: "From ₹300/month"

#### Card 2: Family Floater

**Icon**: Users/Family icon
**Title**: "Family Floater Plans"
**Description**:
```
One policy, entire family covered. Shared sum insured that
any family member can use. Most popular choice for families.
```
**Key Points**:
- Cover spouse, children, and parents
- Single premium for all members
- Shared sum insured pool

**CTA**: "Explore Family Plans →"
**Starting Price**: "From ₹600/month"

#### Card 3: Senior Citizen

**Icon**: User with heart icon
**Title**: "Senior Citizen Plans"
**Description**:
```
Specialized coverage for parents and elderly family members.
Higher coverage limits and senior-specific benefits.
```
**Key Points**:
- Entry age up to 65-80 years
- Pre-existing disease coverage
- Domiciliary treatment included

**CTA**: "Explore Senior Plans →"
**Starting Price**: "From ₹1,000/month"

---

### Section 4: Why Health Insurance

**Layout**: Icon + stat cards in a row
**Purpose**: Educate and create urgency

**Section Header**:
```
Why You Need Health Insurance Today
```

#### Stat Cards

**Card 1**:
- Stat: "14%"
- Label: "Annual medical inflation in India"
- Subtext: "Healthcare costs are rising faster than general inflation"

**Card 2**:
- Stat: "₹5 Lakh+"
- Label: "Average hospitalization cost"
- Subtext: "A single hospital stay can wipe out years of savings"

**Card 3**:
- Stat: "₹46,800"
- Label: "Tax savings under 80D"
- Subtext: "Health insurance premiums are tax-deductible"

**Card 4**:
- Stat: "10,000+"
- Label: "Cashless network hospitals"
- Subtext: "Get treated without upfront payment"

---

### Section 5: Features to Compare

**Layout**: Feature comparison education section
**Purpose**: Help users understand what to look for

**Section Header**:
```
What to Look For in a Health Plan
```

**Features Grid** (3 columns):

| Feature | What It Means | Why It Matters |
|---------|---------------|----------------|
| **Sum Insured** | Maximum claim amount | Higher is better for serious illnesses |
| **Network Hospitals** | Cashless treatment hospitals | More options = more convenience |
| **Waiting Period** | Time before coverage starts | Shorter is better for pre-existing |
| **Copay** | Your share of claim amount | Lower copay = pay less out-of-pocket |
| **Room Rent Limit** | Daily room charge cap | No limit = no surprise bills |
| **No Claim Bonus** | Discount for claim-free years | Rewards healthy policyholders |

---

### Section 6: Top Insurers

**Layout**: Insurer cards showing key metrics
**Data**: Should be dynamic from API

**Section Header**:
```
Top Health Insurers on ONDC
```

**Insurer Card Template**:
```
┌────────────────────────────────────────┐
│  [Logo]  Insurer Name                  │
│                                        │
│  Claim Settlement: 98%                 │
│  Network Hospitals: 8,500+             │
│  Starting From: ₹4,200/year            │
│                                        │
│  [View Plans →]                        │
└────────────────────────────────────────┘
```

**Insurers to Feature**:
- Star Health
- HDFC Ergo
- ICICI Lombard
- Bajaj Allianz
- Care Health
- Max Bupa
- (List based on ONDC availability)

---

### Section 7: FAQ

**Layout**: Accordion
**Content**: Health insurance-specific questions

**Q1**: What is a family floater plan?
```
A family floater plan covers your entire family under a single policy
with a shared sum insured. Any family member can use the coverage.
For example, a ₹10 lakh floater means the total claims by all family
members in a year cannot exceed ₹10 lakh.
```

**Q2**: What is a waiting period?
```
A waiting period is the time you must wait before certain benefits
become active. There are typically three types:
- Initial waiting period: 30 days for any illness
- Pre-existing disease: 2-4 years
- Specific illness: 1-2 years for certain conditions
```

**Q3**: What does cashless treatment mean?
```
With cashless treatment, the insurer pays the hospital directly.
You don't need to arrange money upfront—just show your health card
at a network hospital. Only payable items like food or upgrades
need out-of-pocket payment.
```

**Q4**: Can I cover my parents?
```
Yes! You can either:
1. Add parents to a family floater (if age limits allow)
2. Buy a separate senior citizen plan for parents
3. Get an individual plan for each parent

Senior-specific plans often have better terms for older members.
```

**Q5**: How do I claim tax benefits?
```
Health insurance premiums are tax-deductible under Section 80D:
- Up to ₹25,000 for self and family
- Additional ₹25,000 for parents (₹50,000 if senior citizens)
- Total potential deduction: ₹1,00,000
```

---

### Section 8: Final CTA

**Layout**: Full-width colored banner

**Headline**:
```
Find the Right Health Plan for Your Family
```

**Subheadline**:
```
Compare plans from 10+ insurers. Takes less than 2 minutes.
```

**CTA Button**: "Get Health Insurance Quotes →"

---

## Quote Results Page (`/health/[quote-id]`)

### Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  HEADER                                                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SUMMARY BAR                                                       │
│  "Showing 12 plans for Self (28) in Mumbai | ₹10 Lakh coverage"   │
│  [Edit Details]                                                    │
│                                                                     │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  FILTERS (Sidebar)     │  RESULTS (Main Area)                      │
│                        │                                            │
│  Price Range           │  Sort: [Premium ▼] [Coverage] [Rating]   │
│  ○ Under ₹5K          │                                            │
│  ○ ₹5K - ₹10K         │  ┌─────────────────────────────────────┐  │
│  ○ ₹10K - ₹20K        │  │ Plan Card 1                         │  │
│  ○ Above ₹20K         │  │ Insurer | Plan Name | Premium       │  │
│                        │  │ Coverage | Key Features              │  │
│  Insurer               │  │ [Compare] [View Details] [Buy]      │  │
│  ☐ Star Health        │  └─────────────────────────────────────┘  │
│  ☐ HDFC Ergo          │                                            │
│  ☐ ICICI Lombard      │  ┌─────────────────────────────────────┐  │
│                        │  │ Plan Card 2                         │  │
│  Features              │  │ ...                                  │  │
│  ☐ No Room Rent Limit │  └─────────────────────────────────────┘  │
│  ☐ Maternity Cover    │                                            │
│  ☐ No Copay           │  [Load More]                               │
│                        │                                            │
└────────────────────────┴────────────────────────────────────────────┘
```

### Plan Card Details

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Insurer Logo]                                                     │
│  Star Health | Comprehensive Plan                                   │
│                                                                     │
│  ₹8,450/year                          Sum Insured: ₹10,00,000      │
│  ₹704/month                                                        │
│                                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                  │
│  │ Cashless│ │ No Room │ │ 30 Day  │ │ Day Care│                  │
│  │ 8,500+  │ │ Rent Cap│ │ Waiting │ │ Covered │                  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘                  │
│                                                                     │
│  Claim Settlement Ratio: 92%                                        │
│                                                                     │
│  [☐ Compare]                    [View Details]  [Buy Now →]        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Requirements

### New Components

| Component | File | Description |
|-----------|------|-------------|
| `HealthQuoteForm` | `src/components/health/QuoteForm.tsx` | Multi-step health quote form |
| `PlanTypeCard` | `src/components/health/PlanTypeCard.tsx` | Individual/Family/Senior cards |
| `StatCard` | `src/components/health/StatCard.tsx` | Why insurance stat cards |
| `FeatureComparisonTable` | `src/components/health/FeatureTable.tsx` | Features explainer |
| `InsurerCard` | `src/components/health/InsurerCard.tsx` | Insurer showcase cards |
| `HealthFAQ` | `src/components/health/FAQ.tsx` | Health-specific FAQ |
| `PlanResultCard` | `src/components/health/PlanResultCard.tsx` | Quote result plan card |
| `PlanFilters` | `src/components/health/PlanFilters.tsx` | Filter sidebar |

### Shared Components

- `QuoteWidget` (variant: health-only)
- `TrustIndicators`
- `CTABanner`
- `FAQAccordion`

---

## SEO Requirements

### Meta Tags

```html
<title>Health Insurance Plans — Compare & Buy on ONDC | Vaatun</title>
<meta name="description" content="Compare health insurance plans from Star Health, HDFC Ergo, ICICI Lombard and more. Cashless treatment at 10,000+ hospitals. Get instant quotes." />
```

### Structured Data

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Health Insurance",
  "description": "Compare health insurance plans from top insurers",
  "category": "Insurance",
  "offers": {
    "@type": "AggregateOffer",
    "lowPrice": "3600",
    "highPrice": "50000",
    "priceCurrency": "INR"
  }
}
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Quote form submissions | 200/week |
| Form completion rate | 60%+ |
| Quote-to-purchase rate | 3% |
| Avg. time to quote | < 60 seconds |
| Plan comparison usage | 40% of users |

---

## Open Questions

1. **Pre-existing Conditions**: How detailed should the disclosure be?
2. **Age Validation**: Should we validate spouse/child ages in form?
3. **Price Accuracy**: Real-time API or cached estimates?
4. **Comparison Limit**: Max plans that can be compared?

---

## Approvals

- [ ] Product Owner
- [ ] Design Lead
- [ ] Engineering Lead
- [ ] Content Review
