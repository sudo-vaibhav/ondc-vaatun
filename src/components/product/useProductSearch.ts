"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  OnSearchResponse,
  SearchResultsResponse,
} from "@/lib/search-store";

export type SearchStatus = "connecting" | "streaming" | "complete" | "error";

export interface ProductSearchState {
  status: SearchStatus;
  responses: OnSearchResponse[];
  responseCount: number;
  isComplete: boolean;
  ttlExpiresAt: number | null;
  error: string | null;
}

interface UseProductSearchOptions {
  transactionId: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

const INITIAL_STATE: ProductSearchState = {
  status: "connecting",
  responses: [],
  responseCount: 0,
  isComplete: false,
  ttlExpiresAt: null,
  error: null,
};

/**
 * Hook for connecting to SSE stream and receiving product search results
 */
export function useProductSearch({
  transactionId,
  onComplete,
  onError,
}: UseProductSearchOptions): ProductSearchState & { reconnect: () => void } {
  const [state, setState] = useState<ProductSearchState>(INITIAL_STATE);
  const eventSourceRef = useRef<EventSource | null>(null);
  const statusRef = useRef<SearchStatus>("connecting");

  // Keep ref in sync for use in event handlers
  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  const processSSEData = useCallback((data: SearchResultsResponse) => {
    setState((prev) => ({
      ...prev,
      responses: data.responses || [],
      responseCount: data.responseCount || 0,
      ttlExpiresAt: data.ttlExpiresAt || null,
      isComplete: data.isComplete || false,
    }));
  }, []);

  const connect = useCallback(() => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setState({ ...INITIAL_STATE, status: "connecting" });

    const eventSource = new EventSource(
      `/api/ondc/search-stream/${transactionId}`,
    );
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("connected", () => {
      setState((prev) => ({ ...prev, status: "streaming" }));
    });

    eventSource.addEventListener("initial", (event) => {
      try {
        const data = JSON.parse(event.data) as SearchResultsResponse;
        setState((prev) => ({ ...prev, status: "streaming" }));
        processSSEData(data);
      } catch (err) {
        console.warn("[useProductSearch] Failed to parse initial data:", err);
      }
    });

    eventSource.addEventListener("update", (event) => {
      try {
        const data = JSON.parse(event.data) as SearchResultsResponse;
        processSSEData(data);
      } catch (err) {
        console.warn("[useProductSearch] Failed to parse update data:", err);
      }
    });

    eventSource.addEventListener("complete", (event) => {
      try {
        const data = JSON.parse(event.data) as SearchResultsResponse;
        processSSEData(data);
        setState((prev) => ({ ...prev, status: "complete", isComplete: true }));
        onComplete?.();
        eventSource.close();
      } catch (err) {
        console.warn("[useProductSearch] Failed to parse complete data:", err);
      }
    });

    eventSource.addEventListener("error", (event) => {
      let errorMessage = "Connection error";
      try {
        if (event instanceof MessageEvent && event.data) {
          const data = JSON.parse(event.data);
          errorMessage = data.message || errorMessage;
        }
      } catch {
        // Ignore parse errors
      }
      setState((prev) => ({
        ...prev,
        status: "error",
        error: errorMessage,
      }));
      onError?.(errorMessage);
      eventSource.close();
    });

    eventSource.onerror = () => {
      if (
        eventSource.readyState === EventSource.CLOSED &&
        statusRef.current !== "complete"
      ) {
        setState((prev) => ({
          ...prev,
          status: "error",
          error: "Connection closed unexpectedly",
        }));
        onError?.("Connection closed unexpectedly");
      }
    };
  }, [transactionId, processSSEData, onComplete, onError]);

  // Connect on mount
  useEffect(() => {
    connect();

    return () => {
      eventSourceRef.current?.close();
    };
  }, [connect]);

  return {
    ...state,
    reconnect: connect,
  };
}
