import { Clock, HeartPulse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface QuoteHeaderProps {
  provider?: {
    id: string;
    descriptor?: {
      name?: string;
      short_desc?: string;
      images?: Array<{ url: string; size_type?: string }>;
    };
  };
  quote?: {
    price: { currency: string; value: string };
    ttl?: string;
  };
}

/**
 * Format currency value in Indian numbering system (lakhs/crores)
 */
function formatCurrency(value: string, currency: string): string {
  const num = Number.parseFloat(value);
  if (Number.isNaN(num)) return value;

  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);

  return formatted;
}

/**
 * Parse ISO 8601 duration (e.g., "PT1H" for 1 hour, "P1D" for 1 day)
 */
function parseQuoteTTL(ttl?: string): string | null {
  if (!ttl) return null;

  // Match patterns like PT30M (30 minutes), PT1H (1 hour), P1D (1 day)
  const hourMatch = ttl.match(/PT(\d+)H/);
  const minuteMatch = ttl.match(/PT(\d+)M/);
  const dayMatch = ttl.match(/P(\d+)D/);

  if (hourMatch) {
    const hours = Number.parseInt(hourMatch[1], 10);
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  if (minuteMatch) {
    const minutes = Number.parseInt(minuteMatch[1], 10);
    return minutes === 1 ? "1 min" : `${minutes} mins`;
  }
  if (dayMatch) {
    const days = Number.parseInt(dayMatch[1], 10);
    return days === 1 ? "1 day" : `${days} days`;
  }

  return null;
}

export function QuoteHeader({ provider, quote }: QuoteHeaderProps) {
  const providerName = provider?.descriptor?.name || "Insurance Provider";
  const providerDesc = provider?.descriptor?.short_desc;
  const logoUrl = provider?.descriptor?.images?.[0]?.url;
  const quoteTTL = parseQuoteTTL(quote?.ttl);

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shadow-[4px_4px_0px_0px] shadow-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          {/* Provider Logo */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border-2 border-primary/20 bg-white p-2">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={providerName}
                className="h-full w-full object-contain"
                onError={(e) => {
                  // Fallback to icon on image load error
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling?.classList.remove(
                    "hidden",
                  );
                }}
              />
            ) : null}
            <HeartPulse
              className={`h-8 w-8 text-primary ${logoUrl ? "hidden" : ""}`}
            />
          </div>

          {/* Provider Info */}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-bold">{providerName}</CardTitle>
            {providerDesc && (
              <CardDescription className="mt-1 line-clamp-2 text-sm">
                {providerDesc}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Premium Display - Prominent */}
        {quote?.price && (
          <div className="flex flex-col gap-3 rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Premium
                </p>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(quote.price.value, quote.price.currency)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">per year</p>
              </div>

              {/* Quote Validity Badge */}
              {quoteTTL && (
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 border border-foreground/20"
                >
                  <Clock className="h-3 w-3" />
                  <span>Valid for {quoteTTL}</span>
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
