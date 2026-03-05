/**
 * Centralized ONDC Zod schemas for FIS13 Health Insurance
 *
 * Schema conventions:
 * - Response schemas: Use z.looseObject() to allow additional fields from external APIs
 * - Request schemas: Use z.object() for strict validation of outgoing requests
 *
 * Source: ONDC-Official/ONDC-FIS-Specifications @ draft-FIS13-health-2.0.0
 */

import { z } from "zod";

// ============================================================================
// Base Schemas (Reusable Components)
// ============================================================================

/**
 * Descriptor - Name and descriptions for entities
 */
export const DescriptorSchema = z.looseObject({
  name: z.string().optional(),
  code: z.string().optional(),
  short_desc: z.string().optional(),
  long_desc: z.string().optional(),
  images: z.array(z.looseObject({ url: z.string().optional() })).optional(),
});

/**
 * Price - Currency and value
 */
export const PriceSchema = z.looseObject({
  currency: z.string().optional(),
  value: z.string().optional(),
});

/**
 * ONDC Context - Standard context object across all ONDC messages
 */
export const ONDCContextSchema = z.looseObject({
  domain: z.string().optional(),
  action: z.string().optional(),
  bap_id: z.string().optional(),
  bap_uri: z.string().optional(),
  bpp_id: z.string().optional(),
  bpp_uri: z.string().optional(),
  transaction_id: z.string().optional(),
  message_id: z.string().optional(),
  timestamp: z.string().optional(),
  ttl: z.string().optional(),
  version: z.string().optional(),
  location: z
    .looseObject({
      country: z.looseObject({ code: z.string().optional() }).optional(),
      city: z.looseObject({ code: z.string().optional() }).optional(),
    })
    .optional(),
});

/**
 * ONDC Error - Standard error object
 */
export const ONDCErrorSchema = z.looseObject({
  type: z.string().optional(),
  code: z.string().optional(),
  message: z.string().optional(),
  path: z.string().optional(),
});

/**
 * Quote Breakup Item
 */
export const QuoteBreakupItemSchema = z.looseObject({
  title: z.string().optional(),
  price: PriceSchema.optional(),
  item: z.looseObject({ id: z.string().optional() }).optional(),
});

/**
 * Quote - Pricing information with breakup
 */
export const ONDCQuoteSchema = z.looseObject({
  id: z.string().optional(),
  price: PriceSchema.optional(),
  breakup: z.array(QuoteBreakupItemSchema).optional(),
  ttl: z.string().optional(),
});

/**
 * XInput Form - Form metadata for xinput forms
 */
export const XInputFormSchema = z.looseObject({
  id: z.string().optional(),
  mime_type: z.string().optional(),
  url: z.string().optional(),
  resubmit: z.boolean().optional(),
  multiple_sumbissions: z.boolean().optional(),
});

/**
 * XInput Head - Form navigation metadata
 */
export const XInputHeadSchema = z.looseObject({
  descriptor: DescriptorSchema.optional(),
  index: z
    .looseObject({
      min: z.number().optional(),
      cur: z.number().optional(),
      max: z.number().optional(),
    })
    .optional(),
  headings: z.array(z.string()).optional(),
});

/**
 * XInput - Form input specification
 */
export const XInputSchema = z.looseObject({
  head: XInputHeadSchema.optional(),
  form: XInputFormSchema.optional(),
  required: z.boolean().optional(),
});

/**
 * Provider - Insurance provider entity
 */
export const ProviderSchema = z.looseObject({
  id: z.string().optional(),
  descriptor: DescriptorSchema.optional(),
});

/**
 * Add-on - Optional policy add-ons
 */
export const AddOnSchema = z.looseObject({
  id: z.string().optional(),
  descriptor: DescriptorSchema.optional(),
  quantity: z
    .looseObject({
      selected: z.looseObject({ count: z.number().optional() }).optional(),
    })
    .optional(),
  price: PriceSchema.optional(),
});

/**
 * Item Tag - Policy metadata tags
 */
export const ItemTagSchema = z.looseObject({
  descriptor: DescriptorSchema.optional(),
  list: z
    .array(
      z.looseObject({
        descriptor: DescriptorSchema.optional(),
        value: z.string().optional(),
      }),
    )
    .optional(),
  display: z.boolean().optional(),
});

/**
 * Item Time - Duration/tenure information
 */
export const ItemTimeSchema = z.looseObject({
  duration: z.string().optional(),
  label: z.string().optional(),
});

/**
 * Item - Insurance product/policy item
 */
export const ItemSchema = z.looseObject({
  id: z.string().optional(),
  parent_item_id: z.string().optional(),
  category_ids: z.array(z.string()).optional(),
  descriptor: DescriptorSchema.optional(),
  tags: z.array(ItemTagSchema).optional(),
  time: ItemTimeSchema.optional(),
  xinput: XInputSchema.optional(),
  add_ons: z.array(AddOnSchema).optional(),
  price: PriceSchema.optional(),
});

/**
 * Customer Contact
 */
export const CustomerContactSchema = z.looseObject({
  email: z.string().optional(),
  phone: z.string().optional(),
});

/**
 * Customer Person
 */
export const CustomerPersonSchema = z.looseObject({
  name: z.string().optional(),
});

/**
 * Customer - Buyer/customer information
 */
export const CustomerSchema = z.looseObject({
  person: CustomerPersonSchema.optional(),
  contact: CustomerContactSchema.optional(),
});

/**
 * Fulfillment - Policy fulfillment details
 */
export const FulfillmentSchema = z.looseObject({
  id: z.string().optional(),
  type: z.string().optional(),
  customer: CustomerSchema.optional(),
  state: z
    .looseObject({
      descriptor: DescriptorSchema.optional(),
    })
    .optional(),
});

/**
 * Payment Parameters
 */
export const PaymentParamsSchema = z.looseObject({
  amount: z.string().optional(),
  currency: z.string().optional(),
  source_bank_code: z.string().optional(),
  source_bank_account_number: z.string().optional(),
});

/**
 * Payment - Payment information
 */
export const PaymentSchema = z.looseObject({
  id: z.string().optional(),
  collected_by: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  params: PaymentParamsSchema.optional(),
  url: z.string().optional(),
});

/**
 * Document - Policy documents
 */
export const DocumentSchema = z.looseObject({
  descriptor: DescriptorSchema.optional(),
  url: z.string().optional(),
  mime_type: z.string().optional(),
});

/**
 * Order - Complete order/policy object
 */
export const OrderSchema = z.looseObject({
  id: z.string().optional(),
  provider: ProviderSchema.optional(),
  items: z.array(ItemSchema).optional(),
  quote: ONDCQuoteSchema.optional(),
  fulfillments: z.array(FulfillmentSchema).optional(),
  payments: z.array(PaymentSchema).optional(),
  status: z.string().optional(),
  documents: z.array(DocumentSchema).optional(),
});

// ============================================================================
// Response Schemas (Loose - Allow Extra Fields from BPPs)
// ============================================================================

/**
 * on_search Response - Catalog of insurance policies
 */
export const OnSearchResponseSchema = z.looseObject({
  context: ONDCContextSchema.optional(),
  message: z
    .looseObject({
      catalog: z
        .looseObject({
          descriptor: DescriptorSchema.optional(),
          providers: z.array(ProviderSchema).optional(),
        })
        .optional(),
    })
    .optional(),
  error: ONDCErrorSchema.optional(),
});

/**
 * on_select Response - Selected policy with quote and xinput form
 */
export const OnSelectResponseSchema = z.looseObject({
  context: ONDCContextSchema.optional(),
  message: z
    .looseObject({
      order: OrderSchema.optional(),
    })
    .optional(),
  error: ONDCErrorSchema.optional(),
});

/**
 * on_init Response - Init confirmation with payment URL
 */
export const OnInitResponseSchema = z.looseObject({
  context: ONDCContextSchema.optional(),
  message: z
    .looseObject({
      order: OrderSchema.optional(),
    })
    .optional(),
  error: ONDCErrorSchema.optional(),
});

/**
 * on_confirm Response - Policy confirmation with order ID
 */
export const OnConfirmResponseSchema = z.looseObject({
  context: ONDCContextSchema.optional(),
  message: z
    .looseObject({
      order: OrderSchema.optional(),
    })
    .optional(),
  error: ONDCErrorSchema.optional(),
});

/**
 * on_status Response - Policy status with documents
 */
export const OnStatusResponseSchema = z.looseObject({
  context: ONDCContextSchema.optional(),
  message: z
    .looseObject({
      order: OrderSchema.optional(),
    })
    .optional(),
  error: ONDCErrorSchema.optional(),
});

// ============================================================================
// Request Schemas (Strict - Control What We Send)
// ============================================================================

/**
 * Search Request Input
 */
export const SearchRequestSchema = z.object({
  categoryCode: z.string().optional(),
});

/**
 * Select Request Input
 */
export const SelectRequestSchema = z.object({
  transactionId: z.string().uuid(),
  bppId: z.string(),
  bppUri: z.string().url(),
  providerId: z.string(),
  itemId: z.string(),
  parentItemId: z.string(),
  xinputFormId: z.string().optional(),
  xinputSubmissionId: z.string().optional(),
  addOns: z
    .array(
      z.object({
        id: z.string(),
        quantity: z.number().int().positive(),
      }),
    )
    .optional(),
});

/**
 * Init Request Input
 */
export const InitRequestSchema = z.object({
  transactionId: z.string().uuid(),
  bppId: z.string(),
  bppUri: z.string().url(),
  providerId: z.string(),
  itemId: z.string(),
  parentItemId: z.string(),
  xinputFormId: z.string(),
  submissionId: z.string(),
  addOns: z
    .array(
      z.object({
        id: z.string(),
        quantity: z.number().int().positive(),
      }),
    )
    .optional(),
  customerName: z.string(),
  customerEmail: z.string().email(),
  customerPhone: z.string(),
  amount: z.string(),
});

/**
 * Confirm Request Input
 */
export const ConfirmRequestSchema = z.object({
  transactionId: z.string().uuid(),
  messageId: z.string().uuid().optional(),
  bppId: z.string(),
  bppUri: z.string().url(),
  providerId: z.string(),
  itemId: z.string(),
  parentItemId: z.string(),
  xinputFormId: z.string(),
  submissionId: z.string(),
  addOns: z
    .array(
      z.object({
        id: z.string(),
        quantity: z.number().int().positive(),
      }),
    )
    .optional(),
  customerName: z.string(),
  customerEmail: z.string().email(),
  customerPhone: z.string(),
  quoteId: z.string(),
  amount: z.string(),
  quoteBreakup: z
    .array(
      z.object({
        title: z.string(),
        price: z.object({
          currency: z.string(),
          value: z.string(),
        }),
      }),
    )
    .optional(),
});

/**
 * Status Request Input
 */
export const StatusRequestSchema = z.object({
  transactionId: z.string().uuid(),
  orderId: z.string(),
  bppId: z.string(),
  bppUri: z.string().url(),
});

// ============================================================================
// Inferred TypeScript Types
// ============================================================================

export type ONDCContext = z.infer<typeof ONDCContextSchema>;
export type ONDCError = z.infer<typeof ONDCErrorSchema>;
export type ONDCQuote = z.infer<typeof ONDCQuoteSchema>;
export type Descriptor = z.infer<typeof DescriptorSchema>;
export type Price = z.infer<typeof PriceSchema>;
export type XInput = z.infer<typeof XInputSchema>;
export type Provider = z.infer<typeof ProviderSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type AddOn = z.infer<typeof AddOnSchema>;
export type Customer = z.infer<typeof CustomerSchema>;
export type Fulfillment = z.infer<typeof FulfillmentSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type Order = z.infer<typeof OrderSchema>;

export type OnSearchResponse = z.infer<typeof OnSearchResponseSchema>;
export type OnSelectResponse = z.infer<typeof OnSelectResponseSchema>;
export type OnInitResponse = z.infer<typeof OnInitResponseSchema>;
export type OnConfirmResponse = z.infer<typeof OnConfirmResponseSchema>;
export type OnStatusResponse = z.infer<typeof OnStatusResponseSchema>;

export type SearchRequest = z.infer<typeof SearchRequestSchema>;
export type SelectRequest = z.infer<typeof SelectRequestSchema>;
export type InitRequest = z.infer<typeof InitRequestSchema>;
export type ConfirmRequest = z.infer<typeof ConfirmRequestSchema>;
export type StatusRequest = z.infer<typeof StatusRequestSchema>;
