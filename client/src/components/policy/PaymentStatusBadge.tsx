import { Badge } from "@/components/ui/badge";

interface PaymentStatusBadgeProps {
  status: string;
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const variant = status === "PAID" ? "default" : "secondary";
  const className =
    status === "PAID"
      ? "bg-green-100 text-green-800 hover:bg-green-100"
      : "bg-amber-100 text-amber-800 hover:bg-amber-100";

  return (
    <Badge variant={variant} className={className}>
      {status}
    </Badge>
  );
}
