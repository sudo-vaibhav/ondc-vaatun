import {
  ArrowRight,
  Building2,
  Clock,
  HeartPulse,
  Loader2,
  Shield,
} from "lucide-react";
import type { ItemData, SelectionData } from "@/components/search/ItemCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface HealthItemCardProps {
  item: ItemData;
  providerId: string;
  bppId: string;
  bppUri: string;
  onSelect?: (data: SelectionData) => void;
  isSelecting?: boolean;
}

// Health-specific important tags
const HEALTH_TAGS = [
  "COVERAGE_AMOUNT",
  "CLAIM_SETTLEMENT_RATIO",
  "CASHLESS_HOSPITALS",
  "CO_PAYMENT",
  "ROOM_RENT_CAP",
  "MATERNITY_COVERAGE",
];

function formatHealthTagValue(code: string, value: string): string {
  if (code === "COVERAGE_AMOUNT" || code === "ROOM_RENT_CAP") {
    const num = Number.parseInt(value, 10);
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(num % 100000 === 0 ? 0 : 1)}L`;
    }
    return `₹${num.toLocaleString("en-IN")}`;
  }
  if (code === "CLAIM_SETTLEMENT_RATIO") {
    return `${(Number.parseFloat(value) * 100).toFixed(0)}%`;
  }
  if (code === "CASHLESS_HOSPITALS") {
    return `${Number.parseInt(value, 10).toLocaleString()}+`;
  }
  if (code === "CO_PAYMENT") {
    return `${value}%`;
  }
  if (code === "MATERNITY_COVERAGE") {
    return value.toLowerCase() === "true" ? "Yes" : "No";
  }
  return value;
}

function formatTagLabel(code: string): string {
  const labels: Record<string, string> = {
    COVERAGE_AMOUNT: "Coverage",
    CLAIM_SETTLEMENT_RATIO: "Claim Ratio",
    CASHLESS_HOSPITALS: "Hospitals",
    CO_PAYMENT: "Co-payment",
    ROOM_RENT_CAP: "Room Rent Cap",
    MATERNITY_COVERAGE: "Maternity",
  };
  return (
    labels[code] ||
    code
      .split("_")
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ")
  );
}

function parseDuration(duration: string): string {
  const match = duration.match(/P(\d+)Y/);
  if (match) {
    const years = Number.parseInt(match[1], 10);
    return years === 1 ? "1 Year" : `${years} Years`;
  }
  return duration;
}

export function HealthItemCard({
  item,
  providerId,
  bppId,
  bppUri,
  onSelect,
  isSelecting = false,
}: HealthItemCardProps) {
  // Extract health-specific tags
  const generalInfoTags = item.tags?.find(
    (t) => t.descriptor?.code === "GENERAL_INFO",
  );
  const displayTags =
    generalInfoTags?.list?.filter(
      (tag) =>
        tag.descriptor?.code && HEALTH_TAGS.includes(tag.descriptor.code),
    ) || [];

  const tenure = item.time?.duration ? parseDuration(item.time.duration) : null;
  const addOnsCount = item.add_ons?.length || 0;

  // Extract coverage amount for prominent display
  const coverageTag = displayTags.find(
    (t) => t.descriptor?.code === "COVERAGE_AMOUNT",
  );
  const coverageAmount = coverageTag?.value
    ? formatHealthTagValue("COVERAGE_AMOUNT", coverageTag.value)
    : null;

  const handleSelect = () => {
    if (onSelect) {
      onSelect({
        itemId: item.id,
        parentItemId: item.parent_item_id || item.id,
        providerId,
        bppId,
        bppUri,
      });
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background shadow-[2px_2px_0px_0px] shadow-primary/20 hover:shadow-[4px_4px_0px_0px] hover:shadow-primary/30 transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <HeartPulse className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold leading-tight">
                {item.descriptor?.name || item.id}
              </CardTitle>
            </div>
            {item.descriptor?.short_desc && (
              <CardDescription className="text-xs mt-1 line-clamp-2">
                {item.descriptor.short_desc}
              </CardDescription>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            {coverageAmount && (
              <Badge className="bg-primary/10 text-primary border-primary/30 font-bold">
                {coverageAmount}
              </Badge>
            )}
            {tenure && (
              <Badge
                variant="secondary"
                className="border border-foreground/20 flex items-center gap-1"
              >
                <Clock className="h-3 w-3" />
                {tenure}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Health Tags Grid */}
        {displayTags.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
            {displayTags
              .filter((t) => t.descriptor?.code !== "COVERAGE_AMOUNT")
              .slice(0, 4)
              .map((tag) => (
                <div key={tag.descriptor?.code} className="text-xs">
                  <span className="text-muted-foreground">
                    {formatTagLabel(tag.descriptor?.code || "")}:
                  </span>
                  <span className="ml-1 font-medium text-primary">
                    {formatHealthTagValue(
                      tag.descriptor?.code || "",
                      tag.value || "",
                    )}
                  </span>
                </div>
              ))}
          </div>
        )}

        {/* Add-ons indicator */}
        {addOnsCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
            <Shield className="h-3 w-3 text-primary" />
            <span>
              {addOnsCount} add-on{addOnsCount > 1 ? "s" : ""} available
            </span>
          </div>
        )}

        {/* Cashless hospitals badge */}
        {displayTags.some(
          (t) => t.descriptor?.code === "CASHLESS_HOSPITALS",
        ) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
            <Building2 className="h-3 w-3 text-primary" />
            <span>Cashless at network hospitals</span>
          </div>
        )}

        {/* Select Button - Health themed */}
        <Button
          onClick={handleSelect}
          disabled={isSelecting}
          size="sm"
          className="w-full border-2 border-primary text-xs bg-primary hover:bg-primary/90 shadow-[2px_2px_0px_0px] shadow-primary/50 hover:shadow-[1px_1px_0px_0px] hover:shadow-primary/50 hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
        >
          {isSelecting ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Getting Health Quote...
            </>
          ) : (
            <>
              Get Health Quote
              <ArrowRight className="ml-1 h-3 w-3" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
