
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { z } from "zod";

// ============================================
// Zod Schemas - Source of Truth for Types
// ============================================

/**
 * Schema for POST /api/ondc/search response
 */
const SearchInitResponseSchema = z.object({
  transactionId: z.uuid(),
  messageId: z.uuid(),
  message: z
    .object({
      ack: z.object({ status: z.string() }),
    })
    .optional(),
});

/**
 * Schema for image in Beckn descriptor
 */
const ImageSchema = z.object({
  url: z.string().optional(),
  size_type: z.string().optional(),
});

/**
 * Schema for catalog provider in on_search response
 */
const CatalogProviderSchema = z.object({
  id: z.string(),
  descriptor: z
    .object({
      name: z.string().optional(),
      short_desc: z.string().optional(),
      long_desc: z.string().optional(),
      images: z.array(ImageSchema).optional(),
    })
    .optional(),
  items: z
    .array(
      z.object({
        id: z.string(),
        descriptor: z
          .object({
            name: z.string().optional(),
            short_desc: z.string().optional(),
          })
          .optional(),
        category_ids: z.array(z.string()).optional(),
      }),
    )
    .optional(),
});

/**
 * Schema for individual on_search response
 */
const OnSearchResponseSchema = z.object({
  context: z.object({
    bpp_id: z.string().optional(),
    bpp_uri: z.string().optional(),
    transaction_id: z.uuid().optional(),
    message_id: z.uuid().optional(),
  }),
  message: z
    .object({
      catalog: z
        .object({
          descriptor: z
            .object({
              name: z.string().optional(),
            })
            .optional(),
          providers: z.array(CatalogProviderSchema).optional(),
        })
        .optional(),
    })
    .optional(),
  error: z
    .object({
      code: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
});

/**
 * Schema for SSE stream data (search results)
 */
const SearchResultsDataSchema = z.object({
  found: z.boolean().optional(),
  transactionId: z.uuid(),
  responseCount: z.number(),
  isComplete: z.boolean().optional(),
  responses: z.array(OnSearchResponseSchema),
});

// Infer types from Zod schemas - no manual type definitions needed
type SearchInitResponse = z.infer<typeof SearchInitResponseSchema>;
type OnSearchResponse = z.infer<typeof OnSearchResponseSchema>;
type SearchResultsData = z.infer<typeof SearchResultsDataSchema>;

// ============================================
// Exported Types (for consumers)
// ============================================

export interface LiveInsurer {
  id: string;
  name: string;
  bppId: string;
  logoUrl?: string;
}

export interface LiveProduct {
  id: string;
  insurerName: string;
  productName: string;
  category: string;
  bppId: string;
  providerId: string;
  itemId: string;
}

type SearchStatus = "idle" | "connecting" | "streaming" | "complete" | "error";

interface LiveSearchContextValue {
  status: SearchStatus;
  insurers: LiveInsurer[];
  products: LiveProduct[];
  insurerCount: number;
  productCount: number;
  isLive: boolean;
}

// ============================================
// Context
// ============================================

const LiveSearchContext = createContext<LiveSearchContextValue | null>(null);

/**
 * Hook to access live search data from context.
 * Returns safe defaults if used outside provider.
 */
export function useLiveSearch(): LiveSearchContextValue {
  const ctx = useContext(LiveSearchContext);
  if (!ctx) {
    return {
      status: "idle",
      insurers: [],
      products: [],
      insurerCount: 0,
      productCount: 0,
      isLive: false,
    };
  }
  return ctx;
}

// ============================================
// Validation Functions (no type casts)
// ============================================

/**
 * Parse and validate JSON string as search init response
 */
function parseSearchInitResponse(json: unknown): SearchInitResponse | null {
  const result = SearchInitResponseSchema.safeParse(json);
  if (!result.success) {
    console.warn(
      "[LiveSearch] Invalid search init response:",
      result.error.issues,
    );
    return null;
  }
  return result.data;
}

/**
 * Parse and validate JSON string as search results data
 */
function parseSearchResultsData(jsonString: string): SearchResultsData | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    console.warn("[LiveSearch] Failed to parse JSON");
    return null;
  }

  const result = SearchResultsDataSchema.safeParse(parsed);
  if (!result.success) {
    console.warn(
      "[LiveSearch] Invalid search results data:",
      result.error.issues,
    );
    return null;
  }
  return result.data;
}

/**
 * Extract insurers and products from a validated OnSearchResponse
 */
function extractDataFromResponse(response: OnSearchResponse): {
  insurers: LiveInsurer[];
  products: LiveProduct[];
} {
  const bppId = response.context.bpp_id ?? "";
  const catalog = response.message?.catalog;
  const bppName = catalog?.descriptor?.name;
  const providers = catalog?.providers ?? [];

  const insurers: LiveInsurer[] = [];
  const products: LiveProduct[] = [];

  for (const provider of providers) {
    const insurerName =
      provider.descriptor?.name ?? bppName ?? "Unknown Insurer";
    const insurerId = `${bppId}-${provider.id}`;
    const logoUrl = provider.descriptor?.images?.[0]?.url;

    insurers.push({ id: insurerId, name: insurerName, bppId, logoUrl });

    for (const item of provider.items ?? []) {
      products.push({
        id: `${bppId}-${provider.id}-${item.id}`,
        insurerName,
        productName: item.descriptor?.name ?? "Insurance Plan",
        category: item.category_ids?.[0] ?? "health",
        bppId,
        providerId: provider.id,
        itemId: item.id,
      });
    }
  }

  return { insurers, products };
}

// ============================================
// Provider Component
// ============================================

interface LiveSearchProviderProps {
  children: ReactNode;
}

/**
 * Provider that initiates background search and shares data with children.
 * Uses SSE to stream real-time updates from the ONDC network.
 */
export function LiveSearchProvider({ children }: LiveSearchProviderProps) {
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [insurers, setInsurers] = useState<LiveInsurer[]>([]);
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const statusRef = useRef<SearchStatus>("idle");

  // Keep ref in sync for use in event handlers
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  /**
   * Process validated search results data
   */
  const processResults = useCallback((data: SearchResultsData) => {
    const allInsurers: LiveInsurer[] = [];
    const allProducts: LiveProduct[] = [];
    const seenInsurerIds = new Set<string>();

    for (const response of data.responses) {
      const { insurers: newInsurers, products: newProducts } =
        extractDataFromResponse(response);

      for (const insurer of newInsurers) {
        if (!seenInsurerIds.has(insurer.id)) {
          seenInsurerIds.add(insurer.id);
          allInsurers.push(insurer);
        }
      }
      allProducts.push(...newProducts);
    }

    setInsurers(allInsurers);
    setProducts(allProducts);
  }, []);

  /**
   * Handle SSE event data with validation
   */
  const handleSSEData = useCallback(
    (eventData: string) => {
      const validated = parseSearchResultsData(eventData);
      if (validated) {
        processResults(validated);
      }
    },
    [processResults],
  );

  // Initiate search on mount
  useEffect(() => {
    let cancelled = false;

    const initiateSearch = async () => {
      setStatus("connecting");

      try {
        // Step 1: Initiate search
        const response = await fetch("/api/ondc/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        if (cancelled) return;

        if (!response.ok) {
          console.warn("[LiveSearch] Search request failed:", response.status);
          setStatus("error");
          return;
        }

        const rawData: unknown = await response.json();
        const searchInit = parseSearchInitResponse(rawData);

        if (!searchInit) {
          setStatus("error");
          return;
        }

        const { transactionId } = searchInit;
        setStatus("streaming");

        // Step 2: Connect to SSE stream
        const eventSource = new EventSource(
          `/api/ondc/search-stream/${transactionId}`,
        );
        eventSourceRef.current = eventSource;

        eventSource.addEventListener("initial", (event) => {
          if (cancelled) return;
          handleSSEData(event.data);
        });

        eventSource.addEventListener("update", (event) => {
          if (cancelled) return;
          handleSSEData(event.data);
        });

        eventSource.addEventListener("complete", (event) => {
          if (cancelled) return;
          handleSSEData(event.data);
          setStatus("complete");
          eventSource.close();
        });

        eventSource.addEventListener("error", () => {
          if (cancelled) return;
          setStatus("error");
          eventSource.close();
        });

        eventSource.onerror = () => {
          if (
            eventSource.readyState === EventSource.CLOSED &&
            statusRef.current !== "complete"
          ) {
            setStatus("error");
          }
        };
      } catch (err) {
        console.error("[LiveSearch] Error initiating search:", err);
        if (!cancelled) setStatus("error");
      }
    };

    initiateSearch();

    return () => {
      cancelled = true;
      eventSourceRef.current?.close();
    };
  }, [handleSSEData]);

  const value: LiveSearchContextValue = {
    status,
    insurers,
    products,
    insurerCount: insurers.length,
    productCount: products.length,
    isLive: status === "streaming",
  };

  return (
    <LiveSearchContext.Provider value={value}>
      {children}
    </LiveSearchContext.Provider>
  );
}
