# Insurance Marketplace Redesign — Overview PRD

## Document Information

**Version**: 1.0
**Created**: 2025-12-24
**Status**: Draft
**Owner**: Product Team

---

## Executive Summary

This PRD outlines the redesign of ONDC Vaatun from a developer-focused technical documentation site to a consumer-facing insurance marketplace. The platform will enable users to purchase insurance products through the ONDC network, with a focus on two major verticals: **Health Insurance** and **Motor Insurance**.

### Related Page PRDs

| Page | PRD Location | Status |
|------|--------------|--------|
| Homepage | [website-design/homepage.md](./website-design/homepage.md) | Draft |
| Health Insurance | [website-design/health.md](./website-design/health.md) | Draft |
| Motor Insurance | [website-design/motor.md](./website-design/motor.md) | Draft |
| Technical Docs | [website-design/tech.md](./website-design/tech.md) | Draft |
| **Brand & Image Guidelines** | [website-design/brand-image-guidelines.md](./website-design/brand-image-guidelines.md) | Draft |

---

## Strategic Vision

### The Problem

Traditional insurance marketplaces are:
- Dominated by a few large aggregators who prioritize commissions over customer value
- Opaque in pricing and policy terms
- Limited in choice due to exclusive partnerships
- Filled with friction in the buying process

### The Solution

Vaatun leverages ONDC's open network to create a truly open insurance marketplace where:
- Any IRDAI-registered insurer can offer products
- Prices are transparent and comparable
- Customers have maximum choice
- The buying process is streamlined and digital-first

---

## Brand Identity

### Brand Positioning

**Tagline**: "Insurance, Unchained"
- Emphasizes freedom from traditional marketplace constraints
- Bold, memorable, speaks to liberation from aggregator lock-in

**Alternative Taglines** (for A/B testing):
- "The Open Insurance Network"
- "Insurance Without the Middlemen"

### Brand Voice

| Attribute | Description | Example |
|-----------|-------------|---------|
| Trustworthy | Backed by facts, government initiative | "IRDAI-regulated insurers only" |
| Transparent | No hidden agendas, clear communication | "No hidden fees. Ever." |
| Empowering | User is in control | "You choose. We connect." |
| Approachable | Not intimidating, jargon-free | "Health insurance, simplified" |

### Brand Values

1. **Openness** — Open network, open pricing, open choice
2. **Transparency** — What you see is what you pay
3. **Simplicity** — Insurance shouldn't be complicated
4. **Trust** — Government-backed, regulated partners only

---

## Target Audience

### Primary Personas

#### Persona 1: Digital-First Millennial (Priya, 28)
- **Demographics**: Urban, employed, 25-40 years old
- **Behavior**: Researches online, compares options, values convenience
- **Needs**: First health insurance, wants transparent pricing
- **Pain Points**: Doesn't trust aggregators, overwhelmed by options
- **Goal**: Find affordable health coverage without sales pressure

#### Persona 2: Young Family (Rahul & Sneha, 35)
- **Demographics**: Married, 1-2 children, dual income
- **Behavior**: Risk-aware, plans ahead, seeks comprehensive coverage
- **Needs**: Family health floater, car insurance renewal
- **Pain Points**: Current policies are expensive, claims process unclear
- **Goal**: Better coverage at lower cost, easy claims

#### Persona 3: Small Business Owner (Deepak, 42)
- **Demographics**: Owns delivery business, 5-10 vehicles
- **Behavior**: Price-sensitive, time-constrained, needs reliability
- **Needs**: Commercial vehicle insurance, possibly group health
- **Pain Points**: Complex quotes, inconsistent pricing, slow processes
- **Goal**: Insure fleet quickly at competitive rates

### User Needs Matrix

| Need | Priya | Rahul & Sneha | Deepak |
|------|-------|---------------|--------|
| Price transparency | High | High | Critical |
| Multiple options | Medium | High | High |
| Quick process | High | Medium | Critical |
| Expert guidance | Medium | High | Low |
| Mobile experience | Critical | High | Medium |

---

## Information Architecture

### Site Map

```
/                              → Homepage (Insurance Marketplace)
│
├── /health                    → Health Insurance Hub
│   ├── /health/individual     → Individual Health Plans
│   ├── /health/family         → Family Floater Plans
│   ├── /health/senior         → Senior Citizen Plans
│   ├── /health/compare        → Compare Health Plans
│   └── /health/[quote-id]     → Quote Results
│
├── /motor                     → Motor Insurance Hub
│   ├── /motor/car             → Car Insurance
│   ├── /motor/bike            → Two-Wheeler Insurance
│   ├── /motor/commercial      → Commercial Vehicle Insurance
│   ├── /motor/compare         → Compare Motor Plans
│   └── /motor/[quote-id]      → Quote Results
│
├── /compare                   → Universal Comparison Tool
│
├── /claims                    → Claims Guide & Support
│   ├── /claims/health         → Health Claims Process
│   └── /claims/motor          → Motor Claims Process
│
├── /about                     → About Vaatun
│   ├── /about/ondc            → About ONDC
│   └── /about/partners        → Insurance Partners
│
├── /tech                      → Technical Documentation
│   ├── /tech/api              → API Reference
│   ├── /tech/integration      → Integration Guide
│   └── /tech/developers       → Developer Resources
│
├── /support                   → Help & Support
│   ├── /support/faq           → Frequently Asked Questions
│   └── /support/contact       → Contact Us
│
└── /legal                     → Legal Pages
    ├── /legal/privacy         → Privacy Policy
    ├── /legal/terms           → Terms of Service
    └── /legal/grievance       → Grievance Redressal
```

### Navigation Structure

#### Primary Navigation (Header)

```
[Logo: Vaatun]  Health Insurance ▼  Motor Insurance ▼  Claims  About  [Get Quote]
```

**Health Insurance Dropdown**:
- Individual Plans
- Family Plans
- Senior Citizen Plans
- Compare All Plans

**Motor Insurance Dropdown**:
- Car Insurance
- Bike Insurance
- Commercial Vehicles
- Compare All Plans

#### Footer Navigation

| Column 1: Insurance | Column 2: Resources | Column 3: Company | Column 4: Support |
|---------------------|---------------------|-------------------|-------------------|
| Health Insurance | How It Works | About Vaatun | Help Center |
| Motor Insurance | Claims Guide | About ONDC | Contact Us |
| Compare Policies | Insurance Glossary | Partners | Grievance |
| Renew Policy | Blog | Careers | — |

#### Utility Navigation (Top Strip)

```
📞 1800-XXX-XXXX (Toll Free)  |  🏥 Find Hospital  |  🔧 Find Garage  |  👤 Login
```

---

## Design System

### Color Palette

#### Primary Colors

| Name | Hex | Usage |
|------|-----|-------|
| Deep Blue | `#1a365d` | Primary brand, headers, trust |
| Teal | `#0d9488` | ONDC alignment, health accent |
| Orange | `#ea580c` | CTAs, urgency, attention |

#### Secondary Colors

| Name | Hex | Usage |
|------|-----|-------|
| Light Blue | `#3b82f6` | Motor accent, links |
| Green | `#16a34a` | Success states, confirmations |
| Amber | `#f59e0b` | Warnings, highlights |
| Red | `#dc2626` | Errors, critical alerts |

#### Neutrals

| Name | Hex | Usage |
|------|-----|-------|
| Gray 900 | `#111827` | Primary text |
| Gray 600 | `#4b5563` | Secondary text |
| Gray 400 | `#9ca3af` | Placeholder, disabled |
| Gray 100 | `#f3f4f6` | Backgrounds, cards |
| White | `#ffffff` | Page background |

### Typography

#### Font Stack

```css
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', monospace; /* For /tech pages */
```

#### Type Scale

| Element | Size (Desktop) | Size (Mobile) | Weight |
|---------|----------------|---------------|--------|
| H1 | 48-72px | 36-48px | Bold (700) |
| H2 | 36-48px | 28-36px | Bold (700) |
| H3 | 24-30px | 20-24px | Semibold (600) |
| H4 | 18-20px | 16-18px | Semibold (600) |
| Body | 16px | 16px | Regular (400) |
| Small | 14px | 14px | Regular (400) |
| Caption | 12px | 12px | Medium (500) |

### Spacing System

Base unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight spacing |
| `space-2` | 8px | Element padding |
| `space-3` | 12px | Card padding |
| `space-4` | 16px | Section gaps |
| `space-6` | 24px | Component spacing |
| `space-8` | 32px | Section padding |
| `space-12` | 48px | Large sections |
| `space-16` | 64px | Page sections |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 4px | Buttons, inputs |
| `rounded-md` | 8px | Cards, modals |
| `rounded-lg` | 12px | Large cards |
| `rounded-full` | 9999px | Pills, avatars |

### Shadows

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--shadow-card: 0 4px 12px rgba(0, 0, 0, 0.08);
```

### Component Styles

#### Buttons

| Variant | Background | Text | Border | Usage |
|---------|------------|------|--------|-------|
| Primary | Orange | White | None | Main CTAs |
| Secondary | White | Gray 900 | Gray 300 | Secondary actions |
| Ghost | Transparent | Gray 700 | None | Tertiary actions |
| Link | Transparent | Blue | None | Inline links |

#### Cards

- Background: White
- Border: 1px Gray 200
- Border Radius: 12px
- Shadow: shadow-card
- Padding: 24px

#### Form Inputs

- Height: 44px (touch-friendly)
- Border: 1px Gray 300
- Border Radius: 8px
- Focus: 2px Blue ring
- Error: Red border + message

---

## Shared Components

### Header Component

**File**: `src/components/layout/Header.tsx`

```
┌────────────────────────────────────────────────────────────────────┐
│ [Logo]  Health ▼  Motor ▼  Claims  About    [📞 1800-XXX]  [Quote] │
└────────────────────────────────────────────────────────────────────┘
```

**Behavior**:
- Sticky on scroll
- Dropdown menus on hover (desktop) / tap (mobile)
- Mobile: Hamburger menu
- CTA button always visible

### Footer Component

**File**: `src/components/layout/Footer.tsx`

**Sections**:
1. Main navigation columns
2. Insurer partner logos
3. IRDAI disclaimer
4. Copyright + legal links

### Quote Widget Component

**File**: `src/components/shared/QuoteWidget.tsx`

**Props**:
- `type`: 'health' | 'motor' | 'both'
- `variant`: 'compact' | 'full'
- `onSubmit`: callback function

**Used on**: Homepage, Health page, Motor page

### Trust Indicators Component

**File**: `src/components/shared/TrustIndicators.tsx`

**Content**:
- Number of insurers
- Zero fees badge
- IRDAI regulated
- ONDC powered

### Testimonial Card Component

**File**: `src/components/shared/TestimonialCard.tsx`

**Props**:
- `name`: string
- `location`: string
- `type`: string (e.g., "Car Insurance")
- `quote`: string
- `avatar?`: string (URL)

---

## Technical Requirements

### Performance Targets

| Metric | Target | Tool |
|--------|--------|------|
| LCP | < 2.5s | Core Web Vitals |
| FID | < 100ms | Core Web Vitals |
| CLS | < 0.1 | Core Web Vitals |
| TTI | < 3.5s | Lighthouse |
| Bundle Size | < 200KB (initial) | webpack-bundle-analyzer |

### SEO Requirements

- Server-side rendering for all public pages
- Proper heading hierarchy (single H1 per page)
- Semantic HTML throughout
- Structured data (JSON-LD) for organization, products
- XML sitemap generation
- robots.txt configuration
- Canonical URLs

### Accessibility Requirements

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Color contrast ratios (4.5:1 minimum)
- Focus indicators
- Alt text for images
- ARIA labels where needed

### Browser Support

| Browser | Version |
|---------|---------|
| Chrome | Last 2 versions |
| Firefox | Last 2 versions |
| Safari | Last 2 versions |
| Edge | Last 2 versions |
| Mobile Safari | iOS 14+ |
| Chrome Android | Last 2 versions |

---

## Analytics & Tracking

### Event Taxonomy

#### Page Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `page_view` | Page load | `page_name`, `page_type` |
| `scroll_depth` | 25/50/75/100% | `depth`, `page_name` |

#### Interaction Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `cta_click` | CTA clicked | `cta_label`, `location` |
| `nav_click` | Nav item clicked | `nav_item`, `nav_type` |
| `dropdown_open` | Dropdown opened | `dropdown_name` |
| `faq_expand` | FAQ opened | `question_id` |

#### Quote Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `quote_start` | Form interaction begins | `quote_type` |
| `quote_field_complete` | Field filled | `field_name`, `quote_type` |
| `quote_submit` | Form submitted | `quote_type`, `fields` |
| `quote_result_view` | Results displayed | `quote_type`, `num_results` |
| `quote_compare` | Compare clicked | `policies_compared` |
| `quote_select` | Policy selected | `insurer`, `premium` |

#### Conversion Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `checkout_start` | Begin purchase | `policy_type`, `premium` |
| `payment_complete` | Payment success | `policy_type`, `premium`, `insurer` |
| `policy_issued` | Policy generated | `policy_id` |

### Funnel Definitions

**Primary Funnel: Quote to Purchase**
```
Page View → Quote Start → Quote Submit → Results View → Select Policy → Checkout → Payment → Policy Issued
```

**Secondary Funnel: Exploration**
```
Page View → Category Click → Sub-category → Quote Start
```

---

## Content Requirements

### Shared Content Blocks

#### ONDC Explainer (Short)

```
ONDC (Open Network for Digital Commerce) is a Government of India
initiative that creates an open, interoperable network for digital
commerce. It enables buyers to access products and services from
any seller on the network, promoting fair competition and transparency.
```

#### IRDAI Disclaimer

```
Insurance is the subject matter of solicitation. IRDAI does not
endorse or approve any insurance product. Visitors are requested
to verify the credentials of any insurance company from the IRDAI
website before entering into any policy.
```

#### TSP Disclaimer (Testing Phase)

```
Vaatun is a Technology Service Provider (TSP) registered with ONDC.
Vaatun does not hold an insurance broking license and operates solely
as a technology platform connecting users with ONDC network participants.

⚠️ TESTING PHASE: This portal is currently in testing/staging mode.
You cannot purchase actual insurance policies through this platform
at this time. All quotes and transactions are for demonstration
purposes only.
```

#### Trust Statement

```
All insurers on Vaatun are registered with IRDAI and connected
via ONDC's secure network. Your data is encrypted and shared
only with insurers you choose to engage with.
```

### Glossary Terms (For tooltip/explainer use)

| Term | Definition |
|------|------------|
| Premium | The amount you pay for your insurance policy |
| Sum Insured | Maximum amount the insurer will pay for claims |
| Deductible | Amount you pay before insurance kicks in |
| Copay | Percentage of claim amount you share with insurer |
| Waiting Period | Time before certain benefits become active |
| NCB | No Claim Bonus - discount for claim-free years |
| IDV | Insured Declared Value - your vehicle's market value |
| Third Party | Coverage for damage you cause to others |
| Comprehensive | Full coverage including own damage |

---

## Launch Checklist

### Pre-Launch

- [ ] All page PRDs approved
- [ ] Design mockups completed and approved
- [ ] Content written and reviewed
- [ ] Legal review of all claims/copy
- [ ] IRDAI compliance verified
- [ ] API endpoints ready
- [ ] Analytics configured
- [ ] SEO setup complete
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] Cross-browser testing complete
- [ ] Mobile testing complete

### Launch Day

- [ ] DNS/redirect configuration
- [ ] SSL certificate verification
- [ ] Monitoring dashboards ready
- [ ] Support team briefed
- [ ] Rollback plan documented

### Post-Launch

- [ ] Monitor error rates
- [ ] Track conversion funnel
- [ ] Gather user feedback
- [ ] A/B test prioritization
- [ ] Performance monitoring

---

## Success Metrics

### North Star Metric

**Policies Issued per Week** — Direct measure of marketplace success

### Primary KPIs

| Metric | Current | Target (Month 1) | Target (Month 3) |
|--------|---------|------------------|------------------|
| Weekly Quote Requests | 0 | 500 | 2,000 |
| Quote-to-Policy Rate | N/A | 2% | 4% |
| Policies Issued/Week | 0 | 10 | 80 |
| Avg. Policy Value | N/A | ₹8,000 | ₹10,000 |

### Secondary KPIs

| Metric | Target |
|--------|--------|
| Bounce Rate | < 40% |
| Avg. Session Duration | > 2 min |
| Pages per Session | > 2.5 |
| Mobile Conversion Parity | Within 20% of desktop |
| NPS Score | > 40 |

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Low initial traffic | High | Medium | SEO investment, content marketing, paid acquisition |
| API reliability issues | High | Low | Fallback UI, email capture, queue system |
| Regulatory concerns | High | Low | Legal review, IRDAI compliance checks |
| Insurer onboarding delays | Medium | Medium | Launch with available insurers, add more post-launch |
| Poor mobile experience | Medium | Low | Mobile-first design, extensive testing |
| Quote abandonment | Medium | High | Simplify forms, save progress, retargeting |

---

## Open Questions (Cross-Page)

1. **User Accounts**: Do users need accounts to get quotes? To purchase?
2. **Price Caching**: How long are quotes valid? Real-time vs cached?
3. **Multi-language**: English-only launch or Hindi from start?
4. **Chat Support**: Live chat widget on all pages or just support?
5. **Partner Branding**: How prominently do insurers want to appear?

---

## Appendix

### Competitive Landscape

| Competitor | Strengths | Weaknesses | Our Advantage |
|------------|-----------|------------|---------------|
| PolicyBazaar | Brand, selection | High pressure sales, commissions | Transparency, open network |
| Acko | Digital UX | Single insurer | Multi-insurer choice |
| Digit | Modern brand | Limited to own products | Network-wide access |
| Coverfox | Comparison tools | Same model as PB | ONDC transparency |
| InsuranceDekho | Growing | Similar issues | Open marketplace |

### ONDC Insurance Status

- Motor insurance live on ONDC (2024)
- Health insurance in pilot phase
- Growing insurer participation
- Government push for adoption in 2025

### References

- [ONDC Official Site](https://ondc.org)
- [IRDAI Guidelines](https://irdai.gov.in)
- [ONDC Insurance Protocol](https://github.com/ONDC-Official)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-24 | Product Team | Initial overview PRD |

---

## Approvals

- [ ] Product Lead
- [ ] Design Lead
- [ ] Engineering Lead
- [ ] Legal/Compliance
- [ ] Marketing Lead
