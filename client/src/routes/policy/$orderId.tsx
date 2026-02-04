import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Download,
  RefreshCw,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/trpc/client";
import { PaymentStatusBadge } from "@/components/policy";
import { parseValidity } from "@/lib/validity";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/policy/$orderId")({
  component: PolicyViewPage,
});

function PolicyViewPage() {
  const { orderId } = Route.useParams();

  // Hybrid caching: Redis-backed with manual refresh
  const { data, isLoading, error, refetch, isFetching } =
    trpc.results.getStatusResults.useQuery(
      { orderId },
      { staleTime: 5 * 60 * 1000 }
    );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // 404 page: "Policy not found"
  if (error || !data?.found) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="border-2 border-muted">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                <h2 className="text-xl font-bold">Policy Not Found</h2>
                <p className="text-sm text-muted-foreground">
                  The requested policy could not be found. It may have expired
                  or been removed.
                </p>
                <Button asChild>
                  <Link to="/">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Return Home
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Extract data with type guards
  const items = "items" in data ? data.items : undefined;
  const provider = "provider" in data ? data.provider : undefined;
  const quote = "quote" in data ? data.quote : undefined;
  const paymentStatus = "paymentStatus" in data ? data.paymentStatus : undefined;
  const orderStatus = "orderStatus" in data ? data.orderStatus : undefined;
  const policyDocument = "policyDocument" in data ? data.policyDocument : undefined;

  // Parse validity
  const itemTime = items?.[0]?.time;
  const validity = parseValidity(itemTime);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back button */}
        <Button variant="ghost" asChild className="mb-6 -ml-2">
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </Button>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Policy Status</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")}
              />
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Payment Status</span>
              {paymentStatus && (
                <PaymentStatusBadge status={paymentStatus} />
              )}
            </div>

            {/* Order Status */}
            {orderStatus && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Policy Status</span>
                <span className="font-medium">{orderStatus}</span>
              </div>
            )}

            {/* Order ID */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Order ID</span>
              <span className="font-mono text-sm">{orderId}</span>
            </div>

            {/* Provider */}
            {provider?.descriptor?.name && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Provider</span>
                <span className="font-medium">
                  {provider.descriptor.name}
                </span>
              </div>
            )}

            {/* Validity - format: "Valid: Jan 1, 2026 - Dec 31, 2026" */}
            {validity.formatted && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Validity</span>
                <span>{validity.formatted}</span>
              </div>
            )}

            {/* Premium */}
            {quote?.price?.value && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Premium Paid</span>
                <span className="font-medium">Rs. {quote.price.value}</span>
              </div>
            )}

            {/* Download link - simple view with download link */}
            {policyDocument?.url && (
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => window.open(policyDocument.url, "_blank")}
                >
                  <Download className="h-4 w-4" />
                  Download Policy Document
                </Button>
              </div>
            )}

            {/* Link to full success page if user wants details */}
            <div className="pt-2">
              <Button variant="link" asChild className="w-full">
                <Link to="/policy-success/$orderId" params={{ orderId }}>
                  View Full Policy Details
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
