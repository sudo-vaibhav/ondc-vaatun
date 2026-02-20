import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, Download, FileText, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { PolicyDetailsSection, PolicySummaryCard } from "@/components/policy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseValidity } from "@/lib/validity";
import { trpc } from "@/trpc/client";

export const Route = createFileRoute("/policy-success/$orderId")({
  component: PolicySuccessPage,
});

function PolicySuccessPage() {
  const { orderId } = Route.useParams();

  const { data, isLoading, error } = trpc.results.getStatusResults.useQuery(
    { orderId },
    { staleTime: 5 * 60 * 1000 }, // Cache for 5 minutes
  );

  // Open PDF in new tab
  const handleDownload = () => {
    const policyDoc =
      data && "policyDocument" in data ? data.policyDocument : undefined;
    if (policyDoc?.url) {
      window.open(policyDoc.url, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data?.found) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="border-2 border-destructive">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
                <h2 className="text-xl font-bold text-destructive">
                  Policy Not Found
                </h2>
                <p className="text-sm text-muted-foreground">
                  {error?.message || "The requested policy could not be found."}
                </p>
                <Button asChild>
                  <Link to="/">Return Home</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Extract data with type guards
  const policyDocument =
    "policyDocument" in data ? data.policyDocument : undefined;
  const items = "items" in data ? data.items : undefined;
  const provider = "provider" in data ? data.provider : undefined;
  const quote = "quote" in data ? data.quote : undefined;
  const fulfillments = "fulfillments" in data ? data.fulfillments : undefined;
  const paymentStatus =
    "paymentStatus" in data ? data.paymentStatus : undefined;

  // Extract coverage amount from tags
  const coverageTag = items?.[0]?.tags?.find(
    (t: { descriptor?: { code?: string } }) =>
      t.descriptor?.code === "GENERAL_INFO",
  );
  const coverageAmount = coverageTag?.list?.find(
    (l: { descriptor?: { code?: string } }) =>
      l.descriptor?.code === "SUM_INSURED",
  )?.value;

  // Parse validity from item time
  const itemTime = items?.[0]?.time;
  const validity = parseValidity(itemTime);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Celebration Header with Captain Otter */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 0.6, bounce: 0.5 }}
          >
            {/* Captain Otter success pose */}
            <img
              src="/mascot/captain-otter/poses/success-salute.png"
              alt="Captain Otter celebrating"
              className="h-32 mx-auto mb-4"
              onError={(e) => {
                // Fallback if image doesn't exist
                e.currentTarget.style.display = "none";
              }}
            />
          </motion.div>
          <motion.h1
            className="text-3xl font-bold text-green-600"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Policy Issued Successfully!
          </motion.h1>
          <motion.p
            className="text-muted-foreground mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Your insurance coverage is now active
          </motion.p>
        </div>

        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Policy Summary Card */}
          <PolicySummaryCard
            orderId={orderId}
            providerName={provider?.descriptor?.name}
            productName={items?.[0]?.descriptor?.name}
            coverageAmount={coverageAmount}
            premium={quote?.price?.value}
            paymentStatus={paymentStatus}
            validity={validity.formatted || undefined}
          />

          {/* Full Policy Details */}
          <PolicyDetailsSection
            items={items}
            quote={quote}
            fulfillments={fulfillments}
          />

          {/* Document Download */}
          {policyDocument?.url && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Policy Document
                </CardTitle>
              </CardHeader>
              <CardContent>
                {policyDocument.descriptor?.long_desc && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {policyDocument.descriptor.long_desc}
                  </p>
                )}
                <Button onClick={handleDownload} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download Policy (PDF)
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button variant="outline" asChild>
              <Link to="/policy/$orderId" params={{ orderId }}>
                View Policy Details
              </Link>
            </Button>
            <Button asChild>
              <Link to="/">Return to Home</Link>
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
