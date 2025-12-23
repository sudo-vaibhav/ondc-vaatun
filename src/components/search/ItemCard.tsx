"use client";

import { ArrowRight, Clock, Loader2, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ItemTag {
  descriptor?: { name?: string; code?: string };
  value?: string;
  display?: boolean;
}

export interface ItemData {
  id: string;
  parent_item_id?: string;
  descriptor?: {
    name?: string;
    short_desc?: string;
    long_desc?: string;
    images?: Array<{ url: string; size_type?: string }>;
  };
  category_ids?: string[];
  tags?: Array<{
    descriptor?: { name?: string; code?: string };
    list?: ItemTag[];
  }>;
  xinput?: {
    form?: {
      id?: string;
      url?: string;
      mime_type?: string;
    };
    required?: boolean;
  };
  time?: {
    label?: string;
    duration?: string;
  };
  add_ons?: Array<{
    id: string;
    descriptor?: { name?: string; code?: string };
    price?: { currency?: string; value?: string };
  }>;
}

export interface SelectionData {
  itemId: string;
  parentItemId: string;
  providerId: string;
  bppId: string;
  bppUri: string;
}

interface ItemCardProps {
  item: ItemData;
  providerId: string;
  bppId: string;
  bppUri: string;
  onSelect?: (data: SelectionData) => void;
  isSelecting?: boolean;
}

// Important tags to display
const IMPORTANT_TAGS = [
  "COVERAGE_AMOUNT",
  "CO_PAYMENT",
  "CLAIM_SETTLEMENT_RATIO",
  "ROOM_RENT_CAP",
  "MATERNITY_COVERAGE",
  "CASHLESS_HOSPITALS",
  "PERSONAL_ACCIDENT_COVER",
];

function formatTagValue(code: string, value: string): string {
  if (
    code === "COVERAGE_AMOUNT" ||
    code === "ROOM_RENT_CAP" ||
    code === "PERSONAL_ACCIDENT_COVER"
  ) {
    const num = Number.parseInt(value, 10);
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(num % 100000 === 0 ? 0 : 1)}L`;
    }
    return `₹${num.toLocaleString("en-IN")}`;
  }
  if (code === "CLAIM_SETTLEMENT_RATIO") {
    return `${(Number.parseFloat(value) * 100).toFixed(0)}%`;
  }
  return value;
}

function formatTagLabel(code: string): string {
  return code
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function parseDuration(duration: string): string {
  // Parse ISO 8601 duration (e.g., P1Y = 1 Year)
  const match = duration.match(/P(\d+)Y/);
  if (match) {
    const years = Number.parseInt(match[1], 10);
    return years === 1 ? "1 Year" : `${years} Years`;
  }
  return duration;
}

export default function ItemCard({
  item,
  providerId,
  bppId,
  bppUri,
  onSelect,
  isSelecting = false,
}: ItemCardProps) {
  // Extract important tags from the first tag group (usually GENERAL_INFO)
  const generalInfoTags = item.tags?.find(
    (t) => t.descriptor?.code === "GENERAL_INFO",
  );
  const displayTags =
    generalInfoTags?.list?.filter(
      (tag) =>
        tag.descriptor?.code && IMPORTANT_TAGS.includes(tag.descriptor.code),
    ) || [];

  const tenure = item.time?.duration ? parseDuration(item.time.duration) : null;
  const addOnsCount = item.add_ons?.length || 0;

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
    <Card className="border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base font-semibold leading-tight">
              {item.descriptor?.name || item.id}
            </CardTitle>
            {item.descriptor?.short_desc && (
              <CardDescription className="text-xs mt-1 line-clamp-2">
                {item.descriptor.short_desc}
              </CardDescription>
            )}
          </div>
          {tenure && (
            <Badge
              variant="secondary"
              className="border border-foreground flex items-center gap-1 shrink-0"
            >
              <Clock className="h-3 w-3" />
              {tenure}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Tags Grid */}
        {displayTags.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {displayTags.slice(0, 6).map((tag) => (
              <div key={tag.descriptor?.code} className="text-xs">
                <span className="text-muted-foreground">
                  {formatTagLabel(tag.descriptor?.code || "")}:
                </span>
                <span className="ml-1 font-medium">
                  {formatTagValue(tag.descriptor?.code || "", tag.value || "")}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Add-ons indicator */}
        {addOnsCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
            <Shield className="h-3 w-3" />
            <span>
              {addOnsCount} add-on{addOnsCount > 1 ? "s" : ""} available
            </span>
          </div>
        )}

        {/* Select Button */}
        <Button
          onClick={handleSelect}
          disabled={isSelecting}
          size="sm"
          className="w-full border-2 border-foreground text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
        >
          {isSelecting ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Getting Quote...
            </>
          ) : (
            <>
              Get Quote
              <ArrowRight className="ml-1 h-3 w-3" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
