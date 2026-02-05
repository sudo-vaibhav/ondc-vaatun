import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

interface SearchResult {
  found: boolean;
  transactionId: string;
  responseCount: number;
  providers?: Array<{
    bppId: string;
    name?: string;
    itemCount: number;
  }>;
  isComplete?: boolean;
}

export const Route = createFileRoute("/search-results-streamed/$transactionId")(
  {
    component: StreamedSearchResultsPage,
  },
);

function StreamedSearchResultsPage() {
  const { transactionId } = Route.useParams();
  const [results, setResults] = useState<SearchResult | null>(null);
  const [status, setStatus] = useState<string>("Connecting...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/ondc/search-stream/${transactionId}`,
    );

    eventSource.addEventListener("connected", () => {
      setStatus("Connected, waiting for results...");
    });

    eventSource.addEventListener("initial", (e) => {
      const data = JSON.parse(e.data);
      setResults(data);
      setStatus(`Received ${data.responseCount} responses`);
    });

    eventSource.addEventListener("update", (e) => {
      const data = JSON.parse(e.data);
      setResults(data);
      setStatus(`Received ${data.responseCount} responses`);
    });

    eventSource.addEventListener("complete", (e) => {
      const data = JSON.parse(e.data);
      setStatus(`Complete - ${data.responseCount} total responses`);
      eventSource.close();
    });

    eventSource.addEventListener("error", (e) => {
      if (e instanceof MessageEvent) {
        const data = JSON.parse(e.data);
        setError(data.message);
      } else {
        setError("Connection error");
      }
      eventSource.close();
    });

    return () => {
      eventSource.close();
    };
  }, [transactionId]);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Live Search Results</h1>
        <p className="text-muted-foreground mb-2">
          Transaction: {transactionId}
        </p>
        <p className="text-sm text-muted-foreground mb-8">Status: {status}</p>

        {error && <p className="text-destructive mb-4">{error}</p>}

        {results?.found ? (
          <div>
            <p className="mb-4">
              Found {results.responseCount} responses from{" "}
              {results.providers?.length || 0} providers
            </p>
            <pre className="bg-muted p-4 rounded-lg overflow-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-muted-foreground">Waiting for results...</p>
        )}
      </main>
    </div>
  );
}
