import { Link } from "@tanstack/react-router";
import { ArrowLeft, Car, HeartPulse, RefreshCw, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SearchStatus } from "./useProductSearch";

interface ProductHeaderProps {
  productType: "health" | "motor";
  transactionId: string;
  status: SearchStatus;
  responseCount: number;
  onReconnect?: () => void;
}

const productConfig = {
  health: {
    title: "Health Insurance Plans",
    icon: HeartPulse,
    accentClass: "text-primary",
    badgeBg: "bg-primary/10",
  },
  motor: {
    title: "Motor Insurance Plans",
    icon: Car,
    accentClass: "text-blue-500",
    badgeBg: "bg-blue-500/10",
  },
};

function getStatusBadge(status: SearchStatus, responseCount: number) {
  switch (status) {
    case "connecting":
      return (
        <Badge variant="secondary" className="animate-pulse">
          <Wifi className="w-3 h-3 mr-1" />
          Connecting...
        </Badge>
      );
    case "streaming":
      return (
        <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30">
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          LIVE
        </Badge>
      );
    case "complete":
      return (
        <Badge variant="secondary">
          {responseCount} provider{responseCount !== 1 ? "s" : ""} responded
        </Badge>
      );
    case "error":
      return <Badge variant="destructive">Connection Error</Badge>;
  }
}

export function ProductHeader({
  productType,
  transactionId,
  status,
  responseCount,
  onReconnect,
}: ProductHeaderProps) {
  const config = productConfig[productType];
  const Icon = config.icon;

  return (
    <header className="sticky top-0 z-50 w-full border-b-2 border-foreground bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Left: Back button + Title */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back to home</span>
            </Link>
          </Button>

          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.badgeBg}`}>
              <Icon className={`h-5 w-5 ${config.accentClass}`} />
            </div>
            <div>
              <h1 className="text-lg font-bold">{config.title}</h1>
              <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px] md:max-w-none">
                {transactionId}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Status + Reconnect */}
        <div className="flex items-center gap-3">
          {getStatusBadge(status, responseCount)}

          {status === "error" && onReconnect && (
            <Button variant="outline" size="sm" onClick={onReconnect}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Reconnect
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
