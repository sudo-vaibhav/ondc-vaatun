import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { clearConfirmData, getConfirmData } from "@/lib/confirm-data";
import { trpc } from "@/trpc/client";

export const Route = createFileRoute("/payment-callback/$transactionId")({
  component: PaymentCallbackPage,
});

type Stage =
  | "loading"
  | "confirming"
  | "polling-confirm"
  | "polling-status"
  | "not-paid"
  | "error";

function PaymentCallbackPage() {
  const { transactionId } = Route.useParams();
  const navigate = useNavigate();

  const [stage, setStage] = useState<Stage>("loading");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [confirmMessageId, setConfirmMessageId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const pollStartTimeRef = useRef(Date.now());
  const hasTriggeredConfirm = useRef(false);

  // Load confirm data on mount
  const confirmData = getConfirmData(transactionId);

  // Confirm mutation with 3 retries
  const confirmMutation = trpc.gateway.confirm.useMutation({
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    onSuccess: (result) => {
      setConfirmMessageId(result.messageId);
      setStage("polling-confirm");
    },
    onError: (error) => {
      setErrorMessage(error.message);
      setStage("error");
    },
  });

  // Poll confirm results to get orderId from on_confirm
  const { data: confirmResult } = trpc.results.getConfirmResults.useQuery(
    {
      transactionId,
      messageId: confirmMessageId || "",
    },
    {
      enabled: stage === "polling-confirm" && !!confirmMessageId,
      refetchInterval: (query) => {
        const data = query.state.data;
        if (data?.hasResponse) return false;
        if (data && "error" in data && data.error) return false;
        // 60 second timeout for confirm response
        if (Date.now() - pollStartTimeRef.current > 60000) return false;
        return 2000;
      },
    },
  );

  // Status mutation
  const statusMutation = trpc.gateway.status.useMutation({
    onError: (error) => {
      setErrorMessage(error.message);
      setStage("error");
    },
  });

  // Poll status results (2 minute timeout)
  const { data: statusResult, refetch: refetchStatus } =
    trpc.results.getStatusResults.useQuery(
      { orderId: orderId || "" },
      {
        enabled: stage === "polling-status" && !!orderId,
        refetchInterval: (query) => {
          const elapsed = Date.now() - pollStartTimeRef.current;
          const data = query.state.data;
          // 2 minute timeout
          if (elapsed > 120000) return false;
          // Stop on PAID
          if (data && "paymentStatus" in data && data.paymentStatus === "PAID")
            return false;
          // Stop on policy document
          if (data && "policyDocument" in data && data.policyDocument?.url)
            return false;
          // Stop on error
          if (data && "error" in data && data.error) return false;
          return 3000; // Poll every 3s
        },
      },
    );

  // When confirm response received, trigger status
  useEffect(() => {
    const hasOrderId =
      confirmResult && "orderId" in confirmResult && confirmResult.orderId;
    if (
      confirmResult?.hasResponse &&
      hasOrderId &&
      stage === "polling-confirm"
    ) {
      const orderIdValue = confirmResult.orderId as string;
      setOrderId(orderIdValue);
      setStage("polling-status");
      // Reset poll start time for status polling
      pollStartTimeRef.current = Date.now();
      // Trigger status request
      statusMutation.mutate({
        transactionId,
        orderId: orderIdValue,
        bppId: confirmData?.bppId || "",
        bppUri: confirmData?.bppUri || "",
      });
    }
  }, [confirmResult, stage]);

  // Handle status result changes
  useEffect(() => {
    if (stage !== "polling-status" || !statusResult) return;

    const paymentStatus =
      "paymentStatus" in statusResult ? statusResult.paymentStatus : undefined;
    const policyUrl =
      "policyDocument" in statusResult
        ? statusResult.policyDocument?.url
        : undefined;

    if (paymentStatus === "PAID" || policyUrl) {
      clearConfirmData();
      navigate({
        to: "/policy-success/$orderId",
        params: { orderId: orderId! },
      });
    } else if (paymentStatus === "NOT-PAID" && statusResult.hasResponse) {
      setStage("not-paid");
    }
  }, [statusResult, orderId, stage]);

  // Trigger confirm on mount if we have data
  useEffect(() => {
    if (hasTriggeredConfirm.current) return;

    if (!confirmData) {
      setErrorMessage("Payment session expired or invalid. Please start over.");
      setStage("error");
      return;
    }

    hasTriggeredConfirm.current = true;
    setStage("confirming");
    confirmMutation.mutate({
      transactionId: confirmData.transactionId,
      bppId: confirmData.bppId,
      bppUri: confirmData.bppUri,
      providerId: confirmData.providerId,
      itemId: confirmData.itemId,
      parentItemId: confirmData.parentItemId,
      xinputFormId: confirmData.xinputFormId,
      submissionId: confirmData.submissionId,
      addOns: confirmData.addOns,
      customerName: confirmData.customerName,
      customerEmail: confirmData.customerEmail,
      customerPhone: confirmData.customerPhone,
      quoteId: confirmData.quoteId,
      amount: confirmData.amount,
      quoteBreakup: confirmData.quoteBreakup,
    });
  }, []);

  // Loading state
  if (stage === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Confirming state
  if (stage === "confirming" || stage === "polling-confirm") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <h2 className="text-lg font-semibold">Confirming your payment...</h2>
          <p className="text-sm text-muted-foreground">
            Please wait while we verify your transaction
          </p>
          {confirmMutation.failureCount > 0 && (
            <p className="text-sm text-amber-600">
              Retry {confirmMutation.failureCount}/3
            </p>
          )}
        </div>
      </div>
    );
  }

  // Polling status state
  if (stage === "polling-status") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <h2 className="text-lg font-semibold">Processing your policy...</h2>
          <p className="text-sm text-muted-foreground">
            This may take a moment
          </p>
        </div>
      </div>
    );
  }

  // NOT-PAID state
  if (stage === "not-paid") {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="border-2 border-amber-500">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
                <h2 className="text-xl font-bold text-amber-600">
                  Payment Processing
                </h2>
                <p className="text-sm text-muted-foreground">
                  If you completed payment, please wait a moment for it to be
                  verified.
                  <br />
                  Otherwise, please contact support for assistance.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Re-trigger status polling
                      if (orderId) {
                        pollStartTimeRef.current = Date.now();
                        setStage("polling-status");
                        statusMutation.mutate({
                          transactionId,
                          orderId,
                          bppId: confirmData?.bppId || "",
                          bppUri: confirmData?.bppUri || "",
                        });
                        refetchStatus();
                      }
                    }}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Check Status
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link to="/">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Return Home
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

  // Error state
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-2 border-destructive">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="text-xl font-bold text-destructive">
                Payment Error
              </h2>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button variant="ghost" asChild>
                  <Link to="/">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Return Home
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
