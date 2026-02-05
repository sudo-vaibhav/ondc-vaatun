import { Check, Copy, Loader2, Play, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ApiTriggerProps {
  title: string;
  description?: string;
  endpoint: string;
  method: "GET" | "POST";
  payload?: object;
}

export function ApiTrigger({
  title,
  description,
  endpoint,
  method,
  payload = {},
}: ApiTriggerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleTrigger = async () => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: { "Content-Type": "application/json" },
      };

      if (method === "POST") {
        fetchOptions.body = JSON.stringify(payload);
      }

      const res = await fetch(endpoint, fetchOptions);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || `HTTP ${res.status}`);
      }

      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`[ApiTrigger] ${title} error:`, err);
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!response) return;
    await navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setResponse(null);
    setError(null);
  };

  return (
    <Card className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge
              variant={method === "POST" ? "default" : "secondary"}
              className="border-2 border-foreground font-mono"
            >
              {method}
            </Badge>
            <code className="text-sm font-semibold">{endpoint}</code>
          </div>
        </div>
        <CardTitle className="mt-2">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payload Preview */}
        {method === "POST" && Object.keys(payload).length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
              Payload:
            </h4>
            <pre className="overflow-x-auto rounded border-2 border-foreground bg-muted p-3 text-xs">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleTrigger}
            disabled={isLoading}
            className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run
              </>
            )}
          </Button>

          {(response || error) && (
            <Button
              variant="outline"
              onClick={handleReset}
              className="border-2 border-foreground"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded border-2 border-destructive bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Response Display */}
        {response && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground">
                Response:
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 px-2"
              >
                {copied ? (
                  <>
                    <Check className="mr-1 h-3 w-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1 h-3 w-3" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <pre className="max-h-96 overflow-auto rounded border-2 border-foreground bg-muted p-3 text-xs">
              {response}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
