import { createFileRoute } from "@tanstack/react-router";
import { trpc } from "@/trpc/client";

export const Route = createFileRoute("/quote/$transactionId/$messageId")({
  component: QuotePage,
});

function QuotePage() {
  const { transactionId, messageId } = Route.useParams();

  const { data, isLoading, error } = trpc.results.getSelectResults.useQuery({
    transactionId,
    messageId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-4">Quote Details</h1>
          <div className="text-center text-muted-foreground">Loading...</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-4">Error</h1>
          <p className="text-destructive">{error.message}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Quote Details</h1>
        <p className="text-muted-foreground mb-8">
          Transaction: {transactionId}
        </p>

        {data?.found && data.quote ? (
          <div className="space-y-6">
            <div className="p-6 border rounded-lg">
              <h2 className="text-xl font-semibold mb-4">
                {data.provider?.descriptor?.name || "Insurance Provider"}
              </h2>
              <div className="text-3xl font-bold text-primary">
                {data.quote.price.currency} {data.quote.price.value}
              </div>
            </div>

            {data.quote.breakup && (
              <div className="p-6 border rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Price Breakdown</h3>
                <div className="space-y-2">
                  {data.quote.breakup.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{item.title}</span>
                      <span>
                        {item.price.currency} {item.price.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-muted-foreground">
            {data?.hasResponse === false
              ? "Waiting for quote response..."
              : "Quote not found"}
          </p>
        )}
      </main>
    </div>
  );
}
