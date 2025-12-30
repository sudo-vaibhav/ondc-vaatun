"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Radio,
  Search,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SelectionData } from "@/components/search/ItemCard";
import ProviderCard from "@/components/search/ProviderCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { OnSearchResponse } from "@/lib/search-store";

interface SearchResultsData {
  found: boolean;
  transactionId: string;
  messageId?: string;
  searchTimestamp?: string;
  categoryCode?: string;
  responseCount: number;
  isComplete: boolean;
  ttlExpiresAt: number;
  providers: Array<{
    bppId: string;
    bppUri?: string;
    name?: string;
    itemCount: number;
    hasError: boolean;
  }>;
  responses: OnSearchResponse[];
}

type ConnectionStatus = "connecting" | "connected" | "complete" | "error";

export default function StreamedSearchResultsPage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = params.transactionId as string;

  const [data, setData] = useState<SearchResultsData | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [selectingItemId, setSelectingItemId] = useState<string | null>(null);
  const [, setTick] = useState(0); // Force re-render for timer updates
  const eventSourceRef = useRef<EventSource | null>(null);

  // Track connection status in ref for use in onerror callback
  const connectionStatusRef = useRef<ConnectionStatus>("connecting");
  useEffect(() => {
    connectionStatusRef.current = connectionStatus;
  }, [connectionStatus]);

  // Timer to update elapsed/remaining time display
  useEffect(() => {
    if (connectionStatus === "complete" || connectionStatus === "error") {
      return;
    }
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [connectionStatus]);

  // Connect to SSE stream
  useEffect(() => {
    const eventSource = new EventSource(
      `/api/ondc/search-stream/${transactionId}`,
    );
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("connected", () => {
      console.log("[SSE] Connected");
      setConnectionStatus("connected");
    });

    eventSource.addEventListener("initial", (event) => {
      console.log("[SSE] Initial data received");
      const eventData = JSON.parse(event.data);
      setData(eventData);
    });

    eventSource.addEventListener("update", (event) => {
      console.log("[SSE] Update received");
      const eventData = JSON.parse(event.data);
      setData(eventData);
    });

    eventSource.addEventListener("complete", (event) => {
      console.log("[SSE] Complete");
      const eventData = JSON.parse(event.data);
      setConnectionStatus("complete");
      // Update data one last time if needed
      if (eventData.responseCount !== undefined) {
        setData((prev) => (prev ? { ...prev, isComplete: true } : prev));
      }
      eventSource.close();
    });

    eventSource.addEventListener("error", (event) => {
      console.error("[SSE] Error event:", event);
      // Check if it's a custom error event with data
      if (event instanceof MessageEvent && event.data) {
        try {
          const errorData = JSON.parse(event.data);
          setError(errorData.message || "Stream error");
        } catch {
          setError("Connection lost");
        }
      } else {
        setError("Connection lost");
      }
      setConnectionStatus("error");
      eventSource.close();
    });

    // Handle native EventSource errors
    eventSource.onerror = () => {
      if (eventSource.readyState === EventSource.CLOSED) {
        if (connectionStatusRef.current !== "complete") {
          setConnectionStatus("error");
          setError("Connection closed unexpectedly");
        }
      }
    };

    return () => {
      eventSource.close();
    };
  }, [transactionId]);

  const getElapsedTime = () => {
    if (!data?.searchTimestamp) return null;
    const elapsed = Math.floor(
      (Date.now() - new Date(data.searchTimestamp).getTime()) / 1000,
    );
    if (elapsed < 60) return `${elapsed}s ago`;
    return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s ago`;
  };

  const getTimeRemaining = () => {
    if (!data?.ttlExpiresAt) return null;
    const remaining = Math.max(
      0,
      Math.floor((data.ttlExpiresAt - Date.now()) / 1000),
    );
    if (remaining === 0) return "Complete";
    if (remaining < 60) return `${remaining}s remaining`;
    return `${Math.floor(remaining / 60)}m ${remaining % 60}s remaining`;
  };

  // Handle item selection - call /select API and navigate to quote page
  const handleItemSelect = async (selectionData: SelectionData) => {
    setSelectingItemId(selectionData.itemId);

    try {
      const response = await fetch("/api/ondc/select", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionId,
          bppId: selectionData.bppId,
          bppUri: selectionData.bppUri,
          providerId: selectionData.providerId,
          itemId: selectionData.itemId,
          parentItemId: selectionData.parentItemId,
        }),
      });

      const result = await response.json();
      console.log("[StreamedSearchResults] Select response:", result);

      if (response.ok && result.messageId) {
        // Navigate to quote page with transaction_id and message_id
        router.push(`/quote/${transactionId}/${result.messageId}`);
      } else {
        throw new Error(result.error || "Failed to select item");
      }
    } catch (err) {
      console.error("[StreamedSearchResults] Select error:", err);
      alert(err instanceof Error ? err.message : "Failed to get quote");
    } finally {
      setSelectingItemId(null);
    }
  };

  const reconnect = useCallback(() => {
    setConnectionStatus("connecting");
    setError(null);
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    // Create new connection
    const eventSource = new EventSource(
      `/api/ondc/search-stream/${transactionId}`,
    );
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("connected", () => {
      setConnectionStatus("connected");
    });

    eventSource.addEventListener("initial", (event) => {
      const eventData = JSON.parse(event.data);
      setData(eventData);
    });

    eventSource.addEventListener("update", (event) => {
      const eventData = JSON.parse(event.data);
      setData(eventData);
    });

    eventSource.addEventListener("complete", () => {
      setConnectionStatus("complete");
      eventSource.close();
    });

    eventSource.onerror = () => {
      if (eventSource.readyState === EventSource.CLOSED) {
        setConnectionStatus("error");
        setError("Connection closed unexpectedly");
      }
    };
  }, [transactionId]);

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case "connecting":
        return (
          <Badge
            variant="secondary"
            className="border-2 border-foreground animate-pulse"
          >
            <Wifi className="h-3 w-3 mr-1" />
            Connecting...
          </Badge>
        );
      case "connected":
        return (
          <Badge variant="default" className="border-2 border-foreground">
            <Radio className="h-3 w-3 mr-1 animate-pulse" />
            Live
          </Badge>
        );
      case "complete":
        return (
          <Badge variant="secondary" className="border-2 border-foreground">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Complete
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="border-2 border-foreground">
            <WifiOff className="h-3 w-3 mr-1" />
            Disconnected
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-2 border-foreground bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/")}
                className="border-2 border-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Radio className="h-5 w-5" />
                  Live Search Results
                </h1>
                <p className="text-xs text-muted-foreground font-mono">
                  {transactionId}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {getStatusBadge()}
              {connectionStatus === "error" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reconnect}
                  className="border-2 border-foreground"
                >
                  Reconnect
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Bar */}
        {data && (
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Badge
              variant="secondary"
              className="border-2 border-foreground px-3 py-1 text-sm"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {data.responseCount} response{data.responseCount !== 1 ? "s" : ""}
            </Badge>

            <Badge
              variant="outline"
              className="border-2 border-foreground px-3 py-1 text-sm"
            >
              {data.providers.length} provider
              {data.providers.length !== 1 ? "s" : ""}
            </Badge>

            {data.categoryCode && (
              <Badge
                variant="outline"
                className="border-2 border-foreground px-3 py-1 text-sm"
              >
                {data.categoryCode.replace(/_/g, " ")}
              </Badge>
            )}

            {getElapsedTime() && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {getElapsedTime()}
              </span>
            )}

            {connectionStatus === "connected" && getTimeRemaining() && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Radio className="h-3 w-3 animate-pulse" />
                {getTimeRemaining()}
              </span>
            )}
          </div>
        )}

        <Separator className="mb-6 border border-foreground" />

        {/* Connecting State */}
        {connectionStatus === "connecting" && !data && (
          <Card className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <CardContent className="py-12 text-center">
              <Wifi className="h-8 w-8 mx-auto mb-4 animate-pulse" />
              <p className="text-muted-foreground">
                Connecting to live stream...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-2 border-destructive shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
              <p className="text-destructive font-medium">{error}</p>
              <Button
                variant="outline"
                className="mt-4 border-2 border-foreground"
                onClick={reconnect}
              >
                <Wifi className="h-4 w-4 mr-2" />
                Reconnect
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {data && data.responseCount === 0 && !error && (
          <Card className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <CardContent className="py-12 text-center">
              {connectionStatus === "connected" ? (
                <>
                  <Radio className="h-8 w-8 mx-auto mb-4 animate-pulse text-primary" />
                  <p className="text-lg font-medium mb-2">
                    Waiting for responses...
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Insurance providers are processing your search request.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Results will appear automatically as providers respond.
                  </p>
                </>
              ) : connectionStatus === "complete" ? (
                <>
                  <Search className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">No responses</p>
                  <p className="text-sm text-muted-foreground">
                    No providers responded to this search within the time limit.
                  </p>
                </>
              ) : (
                <>
                  <Search className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">No responses yet</p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results List */}
        {data && data.responses.length > 0 && (
          <div className="space-y-6">
            {data.responses.map((response, index) => (
              <ProviderCard
                key={`${response.context.bpp_id || index}-${response._receivedAt}`}
                response={response}
                onItemSelect={handleItemSelect}
                selectingItemId={selectingItemId}
              />
            ))}
          </div>
        )}

        {/* Live indicator at bottom */}
        {connectionStatus === "connected" && data && data.responseCount > 0 && (
          <div className="mt-8 text-center">
            <Badge
              variant="outline"
              className="border-2 border-foreground animate-pulse"
            >
              <Radio className="h-3 w-3 mr-1" />
              Listening for more responses...
            </Badge>
          </div>
        )}
      </main>

    </div>
  );
}
