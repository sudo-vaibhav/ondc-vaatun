import { Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function SearchTrigger() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleTrigger = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use relative path to hit the local API route
      const response = await fetch("/api/ondc/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      console.log("[SearchTrigger] Response:", data);

      if (response.ok && data.transactionId) {
        // Navigate to search results page
        router.push(`/search-results/${data.transactionId}`);
      } else {
        throw new Error(
          data.message ||
            "Failed to trigger search - no transaction ID returned",
        );
      }
    } catch (error) {
      console.error("[SearchTrigger] Error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to connect to the search endpoint",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleTrigger}
        disabled={isLoading}
        className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px]"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Searching...
          </>
        ) : (
          <>
            <Search className="mr-2 h-4 w-4" />
            Search Insurance
          </>
        )}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
