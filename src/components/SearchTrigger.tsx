"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function SearchTrigger() {
    const [isLoading, setIsLoading] = useState(false);

    const handleTrigger = async () => {
        setIsLoading(true);
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

            if (response.ok) {
                alert(`Search Triggered! Status: ${response.status}`);
                console.log("[SearchTrigger] Response:", data);
            } else {
                throw new Error(data.message || "Failed to trigger search");
            }
        } catch (error) {
            console.error("[SearchTrigger] Error:", error);
            alert("Failed to connect to the search endpoint.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            onClick={handleTrigger}
            disabled={isLoading}
            className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]"
        >
            <Search className="mr-2 h-4 w-4" />
            {isLoading ? "Searching..." : "Trigger Search"}
        </Button>
    );
}
