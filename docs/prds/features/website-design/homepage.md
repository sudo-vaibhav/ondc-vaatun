# Homepage PRD

## Document Information

**Version**: 2.0
**Created**: 2025-12-24
**Updated**: 2026-01-01
**Status**: Draft
**Parent PRD**: [Homepage Insurance Redesign](../homepage-insurance-redesign.md)

---

## Page Overview

**Route**: `/`
**Purpose**: Marketing-first landing page that showcases live network activity while converting visitors into insurance quote requests
**Target Conversion**: Quote form submissions (Health or Motor)

### Key Differentiator: Live Network Data

Unlike static landing pages, our homepage demonstrates the power of ONDC by showing **real-time data from the network**. When a user lands on the page:

1. A background search is automatically initiated
2. Results stream in via Server-Sent Events (SSE)
3. Insurer names and product names are extracted and displayed in a trust carousel
4. This creates a "living" page that proves the network is active and responsive

This approach:
- Builds trust by showing real insurers responding in real-time
- Demonstrates the speed and breadth of the ONDC network
- Creates urgency and engagement without being pushy
- Differentiates us from static aggregator pages

---

## Page Layout

```
┌────────────────────────────────────────────────────────────────────┐
│                         HEADER / NAV                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SECTION 1: HERO                                                   │
│  ┌─────────────────────────────┬──────────────────────────────┐   │
│  │  Headline + Subheadline     │  Quick Quote Widget          │   │
│  │  CTAs                       │  [Health] [Motor] toggle     │   │
│  └─────────────────────────────┴──────────────────────────────┘   │
│                                                                     │
├────────────────────────────────────────────────────────────────────┤
│  SECTION 2: LIVE NETWORK CAROUSEL (dynamic, real-time)             │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  🔴 LIVE   "Available now on ONDC"                          │   │
│  │  ← [HDFC: Family Health] [Star: Senior Care] [Bajaj: ...] → │   │
│  │     (auto-populated from streaming search results)           │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
├────────────────────────────────────────────────────────────────────┤
│  SECTION 3: TRUST INDICATORS (horizontal strip)                    │
│  [ {N} Insurers ] [ ₹0 Fees ] [ IRDAI Regulated ] [ ONDC ]        │
│  (insurer count dynamically updated from live data)                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SECTION 4: INSURANCE VERTICALS                                    │
│  ┌────────────────────────┐  ┌────────────────────────┐           │
│  │    HEALTH INSURANCE    │  │    MOTOR INSURANCE     │           │
│  │    - Benefits          │  │    - Benefits          │           │
│  │    - CTA               │  │    - CTA               │           │
│  └────────────────────────┘  └────────────────────────┘           │
│                                                                     │
├────────────────────────────────────────────────────────────────────┤
│  SECTION 5: HOW IT WORKS (4-step horizontal timeline)              │
│  [1. Tell Us] → [2. We Search] → [3. Compare] → [4. Get Covered]  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SECTION 6: WHY ONDC (2x2 feature grid)                            │
│  ┌──────────────┐ ┌──────────────┐                                │
│  │ Open Network │ │ Transparent  │                                │
│  └──────────────┘ └──────────────┘                                │
│  ┌──────────────┐ ┌──────────────┐                                │
│  │ Your Data    │ │ Freedom to   │                                │
│  │ Your Control │ │ Switch       │                                │
│  └──────────────┘ └──────────────┘                                │
│                                                                     │
├────────────────────────────────────────────────────────────────────┤
│  SECTION 7: TESTIMONIALS (carousel)                                │
│  ◀ [ Testimonial Card ] ▶                                         │
│  [ Trust Metrics Strip ]                                           │
├────────────────────────────────────────────────────────────────────┤
│  SECTION 8: FAQ (accordion, 4-5 questions)                         │
├────────────────────────────────────────────────────────────────────┤
│  SECTION 9: FINAL CTA (full-width banner)                          │
│  "Ready to Find Your Perfect Policy?" [Get Quote]                  │
├────────────────────────────────────────────────────────────────────┤
│                         FOOTER                                      │
└────────────────────────────────────────────────────────────────────┘
```

---

## Section Details

### Section 1: Hero

**Layout**: Split — 60% copy (left), 40% quote widget (right)
**Background**: Subtle gradient or pattern
**Mobile**: Stack vertically, quote widget below copy

#### Copy

**Badge** (above headline):
```
Powered by ONDC
```

**Headline**:
```
Insurance, Unchained.
```

**Subheadline**:
```
Compare real-time quotes from India's leading insurers on the Open Network.
No middlemen. No hidden fees. Just the coverage you need.
```

**Supporting Text**:
```
Backed by the Government of India's initiative to democratize digital commerce.
```

**Primary CTA**:
- Label: "Get Instant Quotes"
- Action: Scroll to quote widget (mobile) or focus quote form (desktop)
- Style: Solid primary button, large

**Secondary CTA**:
- Label: "See How It Works"
- Action: Smooth scroll to Section 4
- Style: Outline/ghost button

#### 3D Hero Animation

**Spline Scene**: [WEB Diagram](https://community.spline.design/file/0e8a6d7e-b090-4d6d-95f4-fdc3b432580c)
**License**: CC0 1.0 (Public Domain)

**Purpose**: Network workflow visualization representing the ONDC insurance journey. The 3D scene shows interconnected nodes that visually communicate how the open network connects users to insurers.

**Step Labels to Customize** (in Spline editor):
| Step | Label |
|------|-------|
| 1 | Share Details |
| 2 | Search Network |
| 3 | Compare |
| 4 | Get Covered |

**Layout**: Position the 3D scene as a background element behind the hero copy, or as a side element on desktop.

**Integration**:
```bash
pnpm add @splinetool/react-spline
```

```tsx
import Spline from '@splinetool/react-spline';

export function HeroAnimation() {
  return (
    <Spline
      scene="https://prod.spline.design/[customized-scene-id]/scene.splinecode"
    />
  );
}
```

**Interaction**: Mouse-based camera orbit animation (built into Spline scene)

**Performance Considerations**:
- Implement lazy loading for the Spline scene
- Provide static fallback image for slow connections
- Consider reduced-motion preferences

**Mobile**: Show simplified animation or static representation of the network diagram

---

#### Quote Widget

**Toggle Tabs**: `[Health]` `[Motor]`

**Health Form Fields**:
| Field | Type | Placeholder/Options |
|-------|------|---------------------|
| Your Age | Number input | "Your age" |
| City | Autocomplete | "Select city" |
| Members | Multi-select | Self, Spouse, Children, Parents |
| Coverage | Select | ₹3L, ₹5L, ₹10L, ₹25L, ₹50L, ₹1Cr |

**Motor Form Fields**:
| Field | Type | Placeholder/Options |
|-------|------|---------------------|
| Vehicle Type | Radio | Car, Bike |
| Registration Year | Select | 2024, 2023, ... 2010 |
| Brand | Autocomplete | "Select brand" |
| Model | Autocomplete | "Select model" (dependent) |
| RTO | Autocomplete | "RTO code" |

**Submit Button**: "View Quotes →"

**Trust Line** (below button):
```
✓ No spam  ✓ No obligations  ✓ Instant results
```

---

### Section 2: Live Network Carousel

**Purpose**: Showcase real-time product availability from ONDC network to build trust and demonstrate network activity.

**Layout**: Full-width horizontal carousel/marquee
**Background**: Subtle accent color or gradient
**Mobile**: Same, possibly slower scroll speed

#### Visual Design

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔴 LIVE                                                                │
│  ───────────────────────────────────────────────────────────────────── │
│  "Insurance products available right now on ONDC"                       │
│                                                                         │
│  ← ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ →  │
│    │ HDFC Ergo   │ │ Star Health │ │ Bajaj       │ │ ICICI       │     │
│    │ ─────────── │ │ ─────────── │ │ ─────────── │ │ ─────────── │     │
│    │ Family      │ │ Senior      │ │ Health      │ │ Complete    │     │
│    │ Health Plan │ │ Citizen     │ │ Guard       │ │ Health      │     │
│    └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘     │
│                                                                         │
│  {N} products from {M} insurers responding now                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Data Source

This section is populated **dynamically** from live search results:

1. **On Page Load**: A search request is automatically initiated via `POST /api/ondc/search`
2. **Streaming**: Results stream in via SSE from `/api/ondc/search-stream/{transactionId}`
3. **Data Extraction**: From each `on_search` response, we extract:
   - **Insurer Name**: `message.catalog.bpp/providers[].descriptor.name` or BPP descriptor
   - **Product Name**: `message.catalog.bpp/providers[].items[].descriptor.name`
4. **Display**: Products are added to the carousel as they arrive

#### Carousel Item Structure

Each carousel item displays:

| Field | Source | Example |
|-------|--------|---------|
| Insurer Name | Provider/BPP name | "HDFC Ergo" |
| Product Name | Item descriptor name | "Optima Secure" |
| Category Badge | Item category | "Health" |

**Styling**:
- Clean card design with insurer logo (if available) or text
- Product name prominently displayed
- Subtle animation on entry (fade in from right)
- Infinite scroll marquee when multiple items

#### States

| State | Display |
|-------|---------|
| **Loading** | Skeleton cards with subtle pulse animation |
| **Live** | Cards animate in as they arrive + 🔴 LIVE indicator pulsing |
| **Populated** | Carousel scrolling with all discovered products + "{N} products available" |
| **Fallback** | Static insurer logos + "Our network partners" (used when no live data) |

**Note**: All states should feel natural and marketing-oriented. Never show technical states like "searching", "connecting", or "timeout" to users. The transition between states should be smooth and imperceptible.

#### Interaction

- **Hover/Touch**: Pause marquee scroll
- **Click on Card**: Navigate to quote form with pre-selected category
- **View All CTA**: "See all {N} products →" links to full search results

#### Technical Implementation

```typescript
// Data structure for carousel items
interface LiveProduct {
  id: string;
  insurerName: string;
  insurerLogo?: string;
  productName: string;
  category: 'health' | 'motor';
  bppId: string;
  providerId: string;
  itemId: string;
}

// Extract from on_search response
function extractProducts(response: OnSearchResponse): LiveProduct[] {
  const products: LiveProduct[] = [];
  const bppName = response.message?.catalog?.['bpp/descriptor']?.name;

  for (const provider of response.message?.catalog?.['bpp/providers'] || []) {
    for (const item of provider.items || []) {
      products.push({
        id: `${response.context.bpp_id}-${provider.id}-${item.id}`,
        insurerName: provider.descriptor?.name || bppName || 'Unknown',
        productName: item.descriptor?.name || 'Insurance Plan',
        category: 'health', // derived from search context
        bppId: response.context.bpp_id,
        providerId: provider.id,
        itemId: item.id,
      });
    }
  }
  return products;
}
```

#### Performance Considerations

- **Lazy Load**: Don't block page render; show skeleton first
- **Limit Display**: Show max 10-15 items in carousel, even if more available
- **Dedupe**: Avoid showing duplicate insurer/product combinations
- **Graceful Fallback**: Always have static content ready if streaming fails

---

### Section 3: Trust Indicators

**Layout**: Horizontal strip, centered, 4 items
**Background**: Subtle contrast from hero (light gray or off-white)
**Mobile**: 2x2 grid

**Items**:

| Icon | Stat | Label | Dynamic? |
|------|------|-------|----------|
| Building icon | {N}+ | Insurers on Network | Yes - from live data |
| Rupee icon | ₹0 | Platform Fees | Static |
| Shield-check icon | IRDAI | Regulated Insurers | Static |
| ONDC logo | — | Powered by ONDC | Static |

**Dynamic Insurer Count**:
- Default shows "10+" as fallback
- Once live data arrives, update to actual count: "{N} Insurers responding"
- Animate the number change with count-up effect

**Insurer Logo Strip** (below stats):
- **Dynamic**: Show logos of insurers that responded in live search
- **Fallback**: Show static partner logos if no live data
- Scrolling marquee, grayscale or subtle color
- "And more on the network..." at end

---

### Section 4: Insurance Verticals

**Layout**: Two equal-width cards, side by side
**Mobile**: Stack vertically
**Card Style**: Elevated cards with subtle shadow, rounded corners (12px)

#### Card A: Health Insurance

**Icon**: Heart with shield (Lucide: `HeartPulse` or `ShieldPlus`)
**Color Accent**: Teal/Cyan

**Content**:

```
Health Insurance
────────────────
Protect what matters most

From individual coverage to comprehensive family floaters,
find health insurance that fits your life. Compare cashless
hospital networks, coverage limits, and premiums across
multiple insurers—all in one place.

✓ Cashless treatment at 10,000+ hospitals
✓ No waiting period for accidents
✓ Free annual health checkups
✓ Coverage from ₹3 Lakh to ₹1 Crore+

[Explore Health Plans →]

Starting ₹400/month
```

#### Card B: Motor Insurance

**Icon**: Car with shield (Lucide: `Car` or `ShieldCheck`)
**Color Accent**: Blue

**Content**:

```
Motor Insurance
───────────────
Drive with confidence

Whether you're insuring your first bike or renewing your
car policy, get the best rates from trusted insurers.
Comprehensive and third-party options with instant
policy issuance.

✓ Instant policy issuance
✓ Cashless repairs at 5,000+ garages
✓ 24/7 roadside assistance
✓ Zero depreciation add-ons available

[Explore Motor Plans →]

Starting ₹2,000/year
```

---

### Section 5: How It Works

**Layout**: Horizontal stepper/timeline with 4 steps
**Mobile**: Vertical timeline
**Animation**: Steps animate in on scroll (staggered)

**Section Header**:
```
How Buying Insurance on ONDC Works
```

**Section Subheader**:
```
A transparent, open marketplace where you're always in control
```

#### Steps

**Step 1**:
- Icon: `ClipboardList` or `FormInput`
- Title: "Tell Us What You Need"
- Description: "Share basic details about yourself and what you want covered. No lengthy forms—just the essentials."

**Step 2**:
- Icon: `Network` or `Globe`
- Title: "We Search the Network"
- Description: "Your request goes out to all insurers on ONDC. They compete to offer you their best rates in real-time."

**Step 3**:
- Icon: `Scale` or `GitCompare`
- Title: "Compare & Choose"
- Description: "See all offers side-by-side. Compare premiums, coverage, claim settlement ratios, and reviews. No hidden fees."

**Step 4**:
- Icon: `ShieldCheck` or `BadgeCheck`
- Title: "Get Covered Instantly"
- Description: "Complete your purchase digitally. Your policy is issued immediately—no paperwork, no waiting."

---

### Section 6: Why ONDC

**Layout**: 2x2 grid of feature cards
**Mobile**: Single column stack
**Card Style**: Minimal cards with icon, title, description

**Section Header**:
```
The ONDC Advantage
```

**Section Subheader**:
```
A Government of India initiative transforming how India buys and sells
```

#### Features

**Feature 1**:
- Icon: `Globe2` or `Network`
- Title: "Truly Open Marketplace"
- Copy: "Unlike closed platforms, ONDC connects you directly with insurers. No platform lock-in, no preferential treatment—just fair competition."

**Feature 2**:
- Icon: `BadgeIndianRupee` or `Receipt`
- Title: "What You See Is What You Pay"
- Copy: "No hidden commissions inflating your premium. Insurers quote their actual rates, and you pay exactly that."

**Feature 3**:
- Icon: `Lock` or `ShieldCheck`
- Title: "Privacy by Design"
- Copy: "Your data stays yours. ONDC's protocol ensures your information is shared only with insurers you choose to engage with."

**Feature 4**:
- Icon: `ArrowRightLeft` or `Repeat`
- Title: "Freedom to Switch"
- Copy: "Policies bought on ONDC are recognized across the network. Renew with any platform, compare anywhere."

---

### Section 7: Social Proof

**Layout**: Testimonial carousel + trust metrics strip
**Mobile**: Swipeable cards
**Auto-rotate**: Every 5 seconds (pause on hover)

**Section Header**:
```
Trusted by Thousands of Indians
```

#### Testimonials

**Testimonial 1**:
```
Name: Priya S.
Location: Bangalore
Type: Car Insurance Customer
Quote: "I was skeptical about buying insurance online, but Vaatun made it
incredibly simple. Got quotes from 6 insurers in seconds and saved
₹4,000 on my car insurance renewal."
```

**Testimonial 2**:
```
Name: Rahul M.
Location: Mumbai
Type: Health Insurance Customer
Quote: "Finally, a platform that doesn't push the most expensive policy.
The comparison was transparent, and I found a health plan that
actually fit my budget and needs."
```

**Testimonial 3**:
```
Name: Deepak K.
Location: Delhi
Type: Commercial Vehicle Customer
Quote: "As a small business owner, I needed fleet insurance without the
runaround. Vaatun connected me with insurers who understood
commercial vehicles. Policy issued same day."
```

#### Trust Metrics Strip

| Metric | Value | Icon |
|--------|-------|------|
| Google Rating | 4.8/5 | Star |
| Policies Issued | 50,000+ | FileCheck |
| Claim Support | 98% | HeartHandshake |

---

### Section 8: FAQ

**Layout**: Accordion, collapsed by default
**Mobile**: Same, full-width
**Show**: 4-5 most common questions

**Section Header**:
```
Common Questions
```

#### Questions

**Q1**: Is buying insurance through ONDC safe?
```
Yes. ONDC is a Government of India initiative backed by the Department
for Promotion of Industry and Internal Trade. All insurers on the network
are IRDAI-registered and regulated. Your transactions are secured with
bank-grade encryption.
```

**Q2**: Will my policy be valid if I buy through Vaatun?
```
Absolutely. Your policy is issued directly by the insurer, not by us.
Vaatun is simply the platform that connects you to insurers via ONDC.
Your policy documents come directly from the insurance company.
```

**Q3**: How do I file a claim?
```
Claims are handled directly by your insurer, just like any traditional
policy. We provide you with all insurer contact details and can guide
you through the process. Many insurers offer digital claim filing.
```

**Q4**: Why are prices lower on ONDC?
```
Traditional insurance aggregators charge insurers 15-30% commission,
which gets built into your premium. ONDC operates on minimal transaction
fees, allowing insurers to pass savings directly to you.
```

**Q5**: What if I need help choosing a policy?
```
Our comparison tools show you all the details you need—premiums,
coverage, exclusions, and claim settlement ratios. If you still need
guidance, you can speak with our support team who can walk you
through your options without any sales pressure.
```

**CTA Link**: "View All FAQs →" (links to /support/faq)

---

### Section 9: Final CTA

**Layout**: Full-width banner
**Background**: Primary color gradient or branded pattern
**Mobile**: Same, vertically stacked

**Content**:

```
Ready to Find Your Perfect Policy?
───────────────────────────────────
Join thousands of Indians saving money with transparent,
open-network insurance.

[Get Your Free Quote]          Talk to an Expert →

No spam. No obligations. Just honest quotes.
```

**Primary CTA**:
- Label: "Get Your Free Quote"
- Action: Scroll to hero quote widget
- Style: Large white button on colored background

**Secondary CTA**:
- Label: "Talk to an Expert →"
- Action: Opens chat widget or /contact
- Style: Text link, underlined

---

## Component Requirements

### New Components Needed

| Component | Location | Description |
|-----------|----------|-------------|
| `LiveNetworkCarousel` | `src/components/home/LiveNetworkCarousel.tsx` | **Key component** - Real-time product carousel from SSE stream |
| `QuoteWidget` | `src/components/home/QuoteWidget.tsx` | Tabbed form for Health/Motor quotes |
| `TrustStrip` | `src/components/home/TrustStrip.tsx` | Stats + optional insurer logos (with dynamic count) |
| `InsuranceCard` | `src/components/home/InsuranceCard.tsx` | Vertical card for insurance type |
| `HowItWorks` | `src/components/home/HowItWorks.tsx` | Stepper timeline |
| `FeatureGrid` | `src/components/home/FeatureGrid.tsx` | 2x2 ONDC features |
| `TestimonialCarousel` | `src/components/home/TestimonialCarousel.tsx` | Rotating testimonials |
| `FAQAccordion` | `src/components/home/FAQAccordion.tsx` | Expandable FAQ list |
| `CTABanner` | `src/components/home/CTABanner.tsx` | Full-width conversion banner |

### Existing Components to Reuse

- `Badge` — For labels and tags
- `Button` — CTAs throughout
- `Card` — Base for insurance cards
- `Separator` — Section dividers
- `Accordion` — FAQ section (add via shadcn if not present)

### shadcn Components to Add

```bash
pnpm dlx shadcn@latest add accordion tabs carousel
```

---

## 21st.dev Component Recommendations

The following community components from [21st.dev](https://21st.dev) are recommended for accelerating homepage development. These are React + Tailwind components compatible with shadcn/ui.

### Hero Section

| Component | Link | Notes |
|-----------|------|-------|
| **Hero Section 4** (Tailark) | [View Component](https://21st.dev/community/components/meschacirung/hero-section-4/default) | Modern SaaS hero with nav, headline, dual CTAs, and infinite logo slider. Includes Framer Motion animations, backdrop blur header, and dark mode support. **Recommended as base.** |

**Why this component:**
- Split layout works well for headline + quote widget
- Built-in customer logo carousel (adapt for insurer logos)
- Responsive mobile menu included
- Professional animations out of the box

**Customization needed:**
- Replace logo slider with insurer logos
- Add quote widget to right side
- Update copy and CTAs
- Adjust color scheme to brand

---

### Trust Indicators / Client Logos

| Component | Link | Notes |
|-----------|------|-------|
| **Marquee** | [View Component](https://21st.dev/designali-in/marquee) | Infinite scrolling logo strip with configurable speed. |
| **Clients Components** | [Browse Collection](https://21st.dev/s/clients) | 16 client/partner logo display components |

**Usage:** Display insurer partner logos (HDFC Ergo, ICICI Lombard, Star Health, etc.) in a scrolling marquee below the hero.

---

### Feature Cards (Insurance Verticals)

| Component | Link | Notes |
|-----------|------|-------|
| **Feature Section with Bento Grid** (Aceternity) | [View Component](https://21st.dev/aceternity/feature-section-with-bento-grid) | Responsive bento grid with 4 feature cards, supports images and animations. Can be adapted to 2-card layout. |
| **Bento Grid** (Aceternity) | [View Component](https://21st.dev/aceternity/bento-grid) | Flexible bento layout, good for Health + Motor cards |
| **Cards Collection** | [Browse Collection](https://21st.dev/s/card) | 79 card components for various layouts |

**Why Bento Grid:**
- Visual hierarchy built-in
- Supports mixed content (icons, images, stats)
- Responsive by default
- Modern, polished aesthetic

**Customization needed:**
- Reduce to 2 primary cards (Health, Motor)
- Add benefit bullet points
- Include "Starting from ₹X" badges
- Add CTAs to each card

---

### Testimonials

| Component | Link | Notes |
|-----------|------|-------|
| **Animated Testimonials** (bankkroll) | [View Component](https://21st.dev/bankkroll/animated-testimonials/animated-testimonials) | Auto-rotating testimonial carousel with star ratings, avatars, fade animations. Two-column layout with navigation dots. **Recommended.** |
| **Testimonial Slider** (rf-rifat) | [View Component](https://21st.dev/community/components/rf-rifat/testimonial-slider) | Slider-based testimonial display |
| **Testimonial Card** (serafimcloud) | [View Component](https://21st.dev/serafimcloud/testimonial-card) | Individual testimonial card component |
| **Testimonial Card** (preetsuthar17) | [View Component](https://21st.dev/preetsuthar17/testimonial-card) | Alternative testimonial card style |

**Why Animated Testimonials:**
- Auto-rotation with configurable interval
- Smooth entrance animations (Framer Motion)
- Star ratings included
- Avatar, name, role, company layout
- Clickable navigation dots
- Professional two-column layout

**Customization needed:**
- Update content with insurance customer testimonials
- Adjust timing (recommend 6s rotation)
- Add trust metrics strip below

---

### FAQ Accordion

| Component | Link | Notes |
|-----------|------|-------|
| **Accordion** (fuma-nama) | [View Component](https://21st.dev/fuma-nama/accordion/default) | Clean accordion with smooth animations |
| **Accordion with Chevron** (originui) | [View Component](https://21st.dev/originui/accordion-with-chevron) | Accordion with chevron indicators |
| **Accordion Collection** | [Browse Collection](https://21st.dev/s/accordion) | 40 accordion components |

**Note:** shadcn's built-in Accordion may suffice, but 21st.dev options offer more animation polish.

---

### CTA Sections

| Component | Link | Notes |
|-----------|------|-------|
| **Calls to Action Collection** | [Browse Collection](https://21st.dev/s/call-to-action) | 34 CTA banner/section components |

**Usage:** Final conversion banner at bottom of page.

---

### Additional Useful Components

| Category | Link | Count | Use Case |
|----------|------|-------|----------|
| **Features** | [Browse](https://21st.dev/s/features) | 36 | "How It Works" stepper, "Why ONDC" grid |
| **Backgrounds** | [Browse](https://21st.dev/s/background) | 33 | Hero section backgrounds |

---

### Installation

21st.dev components can be installed via:

```bash
# Using 21st.dev CLI (if available)
npx 21st add <component-name>

# Or copy component code directly from the website
# Components are React + Tailwind, compatible with this project
```

### Implementation Priority

1. **Hero Section 4** → Adapt for hero + quote widget
2. **Animated Testimonials** → Customer social proof
3. **Bento Grid** → Health/Motor feature cards
4. **Marquee** → Insurer logo strip
5. **Accordion** → FAQ section (or use shadcn)

---

## Responsive Behavior

### Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | < 640px | Single column, stacked sections |
| Tablet | 640-1024px | 2-column where applicable |
| Desktop | > 1024px | Full layout as wireframed |

### Section-Specific Mobile Adjustments

| Section | Mobile Behavior |
|---------|-----------------|
| Hero | Quote widget below copy, full-width form |
| Trust Strip | 2x2 grid instead of 4-column |
| Insurance Cards | Stack vertically |
| How It Works | Vertical timeline |
| Why ONDC | Single column |
| Testimonials | Swipeable, arrows hidden |
| FAQ | Full-width accordion |
| Final CTA | Stacked buttons |

### Sticky Elements (Mobile)

- Header remains sticky with condensed CTA button
- Consider sticky "Get Quote" FAB on scroll

---

## Interactions & Animations

### Scroll Animations

| Element | Animation | Trigger |
|---------|-----------|---------|
| Section headers | Fade in + slide up | On viewport entry |
| Cards | Staggered fade in | On viewport entry |
| How It Works steps | Sequential reveal | On viewport entry |
| Trust metrics | Count up animation | On viewport entry |

### Micro-interactions

| Element | Interaction |
|---------|-------------|
| Quote widget tabs | Smooth content transition |
| Insurance cards | Subtle hover lift |
| CTA buttons | Scale + shadow on hover |
| FAQ items | Smooth expand/collapse |
| Testimonial dots | Active state change |

### Performance Considerations

- Use `Intersection Observer` for scroll animations
- Lazy load testimonial images
- Defer non-critical animations on mobile
- Respect `prefers-reduced-motion`

---

## SEO Requirements

### Meta Tags

```html
<title>Vaatun — Buy Health & Motor Insurance on ONDC | Compare Quotes Instantly</title>
<meta name="description" content="Compare real-time insurance quotes from India's leading insurers on ONDC. No hidden fees, transparent pricing. Get health and motor insurance in minutes." />
<meta name="keywords" content="insurance, health insurance, motor insurance, car insurance, bike insurance, ONDC, compare insurance, buy insurance online" />
```

### Open Graph

```html
<meta property="og:title" content="Insurance, Unchained — Vaatun" />
<meta property="og:description" content="Compare insurance quotes from 10+ insurers on India's open network. No middlemen, no hidden fees." />
<meta property="og:image" content="/og-home.png" />
<meta property="og:url" content="https://vaatun.com" />
```

### Structured Data

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Vaatun",
  "url": "https://vaatun.com",
  "description": "Insurance marketplace on ONDC",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://vaatun.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

---

## Analytics Events

### Key Events to Track

| Event | Trigger | Properties |
|-------|---------|------------|
| `page_view` | Page load | — |
| `live_carousel_loaded` | First product appears in carousel | `product_count`, `insurer_count` |
| `live_carousel_interaction` | User clicks/hovers carousel | `product_id`, `insurer_name` |
| `quote_form_start` | User interacts with form | `type: health|motor` |
| `quote_form_submit` | Form submission | `type`, `fields_completed` |
| `cta_click` | Any CTA clicked | `cta_label`, `section` |
| `faq_expand` | FAQ item opened | `question_id` |
| `testimonial_view` | Testimonial becomes visible | `testimonial_id` |
| `scroll_depth` | 25%, 50%, 75%, 100% | `depth` |

### Live Data Analytics

Track the effectiveness of the live network carousel:

| Metric | Description |
|--------|-------------|
| `live_data_success_rate` | % of page loads where live data successfully displayed |
| `time_to_first_product` | Seconds from page load to first carousel item |
| `carousel_engagement` | Clicks/hovers on live carousel vs static |
| `live_vs_static_conversion` | Quote submissions when live data shown vs fallback |

### Conversion Funnel

```
Page View → Live Data Engagement → Form Interaction → Form Submit → Quote Results → Policy Purchase
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Quote form submissions | 500/week | Form submit events |
| Form start rate | 30%+ | Visitors who interact with form |
| Scroll depth (50%+) | 60% | Analytics |
| Bounce rate | < 40% | Analytics |
| Time on page | > 2 min | Analytics |
| Mobile conversion parity | Within 20% of desktop | Segmented analytics |

---

## Implementation Notes

### Live Network Data Architecture

The homepage uses a **background streaming pattern** to fetch live data while presenting a marketing-first experience:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HOMEPAGE ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. PAGE LOAD                                                           │
│     └── React useEffect triggers background search                       │
│                                                                          │
│  2. SEARCH INITIATION (invisible to user)                               │
│     └── POST /api/ondc/search                                           │
│     └── Returns: { transactionId, messageId }                           │
│                                                                          │
│  3. SSE CONNECTION (invisible to user)                                  │
│     └── EventSource(/api/ondc/search-stream/{transactionId})            │
│     └── Events: connected → initial → update* → complete                │
│                                                                          │
│  4. DATA EXTRACTION (for marketing display)                             │
│     └── Extract insurer names + product names from responses            │
│     └── Update LiveNetworkCarousel with new items                       │
│     └── Update TrustStrip with insurer count                            │
│                                                                          │
│  5. GRACEFUL HANDLING                                                   │
│     └── Show skeleton/placeholder while loading                         │
│     └── Fallback to static content on error                             │
│     └── Never show technical errors to users                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Key Principles

1. **Marketing First**: The user sees a beautiful landing page, not a "search results" interface
2. **Progressive Enhancement**: Page works without live data; live data enhances trust
3. **Silent Background Work**: No loading spinners, no "searching..." messages in main UI
4. **Graceful Degradation**: Static fallback content always available
5. **No Technical Jargon**: Never show "timeout", "error", "stream", etc. to users

#### State Management

```typescript
// Homepage state (simplified)
interface HomepageState {
  // Live data (populated from background search)
  liveProducts: LiveProduct[];       // For carousel
  liveInsurerCount: number;          // For trust strip
  isLiveDataAvailable: boolean;      // Controls which UI to show

  // UI state (marketing-friendly, no technical details)
  carouselStatus: 'loading' | 'live' | 'populated' | 'fallback';
}

// Carousel status transitions (invisible to user):
// loading → live (first product arrives)
// live → populated (products stabilize)
// any → fallback (on error, silently)
```

#### What Users See vs What Happens

| User Sees | Behind the Scenes |
|-----------|-------------------|
| Skeleton cards animating | Search request being sent |
| "🔴 LIVE" indicator | SSE stream connected |
| Cards appearing one by one | on_search responses arriving |
| Static carousel | Stream complete or error (fallback) |
| "{N} insurers" count | Count of unique BPPs in responses |

### Data Requirements

- FAQ content should be stored in a data file or CMS for easy updates
- Testimonials should support image URLs (for avatars)
- Insurer logos need to be collected and optimized

### Shared Insurers Array

Create a dedicated insurers data file for consistent usage across the homepage (and site-wide):

**File**: `src/data/insurers.ts`

```typescript
export interface Insurer {
  id: string;
  name: string;
  shortName: string;
  logo: string;           // path to logo asset
  categories: ('health' | 'motor')[];
  claimSettlementRatio?: number;
  networkHospitals?: number;
  networkGarages?: number;
  featured: boolean;      // show in marquee/hero
}

export const insurers: Insurer[] = [
  {
    id: 'hdfc-ergo',
    name: 'HDFC Ergo General Insurance',
    shortName: 'HDFC Ergo',
    logo: '/images/insurers/hdfc-ergo.svg',
    categories: ['health', 'motor'],
    claimSettlementRatio: 98,
    networkHospitals: 13000,
    networkGarages: 5200,
    featured: true,
  },
  // ... more insurers
];

// Helper functions
export const getFeaturedInsurers = () => insurers.filter(i => i.featured);
export const getHealthInsurers = () => insurers.filter(i => i.categories.includes('health'));
export const getMotorInsurers = () => insurers.filter(i => i.categories.includes('motor'));
```

**Usage across homepage**:
- **Hero logo marquee**: `getFeaturedInsurers()`
- **Trust indicators**: `insurers.length` for "10+ Insurers" count
- **Footer logo strip**: `getFeaturedInsurers()`
- **Health/Motor pages**: Category-filtered lists

This ensures insurer data stays in sync across all components and pages.

### API Dependencies

- Quote widget requires `/api/quote/health` and `/api/quote/motor` endpoints
- Or initially, form can submit to a simple collection endpoint

### Content Placeholders

For initial development, use:
- Placeholder testimonial avatars
- Sample insurer logos (with permission notes)
- Realistic but clearly marked sample pricing

---

## Open Questions

1. **Quote Form Validation**: Real-time validation or on submit?
2. **Loading States**: Skeleton loaders or spinner for quote results?
3. **Error Handling**: How to handle API failures gracefully?
4. **A/B Testing**: Which elements should we test first?

### Resolved

- **Chat Widget**: Will use [Tawk.to](https://www.tawk.to/) — include on all pages including homepage

---

## Appendix

### Copywriting Variations (for A/B Testing)

**Headline Alternatives**:
1. "Insurance, Unchained." (current)
2. "The Open Insurance Network"
3. "Insurance Without the Middlemen"
4. "Compare. Choose. Save."

**CTA Alternatives**:
1. "Get Instant Quotes" (current)
2. "See Your Options"
3. "Find My Policy"
4. "Compare Prices Now"

---

## Page Preview

A visual representation of the homepage with actual content:

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  ┌─────┐                                                                      ┃
┃  │VAATUN│   Health Insurance ▾   Motor Insurance ▾   Claims   About  [Get Quote]
┃  └─────┘                                                                      ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                               ┃
┃                            ┌──────────────┐                                   ┃
┃                            │ Powered by   │                                   ┃
┃                            │    ONDC      │                                   ┃
┃                            └──────────────┘                                   ┃
┃                                                                               ┃
┃     ██ ███    ██ ███████ ██    ██ ██████   █████  ███    ██  ██████ ███████   ┃
┃     ██ ████   ██ ██      ██    ██ ██   ██ ██   ██ ████   ██ ██      ██        ┃
┃     ██ ██ ██  ██ ███████ ██    ██ ██████  ███████ ██ ██  ██ ██      █████     ┃
┃     ██ ██  ██ ██      ██ ██    ██ ██   ██ ██   ██ ██  ██ ██ ██      ██        ┃
┃     ██ ██   ████ ███████  ██████  ██   ██ ██   ██ ██   ████  ██████ ███████   ┃
┃                                                                               ┃
┃               ██    ██ ███    ██  ██████ ██   ██  █████  ██ ███    ██ ███████ ██████
┃               ██    ██ ████   ██ ██      ██   ██ ██   ██ ██ ████   ██ ██      ██   ██
┃               ██    ██ ██ ██  ██ ██      ███████ ███████ ██ ██ ██  ██ █████   ██   ██
┃               ██    ██ ██  ██ ██ ██      ██   ██ ██   ██ ██ ██  ██ ██ ██      ██   ██
┃                ██████  ██   ████  ██████ ██   ██ ██   ██ ██ ██   ████ ███████ ██████
┃                                                                               ┃
┃        Compare real-time quotes from India's leading insurers on the          ┃
┃        Open Network. No middlemen. No hidden fees. Just the coverage          ┃
┃        you need.                                                              ┃
┃                                                                               ┃
┃        ┌─────────────────────┐  ┌─────────────────────┐                       ┃
┃        │  ⚡ Get Instant     │  │  ↓ See How It Works │                       ┃
┃        │      Quotes         │  │                     │                       ┃
┃        └─────────────────────┘  └─────────────────────┘                       ┃
┃                                                                               ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                               ┃
┃   ┌───────────────────────────────────────────────────────────────────────┐  ┃
┃   │  🔴 LIVE   Insurance products available right now on ONDC             │  ┃
┃   │  ─────────────────────────────────────────────────────────────────── │  ┃
┃   │                                                                       │  ┃
┃   │  ← ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ →    │  ┃
┃   │    │ HDFC Ergo  │ │ Star Health│ │ Bajaj      │ │ ICICI      │       │  ┃
┃   │    │ ────────── │ │ ────────── │ │ ────────── │ │ ────────── │       │  ┃
┃   │    │ Optima     │ │ Family     │ │ Health     │ │ Complete   │       │  ┃
┃   │    │ Secure     │ │ Health     │ │ Guard      │ │ Health     │       │  ┃
┃   │    └────────────┘ └────────────┘ └────────────┘ └────────────┘       │  ┃
┃   │                                                                       │  ┃
┃   │  12 products from 4 insurers                    See all products →   │  ┃
┃   └───────────────────────────────────────────────────────────────────────┘  ┃
┃                                                                               ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                               ┃
┃   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        ┃
┃   │   🏢 4       │ │    ₹0       │ │   🛡️ IRDAI   │ │  Powered by  │        ┃
┃   │   Insurers   │ │ Platform    │ │  Regulated   │ │    ONDC      │        ┃
┃   │  responding  │ │   Fees      │ │   Insurers   │ │              │        ┃
┃   └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘        ┃
┃                                                                               ┃
┃   ←  [HDFC ERGO]  [ICICI Lombard]  [Star Health]  [Bajaj Allianz]  [+more] → ┃
┃                                                                               ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                               ┃
┃   ┌─────────────────────────────────┐  ┌─────────────────────────────────┐   ┃
┃   │                                 │  │                                 │   ┃
┃   │   💚 HEALTH INSURANCE           │  │   🚗 MOTOR INSURANCE            │   ┃
┃   │   ─────────────────────         │  │   ─────────────────────         │   ┃
┃   │   Protect What Matters Most     │  │   Drive With Confidence         │   ┃
┃   │                                 │  │                                 │   ┃
┃   │   From individual coverage to   │  │   Whether it's your car, bike,  │   ┃
┃   │   comprehensive family floaters │  │   or commercial vehicle—get the │   ┃
┃   │   find health insurance that    │  │   best rates from trusted       │   ┃
┃   │   fits your life.               │  │   insurers.                     │   ┃
┃   │                                 │  │                                 │   ┃
┃   │   ✓ Cashless at 10,000+ hosps  │  │   ✓ Instant policy issuance    │   ┃
┃   │   ✓ No waiting for accidents   │  │   ✓ 5,000+ cashless garages    │   ┃
┃   │   ✓ Free annual health checkup │  │   ✓ 24/7 roadside assistance   │   ┃
┃   │   ✓ Coverage ₹3L to ₹1Cr+      │  │   ✓ Zero depreciation options  │   ┃
┃   │                                 │  │                                 │   ┃
┃   │   [Explore Health Plans →]      │  │   [Explore Motor Plans →]       │   ┃
┃   │                                 │  │                                 │   ┃
┃   │   Starting ₹400/month           │  │   Starting ₹2,000/year          │   ┃
┃   │                                 │  │                                 │   ┃
┃   └─────────────────────────────────┘  └─────────────────────────────────┘   ┃
┃                                                                               ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                               ┃
┃                    How Buying Insurance on ONDC Works                         ┃
┃          A transparent, open marketplace where you're always in control       ┃
┃                                                                               ┃
┃   ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐            ┃
┃   │   📋    │      │   🌐    │      │   ⚖️    │      │   ✅    │            ┃
┃   │         │ ───► │         │ ───► │         │ ───► │         │            ┃
┃   │  Tell   │      │   We    │      │ Compare │      │   Get   │            ┃
┃   │   Us    │      │ Search  │      │    &    │      │ Covered │            ┃
┃   │         │      │   the   │      │ Choose  │      │Instantly│            ┃
┃   │         │      │ Network │      │         │      │         │            ┃
┃   └─────────┘      └─────────┘      └─────────┘      └─────────┘            ┃
┃                                                                               ┃
┃   Share basic       Your request     See all offers   Complete purchase      ┃
┃   details—just      goes to all      side-by-side.    digitally. Policy      ┃
┃   the essentials.   insurers on      No hidden fees.  issued immediately.    ┃
┃                     ONDC.                                                     ┃
┃                                                                               ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                               ┃
┃                          The ONDC Advantage                                   ┃
┃       A Government of India initiative transforming how India buys            ┃
┃                                                                               ┃
┃   ┌─────────────────────────────┐  ┌─────────────────────────────┐           ┃
┃   │  🌍 Truly Open Marketplace  │  │  💰 What You See Is What    │           ┃
┃   │                             │  │     You Pay                 │           ┃
┃   │  Unlike closed platforms,   │  │                             │           ┃
┃   │  ONDC connects you directly │  │  No hidden commissions      │           ┃
┃   │  with insurers. No lock-in. │  │  inflating your premium.    │           ┃
┃   └─────────────────────────────┘  └─────────────────────────────┘           ┃
┃   ┌─────────────────────────────┐  ┌─────────────────────────────┐           ┃
┃   │  🔒 Privacy by Design       │  │  🔄 Freedom to Switch       │           ┃
┃   │                             │  │                             │           ┃
┃   │  Your data stays yours.     │  │  Policies on ONDC are       │           ┃
┃   │  Shared only with insurers  │  │  recognized across the      │           ┃
┃   │  you choose.                │  │  network. Renew anywhere.   │           ┃
┃   └─────────────────────────────┘  └─────────────────────────────┘           ┃
┃                                                                               ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                               ┃
┃                      Trusted by Thousands of Indians                          ┃
┃                                                                               ┃
┃   ┌───────────────────────────────────────────────────────────────────────┐  ┃
┃   │                                                                       │  ┃
┃   │  ⭐⭐⭐⭐⭐                                                            │  ┃
┃   │                                                                       │  ┃
┃   │  "I was skeptical about buying insurance online, but Vaatun made it   │  ┃
┃   │   incredibly simple. Got quotes from 6 insurers in seconds and saved  │  ┃
┃   │   ₹4,000 on my car insurance renewal."                                │  ┃
┃   │                                                                       │  ┃
┃   │   👤 Priya S. — Bangalore                                             │  ┃
┃   │      Car Insurance Customer                                           │  ┃
┃   │                                                                       │  ┃
┃   │                          ● ○ ○                                        │  ┃
┃   │                                                                       │  ┃
┃   └───────────────────────────────────────────────────────────────────────┘  ┃
┃                                                                               ┃
┃   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          ┃
┃   │  ⭐ 4.8/5        │  │  📄 50,000+      │  │  🤝 98%          │          ┃
┃   │  Google Rating   │  │  Policies Issued │  │  Claim Support   │          ┃
┃   └──────────────────┘  └──────────────────┘  └──────────────────┘          ┃
┃                                                                               ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                               ┃
┃                            Common Questions                                   ┃
┃                                                                               ┃
┃   ┌───────────────────────────────────────────────────────────────────────┐  ┃
┃   │  ▶ Is buying insurance through ONDC safe?                             │  ┃
┃   ├───────────────────────────────────────────────────────────────────────┤  ┃
┃   │  ▷ Will my policy be valid if I buy through Vaatun?                   │  ┃
┃   ├───────────────────────────────────────────────────────────────────────┤  ┃
┃   │  ▷ How do I file a claim?                                             │  ┃
┃   ├───────────────────────────────────────────────────────────────────────┤  ┃
┃   │  ▷ Why are prices lower on ONDC?                                      │  ┃
┃   ├───────────────────────────────────────────────────────────────────────┤  ┃
┃   │  ▷ What if I need help choosing a policy?                             │  ┃
┃   └───────────────────────────────────────────────────────────────────────┘  ┃
┃                                                                               ┃
┃                            View All FAQs →                                    ┃
┃                                                                               ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                               ┃
┃  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ┃
┃  ░░                                                                      ░░  ┃
┃  ░░           Ready to Find Your Perfect Policy?                         ░░  ┃
┃  ░░                                                                      ░░  ┃
┃  ░░     Join thousands of Indians saving money with transparent,         ░░  ┃
┃  ░░     open-network insurance.                                          ░░  ┃
┃  ░░                                                                      ░░  ┃
┃  ░░        ┌─────────────────────────┐                                   ░░  ┃
┃  ░░        │   Get Your Free Quote   │      Talk to an Expert →          ░░  ┃
┃  ░░        └─────────────────────────┘                                   ░░  ┃
┃  ░░                                                                      ░░  ┃
┃  ░░           No spam. No obligations. Just honest quotes.               ░░  ┃
┃  ░░                                                                      ░░  ┃
┃  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ┃
┃                                                                               ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                               ┃
┃   Insurance           Resources         Company          Support             ┃
┃   ──────────          ─────────         ───────          ───────             ┃
┃   Health Insurance    How It Works      About Vaatun     Help Center         ┃
┃   Motor Insurance     Claims Guide      About ONDC       Contact Us          ┃
┃   Compare Policies    Glossary          Partners         Grievance           ┃
┃   Renew Policy        Blog              Careers                              ┃
┃                                                                               ┃
┃   ─────────────────────────────────────────────────────────────────────────  ┃
┃                                                                               ┃
┃   [HDFC ERGO]  [ICICI]  [Star Health]  [Bajaj]  [Tata AIG]  [New India]     ┃
┃                                                                               ┃
┃   ─────────────────────────────────────────────────────────────────────────  ┃
┃                                                                               ┃
┃   Vaatun is a Technology Service Provider (TSP) registered with ONDC.        ┃
┃   Vaatun does not hold an insurance broking license and operates solely      ┃
┃   as a technology platform connecting users with ONDC network participants.  ┃
┃                                                                               ┃
┃   ⚠️ TESTING PHASE: This portal is currently in testing mode. You cannot     ┃
┃   purchase actual insurance policies through this platform at this time.     ┃
┃                                                                               ┃
┃   ─────────────────────────────────────────────────────────────────────────  ┃
┃                                                                               ┃
┃   Insurance is the subject matter of solicitation. IRDAI does not endorse    ┃
┃   or approve any insurance product.                                          ┃
┃                                                                               ┃
┃   © 2025 Vaatun. All rights reserved.                                        ┃
┃   Privacy Policy  |  Terms of Service  |  Grievance Redressal                ┃
┃                                                                               ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## Approval

- [ ] Product Owner
- [ ] Design Lead
- [ ] Engineering Lead
- [ ] Content/Copy Review
