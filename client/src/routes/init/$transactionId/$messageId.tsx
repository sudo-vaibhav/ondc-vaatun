import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/trpc/client";

export const Route = createFileRoute("/init/$transactionId/$messageId")({
  component: InitPollingPage,
});

function InitPollingPage() {
  const { transactionId, messageId } = Route.useParams();
  const [startTime] = useState(() => Date.now());

  // Polling query with 60 second timeout
  const { data, isLoading, error, refetch } =
    trpc.results.getInitResults.useQuery(
      { transactionId, messageId },
      {
        refetchInterval: (query) => {
          const elapsed = Date.now() - startTime;
          // 60 second timeout
          if (elapsed > 60000) return false;
          // Stop on response or error
          if (query.state.data?.hasResponse || query.state.data?.error)
            return false;
          return 2000; // Poll every 2s
        },
        refetchIntervalInBackground: false,
      },
    );

  // Extract payment URL and xinput info from response
  const paymentUrl = data?.payments?.[0]?.url;
  const xinput = data?.xinput;
  const hasNextForm = xinput?.required && xinput?.form?.url;

  // Calculate if timeout occurred
  const elapsed = Date.now() - startTime;
  const isTimeout = elapsed > 60000 && !data?.hasResponse && !error;

  // Auto-redirect to payment URL after 3 seconds
  useEffect(() => {
    if (paymentUrl) {
      const timer = setTimeout(() => {
        window.location.href = paymentUrl;
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [paymentUrl]);

  // Loading state: initial load
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <h2 className="text-lg font-semibold">
            Processing your application...
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
                  Error Processing Application
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
                      to="/quote/$transactionId/$messageId"
                      params={{ transactionId, messageId }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Quote
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

  // Timeout state
  if (isTimeout) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="border-2 border-amber-500">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
                <h2 className="text-xl font-bold text-amber-600">
                  Request Timed Out
                </h2>
                <p className="text-sm text-muted-foreground">
                  The insurer is taking longer than expected to respond. Please
                  try again.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.location.reload();
                    }}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link
                      to="/quote/$transactionId/$messageId"
                      params={{ transactionId, messageId }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Quote
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

  // BPP error state
  if (data?.error) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="border-2 border-destructive">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                <h2 className="text-xl font-bold text-destructive">
                  Application Error
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
                      to="/quote/$transactionId/$messageId"
                      params={{ transactionId, messageId }}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Quote
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

  // Payment URL received - success state
  if (paymentUrl) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="border-2 border-green-500">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-green-600">
                  Application Approved!
                </h2>
                <p className="text-sm text-muted-foreground">
                  You'll be redirected to complete payment in a few seconds...
                </p>
                <Button asChild className="gap-2 mt-4">
                  <a href={paymentUrl} target="_self">
                    <ExternalLink className="h-4 w-4" />
                    Proceed to Payment
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Next form required - redirect to BPP form
  if (hasNextForm && xinput?.form?.url) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="border-2 border-blue-500">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
                  <svg
                    className="h-6 w-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-blue-600">
                  Additional Information Required
                </h2>
                <p className="text-sm text-muted-foreground">
                  The insurer needs some additional information to process your
                  application.
                </p>
                {xinput.head?.index && (
                  <p className="text-xs text-muted-foreground">
                    Step {xinput.head.index.cur} of {xinput.head.index.max}
                  </p>
                )}
                <Button asChild className="gap-2 mt-4">
                  <a href={xinput.form.url} target="_self">
                    <ExternalLink className="h-4 w-4" />
                    Continue Application
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  You'll be redirected back after completing the form.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Waiting for response (polling state)
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <h2 className="text-lg font-semibold">Waiting for insurer response...</h2>
        <p className="text-sm text-muted-foreground">
          Your application is being processed
        </p>
      </div>
    </div>
  );
}
