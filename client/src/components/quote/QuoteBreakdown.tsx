import { Clock, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface QuoteBreakup {
  title: string;
  price: {
    currency: string;
    value: string;
  };
  item?: {
    id: string;
    add_ons?: Array<{ id: string }>;
  };
}

interface Quote {
  id?: string;
  price: {
    currency: string;
    value: string;
  };
  breakup?: QuoteBreakup[];
  ttl?: string;
}

interface QuoteBreakdownProps {
  quote: Quote;
}

function formatCurrency(value: string, currency: string = "INR"): string {
  const num = Number.parseFloat(value);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatTitle(title: string): string {
  return title
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function parseTTL(ttl: string): string {
  // Parse ISO 8601 duration
  const dayMatch = ttl.match(/P(\d+)D/);
  if (dayMatch) {
    const days = Number.parseInt(dayMatch[1], 10);
    return `${days} day${days !== 1 ? "s" : ""}`;
  }
  const hourMatch = ttl.match(/PT(\d+)H/);
  if (hourMatch) {
    const hours = Number.parseInt(hourMatch[1], 10);
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  return ttl;
}

export default function QuoteBreakdown({ quote }: QuoteBreakdownProps) {
  const breakup = quote.breakup || [];
  const total = quote.price;
  const ttl = quote.ttl;

  // Separate base items from add-ons
  const baseItems = breakup.filter((b) => b.title !== "ADD_ONS");
  const addOnItems = breakup.filter((b) => b.title === "ADD_ONS");

  return (
    <Card className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Quote Breakdown
          </CardTitle>
          {ttl && (
            <Badge
              variant="outline"
              className="border-2 border-foreground flex items-center gap-1"
            >
              <Clock className="h-3 w-3" />
              Valid for {parseTTL(ttl)}
            </Badge>
          )}
        </div>
        {quote.id && (
          <p className="text-xs text-muted-foreground font-mono">
            ID: {quote.id}
          </p>
        )}
      </CardHeader>

      <CardContent>
        {/* Price Breakdown Table */}
        <div className="space-y-2">
          {baseItems.map((item) => (
            <div key={item.title} className="flex justify-between gap-3 py-1">
              <span className="text-sm text-muted-foreground min-w-0 break-words">
                {formatTitle(item.title)}
              </span>
              <span className="text-sm font-medium shrink-0">
                {formatCurrency(item.price.value, item.price.currency)}
              </span>
            </div>
          ))}

          {/* Add-ons section */}
          {addOnItems.length > 0 && (
            <>
              <Separator className="my-2" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Add-ons
              </p>
              {addOnItems.map((item) => (
                <div key={`${item.item?.id}`} className="flex justify-between gap-3 py-1 pl-4">
                  <span className="text-sm text-muted-foreground min-w-0 break-words">
                    {item.item?.add_ons?.map((a) => a.id).join(", ") ||
                      "Add-on"}
                  </span>
                  <span className="text-sm font-medium shrink-0">
                    {formatCurrency(item.price.value, item.price.currency)}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        <Separator className="my-4 border-foreground" />

        {/* Total */}
        <div className="flex justify-between items-end gap-3">
          <span className="text-base sm:text-lg font-bold">Total Premium</span>
          <span className="text-lg sm:text-xl font-bold text-primary shrink-0">
            {formatCurrency(total.value, total.currency)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
