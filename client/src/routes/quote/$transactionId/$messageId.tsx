import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { AddOnSelector } from "@/components/quote/AddOnSelector";
import { CoverageDetails } from "@/components/quote/CoverageDetails";
import QuoteBreakdown from "@/components/quote/QuoteBreakdown";
import { QuoteHeader } from "@/components/quote/QuoteHeader";
import { TermsCollapsible } from "@/components/quote/TermsCollapsible";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/trpc/client";
import { KYCForm, type KYCFormData } from "@/components/forms";
import { storeConfirmData } from "@/lib/confirm-data";

export const Route = createFileRoute("/quote/$transactionId/$messageId")({
  component: QuotePage,
});

function QuotePage() {
  const { transactionId, messageId } = Route.useParams();
  const navigate = useNavigate();

  // Local state for add-on selection
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  // KYC form visibility state
  const [showKYCForm, setShowKYCForm] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Polling configuration: poll every 2s until response received or error occurs
  const { data, isLoading, error, refetch } =
    trpc.results.getSelectResults.useQuery(
      { transactionId, messageId },
      {
        refetchInterval: (query) => {
          // Stop polling when response received or error occurs
          if (query.state.data?.hasResponse || query.state.data?.error) {
            return false;
          }
          return 2000; // Poll every 2 seconds
        },
        refetchIntervalInBackground: false,
      },
    );

  // Init mutation with auto-retry (3 attempts with exponential backoff)
  const initMutation = trpc.gateway.init.useMutation({
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    onSuccess: (result) => {
      // Navigate to init polling page
      navigate({
        to: "/init/$transactionId/$messageId",
        params: { transactionId, messageId: result.messageId },
      });
    },
    onError: (error) => {
      // Only shown after all 3 retries exhausted
      console.error("Init failed after retries:", error);
      setInitError(error.message);
    },
  });

  // Handle add-on selection changes
  const handleAddOnChange = (selectedIds: string[], _totalPrice: number) => {
    setSelectedAddOns(selectedIds);
  };

  // Handle KYC form submission
  const handleKYCSubmit = (formData: KYCFormData, submissionId: string) => {
    // Clear any previous error before new attempt
    setInitError(null);

    // Store confirm data before init (needed for payment callback)
    storeConfirmData({
      transactionId,
      bppId: data?.bppId || "",
      bppUri: data?.bppUri || "",
      providerId: data?.providerId || "",
      itemId: data?.itemId || "",
      parentItemId: data?.item?.parent_item_id || data?.itemId || "",
      xinputFormId: data?.xinput?.form?.id || "",
      submissionId,
      addOns: selectedAddOns.map((id) => ({ id, quantity: 1 })),
      customerName: `${formData.firstName} ${formData.lastName}`,
      customerEmail: formData.email,
      customerPhone: formData.phone,
      quoteId: data?.quote?.id || "",
      amount: data?.quote?.price?.value || "0",
      quoteBreakup: data?.quote?.breakup,
    });

    initMutation.mutate({
      transactionId,
      bppId: data?.bppId || "",
      bppUri: data?.bppUri || "",
      providerId: data?.providerId || "",
      itemId: data?.itemId || "",
      parentItemId: data?.item?.parent_item_id || data?.itemId || "",
      xinputFormId: data?.xinput?.form?.id || "",
      submissionId,
      addOns: selectedAddOns.map((id) => ({ id, quantity: 1 })),
      customerName: `${formData.firstName} ${formData.lastName}`,
      customerEmail: formData.email,
      customerPhone: formData.phone,
      amount: data?.quote?.price?.value || "0",
    });
  };

  // Loading state: waiting for initial response
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <h2 className="text-lg font-semibold">
            Fetching your personalized quote...
          </h2>
          <p className="text-sm text-muted-foreground">
            This may take a few seconds
          </p>
        </div>
      </div>
    );
  }

  // tRPC query error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="border-2 border-destructive">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                <h2 className="text-xl font-bold text-destructive">
                  Error Loading Quote
                </h2>
                <p className="text-sm text-muted-foreground">{error.message}</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => refetch()}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link
                      to="/health/$searchId"
                      params={{ searchId: transactionId }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Results
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Waiting for BPP response (polling state)
  if (!data?.hasResponse) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <h2 className="text-lg font-semibold">
            Fetching your personalized quote...
          </h2>
          <p className="text-sm text-muted-foreground">
            Waiting for insurer response...
          </p>
        </div>
      </div>
    );
  }

  // BPP returned an error
  if (data?.error) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="border-2 border-destructive">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                <h2 className="text-xl font-bold text-destructive">
                  Quote Error
                </h2>
                <div className="text-left bg-muted p-4 rounded-lg">
                  <p className="text-sm font-mono">
                    <span className="text-muted-foreground">Code:</span>{" "}
                    {data.error.code || "Unknown"}
                  </p>
                  <p className="text-sm font-mono mt-1">
                    <span className="text-muted-foreground">Message:</span>{" "}
                    {data.error.message || "An error occurred"}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => refetch()}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link
                      to="/health/$searchId"
                      params={{ searchId: transactionId }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Results
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Quote not found
  if (!data?.found || !data?.quote) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="border-2 border-muted">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                <h2 className="text-xl font-bold">Quote Not Found</h2>
                <p className="text-sm text-muted-foreground">
                  The requested quote could not be found. It may have expired.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => refetch()}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link
                      to="/health/$searchId"
                      params={{ searchId: transactionId }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Results
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Success state: quote received
  const { provider, quote, item } = data;

  // Extract add-ons from item if available
  const addOns = item?.add_ons || [];

  // Extract terms from provider's long description
  const terms = provider?.descriptor?.long_desc;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 -ml-2">
          <Link to="/health/$searchId" params={{ searchId: transactionId }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Results
          </Link>
        </Button>

        <div className="space-y-6">
          {/* Provider and Premium */}
          <QuoteHeader provider={provider} quote={quote} />

          {/* Coverage Details (tags grid) */}
          <CoverageDetails item={item} />

          {/* Price Breakdown */}
          <QuoteBreakdown quote={quote} />

          {/* Add-ons (if available) */}
          {addOns.length > 0 && (
            <AddOnSelector
              addOns={addOns}
              onSelectionChange={handleAddOnChange}
            />
          )}

          {/* Terms & Conditions */}
          <TermsCollapsible terms={terms} />

          {/* Proceed button / KYC Form */}
          {!showKYCForm ? (
            <Button
              size="lg"
              className="w-full"
              onClick={() => setShowKYCForm(true)}
            >
              Proceed to Application
            </Button>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Complete Your Application</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowKYCForm(false)}
                >
                  Cancel
                </Button>
              </div>
              <KYCForm quote={quote} onSubmit={handleKYCSubmit} />
              {initMutation.isPending && (
                <div className="text-center text-sm text-muted-foreground">
                  Submitting application...
                  {initMutation.failureCount > 0 && (
                    <span className="ml-2 text-amber-600">
                      (Retry {initMutation.failureCount}/3)
                    </span>
                  )}
                </div>
              )}
              {initError && (
                <div className="text-center text-sm text-destructive">
                  {initError}
                  <Button
                    variant="link"
                    size="sm"
                    className="ml-2"
                    onClick={() => setInitError(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
