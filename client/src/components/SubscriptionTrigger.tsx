import { Play } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function SubscriptionTrigger() {
  const [isLoading, setIsLoading] = useState(false);

  const handleTrigger = async () => {
    setIsLoading(true);
    try {
      // Use relative path to hit the local API route
      const response = await fetch("/api/ondc/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Subscription Triggered! Status: ${response.status}`);
        console.log("[SubscriptionTrigger] Response:", data);
      } else {
        throw new Error(data.message || "Failed to trigger subscription");
      }
    } catch (error) {
      console.error("[SubscriptionTrigger] Error:", error);
      alert("Failed to connect to the subscription endpoint.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleTrigger}
      disabled={isLoading}
      className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px]"
    >
      <Play className="mr-2 h-4 w-4" />
      {isLoading ? "Triggering..." : "Trigger Subscription"}
    </Button>
  );
}
