/**
 * Type Definitions for Search Store
 * Matches the server-side types for ONDC search results
 */

export interface OnSearchContext {
  domain: string;
  action: string;
  bap_id: string;
  bap_uri: string;
  bpp_id?: string;
  bpp_uri?: string;
  transaction_id: string;
  message_id: string;
  timestamp: string;
  ttl: string;
  version?: string;
  location?: {
    country?: { code: string };
    city?: { code: string };
  };
}

export interface CatalogProvider {
  id: string;
  descriptor?: {
    name?: string;
    short_desc?: string;
    long_desc?: string;
    images?: Array<{ url: string; size_type?: string }>;
  };
  categories?: Array<{
    id: string;
    descriptor?: { name?: string; code?: string };
  }>;
  items?: Array<{
    id: string;
    parent_item_id?: string;
    descriptor?: {
      name?: string;
      short_desc?: string;
      long_desc?: string;
      images?: Array<{ url: string; size_type?: string }>;
    };
    category_ids?: string[];
    tags?: Array<{
      descriptor?: { name?: string; code?: string };
      list?: Array<{
        descriptor?: { name?: string; code?: string };
        value?: string;
        display?: boolean;
      }>;
    }>;
    xinput?: {
      form?: {
        id?: string;
        url?: string;
        mime_type?: string;
      };
      required?: boolean;
    };
    time?: {
      label?: string;
      duration?: string;
    };
    add_ons?: Array<{
      id: string;
      descriptor?: { name?: string; code?: string };
      price?: { currency?: string; value?: string };
    }>;
  }>;
  payments?: Array<{
    collected_by?: string;
    tags?: Array<unknown>;
  }>;
}

export interface OnSearchResponse {
  context: OnSearchContext;
  message?: {
    catalog?: {
      descriptor?: {
        name?: string;
        short_desc?: string;
        long_desc?: string;
        images?: Array<{ url: string; size_type?: string }>;
      };
      providers?: CatalogProvider[];
    };
  };
  error?: {
    code?: string;
    message?: string;
  };
}

export interface SearchResultsResponse {
  found: boolean;
  transactionId: string;
  responseCount: number;
  isComplete: boolean;
  ttlExpiresAt?: number;
  responses: OnSearchResponse[];
}
