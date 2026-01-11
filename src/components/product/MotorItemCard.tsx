"use client";

import {
  ArrowRight,
  Car,
  Clock,
  Loader2,
  Shield,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ItemData, SelectionData } from "@/components/search/ItemCard";

interface MotorItemCardProps {
  item: ItemData;
  providerId: string;
  bppId: string;
  bppUri: string;
  onSelect?: (data: SelectionData) => void;
  isSelecting?: boolean;
}

// Motor-specific important tags
const MOTOR_TAGS = [
  "IDV",
  "NCB",
  "THIRD_PARTY_COVER",
  "OWN_DAMAGE_COVER",
  "PERSONAL_ACCIDENT_COVER",
  "ROADSIDE_ASSISTANCE",
  "ZERO_DEPRECIATION",
  "CASHLESS_GARAGES",
];

function formatMotorTagValue(code: string, value: string): string {
  if (code === "IDV" || code === "THIRD_PARTY_COVER" || code === "OWN_DAMAGE_COVER" || code === "PERSONAL_ACCIDENT_COVER") {
    const num = Number.parseInt(value, 10);
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(num % 100000 === 0 ? 0 : 1)}L`;
    }
    if (num >= 1000) {
      return `₹${(num / 1000).toFixed(0)}K`;
    }
    return `₹${num.toLocaleString("en-IN")}`;
  }
  if (code === "NCB") {
    return `${value}%`;
  }
  if (code === "CASHLESS_GARAGES") {
    return `${Number.parseInt(value, 10).toLocaleString()}+`;
  }
  if (code === "ZERO_DEPRECIATION" || code === "ROADSIDE_ASSISTANCE") {
    return value.toLowerCase() === "true" ? "Included" : "Not included";
  }
  return value;
}

function formatTagLabel(code: string): string {
  const labels: Record<string, string> = {
    IDV: "IDV",
    NCB: "NCB",
    THIRD_PARTY_COVER: "Third Party",
    OWN_DAMAGE_COVER: "Own Damage",
    PERSONAL_ACCIDENT_COVER: "PA Cover",
    ROADSIDE_ASSISTANCE: "RSA",
    ZERO_DEPRECIATION: "Zero Dep",
    CASHLESS_GARAGES: "Garages",
  };
  return labels[code] || code.split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");
}

function parseDuration(duration: string): string {
  const match = duration.match(/P(\d+)Y/);
  if (match) {
    const years = Number.parseInt(match[1], 10);
    return years === 1 ? "1 Year" : `${years} Years`;
  }
  return duration;
}

export function MotorItemCard({
  item,
  providerId,
  bppId,
  bppUri,
  onSelect,
  isSelecting = false,
}: MotorItemCardProps) {
  // Extract motor-specific tags
  const generalInfoTags = item.tags?.find(
    (t) => t.descriptor?.code === "GENERAL_INFO",
  );
  const displayTags =
    generalInfoTags?.list?.filter(
      (tag) =>
        tag.descriptor?.code && MOTOR_TAGS.includes(tag.descriptor.code),
    ) || [];

  const tenure = item.time?.duration ? parseDuration(item.time.duration) : null;
  const addOnsCount = item.add_ons?.length || 0;

  // Extract IDV for prominent display
  const idvTag = displayTags.find((t) => t.descriptor?.code === "IDV");
  const idvAmount = idvTag?.value
    ? formatMotorTagValue("IDV", idvTag.value)
    : null;

  // Check for NCB
  const ncbTag = displayTags.find((t) => t.descriptor?.code === "NCB");
  const ncbValue = ncbTag?.value ? `${ncbTag.value}% NCB` : null;

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
    <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 via-background to-cyan-500/5 shadow-[2px_2px_0px_0px] shadow-blue-500/20 hover:shadow-[4px_4px_0px_0px] hover:shadow-blue-500/30 transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Car className="h-4 w-4 text-blue-500" />
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
            {idvAmount && (
              <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 font-bold">
                IDV: {idvAmount}
              </Badge>
            )}
            {ncbValue && (
              <Badge className="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30">
                {ncbValue}
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
        {/* Motor Tags Grid */}
        {displayTags.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
            {displayTags
              .filter((t) => t.descriptor?.code !== "IDV" && t.descriptor?.code !== "NCB")
              .slice(0, 4)
              .map((tag) => (
                <div key={tag.descriptor?.code} className="text-xs">
                  <span className="text-muted-foreground">
                    {formatTagLabel(tag.descriptor?.code || "")}:
                  </span>
                  <span className="ml-1 font-medium text-blue-600 dark:text-blue-400">
                    {formatMotorTagValue(
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
            <Shield className="h-3 w-3 text-blue-500" />
            <span>
              {addOnsCount} add-on{addOnsCount > 1 ? "s" : ""} available
            </span>
          </div>
        )}

        {/* Cashless garages indicator */}
        {displayTags.some((t) => t.descriptor?.code === "CASHLESS_GARAGES") && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
            <Wrench className="h-3 w-3 text-blue-500" />
            <span>Cashless at network garages</span>
          </div>
        )}

        {/* Select Button - Motor themed */}
        <Button
          onClick={handleSelect}
          disabled={isSelecting}
          size="sm"
          className="w-full border-2 border-blue-600 text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-[2px_2px_0px_0px] shadow-blue-500/50 hover:shadow-[1px_1px_0px_0px] hover:shadow-blue-500/50 hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
        >
          {isSelecting ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Getting Motor Quote...
            </>
          ) : (
            <>
              Get Motor Quote
              <ArrowRight className="ml-1 h-3 w-3" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
