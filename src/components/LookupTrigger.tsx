"use client";

import { Database, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createLookupPayload } from "@/app/api/ondc/lookup/payload";

type SubscriberDetails = {
  subscriber_id: string;
  country?: string;
  city?: string;
  domain: string;
  signing_public_key: string;
  encr_public_key: string;
  valid_from: string;
  valid_until: string;
  status?: string;
  created?: string;
  updated?: string;
};

export default function LookupTrigger() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [responseData, setResponseData] = useState<{
    request: unknown;
    response: SubscriberDetails[] | { error: string; details?: unknown };
  } | null>(null);

  const handleTrigger = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/ondc/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      setResponseData({
        request: {"mock_payload": true},
        response: data,
      });
      setIsDialogOpen(true);
    } catch (error) {
      console.error("[LookupTrigger] Error:", error);
      setResponseData({
        request: {"mock_payload": true},
        response: {
          error: "Failed to connect to the lookup endpoint",
          details:
            error instanceof Error ? error.message : "Unknown error occurred",
        },
      });
      setIsDialogOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleTrigger}
        disabled={isLoading}
        className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px]"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Looking up...
          </>
        ) : (
          <>
            <Database className="mr-2 h-4 w-4" />
            Lookup Subscribers
          </>
        )}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          <DialogHeader>
            <DialogTitle>Registry Lookup Response</DialogTitle>
            <DialogDescription>
              Request and response from the ONDC registry lookup endpoint
            </DialogDescription>
          </DialogHeader>

          {responseData && (
            <div className="space-y-4">
              <div>
                <h4 className="mb-2 font-semibold text-sm">Request:</h4>
                <pre className="overflow-x-auto rounded border-2 border-foreground bg-muted p-3 text-xs">
                  {JSON.stringify(responseData.request, null, 2)}
                </pre>
              </div>

              <div>
                <h4 className="mb-2 font-semibold text-sm">Response:</h4>
                <pre className="overflow-x-auto rounded border-2 border-foreground bg-muted p-3 text-xs">
                  {JSON.stringify(responseData.response, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
