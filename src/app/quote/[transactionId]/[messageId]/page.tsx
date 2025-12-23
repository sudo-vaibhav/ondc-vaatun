"use client";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Radio,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import QuoteBreakdown from "@/components/quote/QuoteBreakdown";
import XInputForm from "@/components/quote/XInputForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Quote, SelectItem, SelectProvider } from "@/lib/select-store";

interface SelectResultsData {
  found: boolean;
  transactionId: string;
  messageId: string;
  itemId?: string;
  providerId?: string;
  hasResponse: boolean;
  quote?: Quote;
  provider?: SelectProvider;
  item?: SelectItem;
  xinput?: SelectItem["xinput"];
  error?: { code?: string; message?: string };
}

// Polling interval in milliseconds
const POLL_INTERVAL = 1500;
// Auto-stop polling after this many seconds
const MAX_POLL_DURATION = 30;

export default function QuotePage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = params.transactionId as string;
  const messageId = params.messageId as string;

  const [data, setData] = useState<SelectResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [pollStartTime] = useState(Date.now());

  const fetchResults = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/ondc/select-results?transaction_id=${transactionId}&message_id=${messageId}`,
      );
      const result: SelectResultsData = await response.json();

      setData(result);
      setError(null);

      // Stop polling if we have a response
      if (result.hasResponse) {
        setIsPolling(false);
      }
    } catch (err) {
      console.error("[QuotePage] Fetch error:", err);
      setError("Failed to fetch quote");
    } finally {
      setLoading(false);
    }
  }, [transactionId, messageId]);

  // Initial fetch and polling
  useEffect(() => {
    fetchResults();

    let pollInterval: NodeJS.Timeout | null = null;

    if (isPolling) {
      pollInterval = setInterval(() => {
        // Auto-stop polling after MAX_POLL_DURATION
        const elapsed = (Date.now() - pollStartTime) / 1000;
        if (elapsed > MAX_POLL_DURATION) {
          setIsPolling(false);
          if (pollInterval) clearInterval(pollInterval);
          return;
        }

        fetchResults();
      }, POLL_INTERVAL);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [fetchResults, isPolling, pollStartTime]);

  const provider = data?.provider;
  const item = data?.item;
  const quote = data?.quote;
  const xinput = data?.xinput;
  const hasError = data?.error;

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
                onClick={() => router.push(`/search-results/${transactionId}`)}
                className="border-2 border-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Results
              </Button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Quote Details
                </h1>
                <p className="text-xs text-muted-foreground font-mono">
                  {messageId}
                </p>
              </div>
            </div>

            {/* Polling Status */}
            {isPolling && (
              <Badge
                variant="secondary"
                className="border-2 border-foreground animate-pulse"
              >
                <Radio className="h-3 w-3 mr-1" />
                Waiting for quote...
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Loading State */}
        {loading && !data && (
          <Card className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <CardContent className="py-12 text-center">
              <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
              <p className="text-muted-foreground">Loading quote details...</p>
            </CardContent>
          </Card>
        )}

        {/* Waiting for Response */}
        {data && !data.hasResponse && (
          <Card className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <CardContent className="py-12 text-center">
              {isPolling ? (
                <>
                  <Radio className="h-8 w-8 mx-auto mb-4 animate-pulse text-primary" />
                  <p className="text-lg font-medium mb-2">
                    Getting your quote...
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The insurance provider is preparing your personalized quote.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    This usually takes a few seconds.
                  </p>
                </>
              ) : (
                <>
                  <Clock className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">No response yet</p>
                  <p className="text-sm text-muted-foreground">
                    The provider hasn't responded to this request.
                  </p>
                  <Button
                    variant="default"
                    className="mt-4 border-2 border-foreground"
                    onClick={() => setIsPolling(true)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error from BPP */}
        {hasError && (
          <Card className="border-2 border-destructive shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6">
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
              <p className="text-lg font-medium text-destructive mb-2">
                Provider Error
              </p>
              <p className="text-sm text-muted-foreground">
                Code: {hasError.code || "Unknown"}
              </p>
              {hasError.message && (
                <p className="text-sm text-muted-foreground mt-1">
                  {hasError.message}
                </p>
              )}
              <Button
                variant="outline"
                className="mt-4 border-2 border-foreground"
                onClick={() => router.push(`/search-results/${transactionId}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Choose Another Product
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quote Content */}
        {data?.hasResponse && !hasError && (
          <div className="space-y-6">
            {/* Provider Info */}
            {provider && (
              <Card className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {provider.descriptor?.images?.[0]?.url ? (
                      <Image
                        width={40}
                        height={40}
                        src={provider.descriptor.images[0].url}
                        alt={provider.descriptor?.name || "Provider"}
                        className="h-12 w-12 rounded border-2 border-foreground object-contain bg-white"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded border-2 border-foreground flex items-center justify-center bg-muted">
                        <Building2 className="h-6 w-6" />
                      </div>
                    )}
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {provider.descriptor?.name || provider.id}
                      </CardTitle>
                      <CardDescription className="text-xs font-mono">
                        {provider.id}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="secondary"
                      className="border-2 border-foreground flex items-center gap-1"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Quote Ready
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            )}

            {/* Product Info */}
            {item && (
              <Card className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <CardHeader>
                  <CardTitle className="text-base">
                    {item.descriptor?.name || item.id}
                  </CardTitle>
                  {item.descriptor?.short_desc && (
                    <CardDescription>
                      {item.descriptor.short_desc}
                    </CardDescription>
                  )}
                </CardHeader>
                {item.tags && item.tags.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {item.tags[0]?.list?.slice(0, 6).map((tag) => (
                        <div key={tag.descriptor?.code} className="text-sm">
                          <span className="text-muted-foreground block text-xs">
                            {tag.descriptor?.name ||
                              tag.descriptor?.code?.replace(/_/g, " ")}
                          </span>
                          <span className="font-medium">{tag.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Quote Breakdown */}
            {quote && <QuoteBreakdown quote={quote} />}

            {/* XInput Form */}
            {xinput?.required && xinput.form?.url && (
              <XInputForm
                head={xinput.head}
                form={xinput.form}
                required={xinput.required}
              />
            )}

            {/* Next Steps */}
            {quote && !xinput?.required && (
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  className="border-2 border-foreground"
                  onClick={() =>
                    router.push(`/search-results/${transactionId}`)
                  }
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Results
                </Button>
                <Button
                  className="border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                  disabled
                >
                  Proceed to Init
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Fetch Error */}
        {error && (
          <Card className="border-2 border-destructive shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-4 text-destructive" />
              <p className="text-destructive font-medium">{error}</p>
              <Button
                variant="outline"
                className="mt-4 border-2 border-foreground"
                onClick={fetchResults}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
