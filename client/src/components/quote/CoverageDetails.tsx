import { Banknote, Building2, Clock, Percent, Shield } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CoverageDetailsProps {
  item?: {
    tags?: Array<{
      descriptor?: { name?: string; code?: string };
      list?: Array<{
        descriptor?: { name?: string; code?: string };
        value?: string;
      }>;
    }>;
  };
}

// Coverage codes we want to display
const COVERAGE_CODES = [
  "COVERAGE_AMOUNT",
  "ROOM_RENT_CAP",
  "CO_PAYMENT",
  "CASHLESS_HOSPITALS",
  "WAITING_PERIOD",
  "CLAIM_SETTLEMENT_RATIO",
] as const;

type CoverageCode = (typeof COVERAGE_CODES)[number];

interface CoverageConfig {
  label: string;
  icon: ReactNode;
  format: (value: string) => string;
}

/**
 * Format currency value with L suffix for lakhs
 */
function formatLakhs(value: string): string {
  const num = Number.parseInt(value, 10);
  if (Number.isNaN(num)) return value;

  if (num >= 100000) {
    const lakhs = num / 100000;
    return `${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1)}L`;
  }
  return num.toLocaleString("en-IN");
}

/**
 * Coverage configuration map
 */
const COVERAGE_CONFIG: Record<CoverageCode, CoverageConfig> = {
  COVERAGE_AMOUNT: {
    label: "Sum Insured",
    icon: <Shield className="h-5 w-5 text-primary" />,
    format: (v) => `\u20B9${formatLakhs(v)}`,
  },
  ROOM_RENT_CAP: {
    label: "Room Rent",
    icon: <Banknote className="h-5 w-5 text-primary" />,
    format: (v) => `\u20B9${formatLakhs(v)}/day`,
  },
  CO_PAYMENT: {
    label: "Co-payment",
    icon: <Percent className="h-5 w-5 text-primary" />,
    format: (v) => `${v}%`,
  },
  CASHLESS_HOSPITALS: {
    label: "Network Hospitals",
    icon: <Building2 className="h-5 w-5 text-primary" />,
    format: (v) => {
      const num = Number.parseInt(v, 10);
      return `${num.toLocaleString("en-IN")}+ hospitals`;
    },
  },
  WAITING_PERIOD: {
    label: "Waiting Period",
    icon: <Clock className="h-5 w-5 text-primary" />,
    format: (v) => {
      // Value might be in days or months
      const num = Number.parseInt(v, 10);
      if (Number.isNaN(num)) return v;
      if (num === 0) return "None";
      if (num <= 30) return `${num} days`;
      if (num % 365 === 0) {
        const years = num / 365;
        return years === 1 ? "1 year" : `${years} years`;
      }
      if (num % 30 === 0) {
        const months = num / 30;
        return months === 1 ? "1 month" : `${months} months`;
      }
      return `${num} days`;
    },
  },
  CLAIM_SETTLEMENT_RATIO: {
    label: "Claim Ratio",
    icon: <Shield className="h-5 w-5 text-primary" />,
    format: (v) => {
      const num = Number.parseFloat(v);
      if (Number.isNaN(num)) return v;
      // If value is already a percentage (e.g., 98.5), show as-is
      // If value is a decimal (e.g., 0.985), convert to percentage
      const percentage = num > 1 ? num : num * 100;
      return `${percentage.toFixed(1)}%`;
    },
  },
};

interface CoverageItem {
  code: CoverageCode;
  value: string;
  config: CoverageConfig;
}

export function CoverageDetails({ item }: CoverageDetailsProps) {
  // Find GENERAL_INFO tags
  const generalInfoTags = item?.tags?.find(
    (t) => t.descriptor?.code === "GENERAL_INFO",
  );

  if (!generalInfoTags?.list || generalInfoTags.list.length === 0) {
    return null;
  }

  // Extract coverage items we want to display
  const coverageItems: CoverageItem[] = [];

  for (const tag of generalInfoTags.list) {
    const code = tag.descriptor?.code as CoverageCode | undefined;
    if (code && code in COVERAGE_CONFIG && tag.value) {
      coverageItems.push({
        code,
        value: tag.value,
        config: COVERAGE_CONFIG[code],
      });
    }
  }

  if (coverageItems.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Shield className="h-5 w-5 text-primary" />
          Coverage Details
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {coverageItems.map((item) => (
            <div
              key={item.code}
              className="flex items-center gap-3 rounded-lg border border-primary/10 bg-primary/5 p-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background">
                {item.config.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  {item.config.label}
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {item.config.format(item.value)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
