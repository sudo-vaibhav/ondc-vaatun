# Tech Debt: Hardcoded Configuration Values

**Priority**: High
**Category**: Configuration
**Effort**: Medium

## Problem

Several business-critical values are hardcoded in the codebase, preventing multi-tenant usage and requiring code changes for configuration updates.

## Affected Files

### 1. Company Details in Tenant (`src/entities/tenant.ts:43-58`)

```typescript
// Hardcoded Vaatun company details
gst_no: "06AAKCV8973E1ZT",
email_id: "vaibhav@vaatun.com",
pan_no: "AAKCV8973E",
name_of_authorised_signatory: "Vaibhav Sharma",
address_of_authorised_signatory: "Gurgaon",
name: "Vaatun Technologies Private Limited",
address: "E-91, Kamla Nagar, South Delhi, Delhi, 110007",
```

**Impact**: Cannot onboard different organizations without code changes.

### 2. Financial Terms in Search Payload (`src/app/api/ondc/search/payload.ts:35-82`)

```typescript
// Hardcoded financial terms
{
  code: "BUYER_FINDER_FEES_TYPE",
  value: "percent"
},
{
  code: "BUYER_FINDER_FEES_PERCENTAGE",
  value: "1"  // Fixed 1% - not configurable
},
{
  code: "SETTLEMENT_WINDOW",
  value: "PT60M"  // Fixed 60 minutes
},
{
  code: "SETTLEMENT_BASIS",
  value: "Collection"
},
{
  code: "MANDATORY_ARBITRATION",
  value: "true"
},
{
  code: "STATIC_TERMS",
  value: "https://www.vaatun.com/static-terms"  // Hardcoded URL
}
```

**Impact**: Cannot adjust fees, settlement terms, or legal terms per merchant/category.

### 3. Domain Configuration

Various URLs and domains scattered across files instead of centralized configuration.

## Proposed Solution

### 1. Create Tenant Configuration Schema

```typescript
// src/entities/tenant-config.ts
const TenantConfigSchema = z.object({
  organization: z.object({
    name: z.string(),
    gst_no: z.string(),
    pan_no: z.string(),
    email: z.string().email(),
    address: z.string(),
    authorizedSignatory: z.object({
      name: z.string(),
      address: z.string(),
    }),
  }),
  financial: z.object({
    buyerFinderFees: z.object({
      type: z.enum(["percent", "amount"]),
      value: z.string(),
    }),
    settlementWindow: z.string(), // ISO 8601 duration
    settlementBasis: z.enum(["Collection", "Delivery", "Return"]),
    mandatoryArbitration: z.boolean(),
    staticTermsUrl: z.string().url(),
  }),
});
```

### 2. Environment-Based Configuration

```env
# .env
TENANT_CONFIG_PATH=/config/tenant.json
# OR inline JSON
TENANT_CONFIG='{"organization":{"name":"..."},...}'
```

### 3. Per-Category Overrides

```typescript
// Different terms for different product categories
const categoryConfig = {
  "ONDC:FIS13": {  // Insurance
    buyerFinderFees: { type: "percent", value: "2" },
    settlementWindow: "P7D",
  },
  "ONDC:RET10": {  // Retail
    buyerFinderFees: { type: "percent", value: "1" },
    settlementWindow: "PT60M",
  },
};
```

## Migration Steps

1. Create `TenantConfig` schema and loader
2. Add environment variable for config path/JSON
3. Update `Tenant` class to use config
4. Update payload builders to use config
5. Add `.env.example` entries
6. Document configuration options

## Acceptance Criteria

- [ ] All company details configurable via environment/file
- [ ] All financial terms configurable
- [ ] Per-category configuration support
- [ ] Validation of configuration on startup
- [ ] Documentation of all configuration options
- [ ] No hardcoded business values in source code
