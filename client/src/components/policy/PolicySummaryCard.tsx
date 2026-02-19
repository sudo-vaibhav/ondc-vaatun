import { Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentStatusBadge } from "./PaymentStatusBadge";

interface PolicySummaryCardProps {
  orderId: string;
  providerName?: string;
  productName?: string;
  coverageAmount?: string;
  premium?: string;
  paymentStatus?: string;
  validity?: string;
}

export function PolicySummaryCard({
  orderId,
  providerName,
  productName,
  coverageAmount,
  premium,
  paymentStatus,
  validity,
}: PolicySummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Policy Summary
          </CardTitle>
          {paymentStatus && <PaymentStatusBadge status={paymentStatus} />}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Provider</p>
            <p className="font-medium">{providerName || "-"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Product</p>
            <p className="font-medium">{productName || "-"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Coverage</p>
            <p className="font-medium">
              {coverageAmount ? `Rs. ${coverageAmount}` : "-"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Premium</p>
            <p className="font-medium">{premium ? `Rs. ${premium}` : "-"}</p>
          </div>
        </div>
        {validity && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">{validity}</p>
          </div>
        )}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Order ID: <span className="font-mono">{orderId}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
