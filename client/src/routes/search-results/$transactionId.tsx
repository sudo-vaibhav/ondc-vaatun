import { createFileRoute } from "@tanstack/react-router";
import { trpc } from "@/trpc/client";

export const Route = createFileRoute("/search-results/$transactionId")({
  component: SearchResultsPage,
});

function SearchResultsPage() {
  const { transactionId } = Route.useParams();

  const { data, isLoading, error } = trpc.results.getSearchResults.useQuery({
    transactionId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-4">Search Results</h1>
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
        <h1 className="text-3xl font-bold mb-4">Search Results</h1>
        <p className="text-muted-foreground mb-8">
          Transaction: {transactionId}
        </p>
        {data?.found ? (
          <div>
            <p className="mb-4">
              Found {data.responseCount} responses from{" "}
              {data.providers?.length || 0} providers
            </p>
            <pre className="bg-muted p-4 rounded-lg overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-muted-foreground">No results found</p>
        )}
      </main>
    </div>
  );
}
