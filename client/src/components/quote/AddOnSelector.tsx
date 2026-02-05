import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface AddOn {
  id: string;
  descriptor?: { name?: string; code?: string };
  price?: { currency: string; value: string };
  quantity?: { selected?: { count: number } };
}

interface AddOnSelectorProps {
  addOns: AddOn[];
  onSelectionChange?: (selectedIds: string[], totalPrice: number) => void;
}

/**
 * Format currency value in Indian numbering system
 */
function formatCurrency(value: string, currency: string): string {
  const num = Number.parseFloat(value);
  if (Number.isNaN(num)) return value;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * AddOnSelector allows users to toggle add-ons on/off with dynamic price calculation.
 * All add-ons start unselected by default (per CONTEXT.md).
 */
export function AddOnSelector({
  addOns,
  onSelectionChange,
}: AddOnSelectorProps) {
  // All add-ons unselected by default (per CONTEXT.md)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Calculate total add-on price from selected IDs
  const totalAddOnPrice = useMemo(() => {
    let total = 0;
    for (const addOn of addOns) {
      if (selectedIds.has(addOn.id) && addOn.price?.value) {
        total += Number.parseFloat(addOn.price.value) || 0;
      }
    }
    return total;
  }, [selectedIds, addOns]);

  // Get currency from first add-on (assume all same currency)
  const currency = addOns[0]?.price?.currency || "INR";

  const handleToggle = (addOnId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(addOnId);
      } else {
        newSet.delete(addOnId);
      }

      // Calculate new total for callback
      let newTotal = 0;
      for (const addOn of addOns) {
        if (newSet.has(addOn.id) && addOn.price?.value) {
          newTotal += Number.parseFloat(addOn.price.value) || 0;
        }
      }

      // Notify parent of selection change
      onSelectionChange?.(Array.from(newSet), newTotal);

      return newSet;
    });
  };

  if (!addOns || addOns.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Plus className="h-5 w-5 text-primary" />
          Add-ons
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {addOns.map((addOn) => {
          const addOnName = addOn.descriptor?.name || addOn.id;
          const addOnPrice = addOn.price?.value
            ? formatCurrency(addOn.price.value, addOn.price.currency || "INR")
            : null;
          const isSelected = selectedIds.has(addOn.id);

          return (
            <div
              key={addOn.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-primary/10 bg-primary/5 p-3"
            >
              {/* Left side: Name and description */}
              <div className="flex-1 min-w-0">
                <Label
                  htmlFor={`addon-${addOn.id}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  {addOnName}
                </Label>
                {addOn.descriptor?.code && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {addOn.descriptor.code}
                  </p>
                )}
              </div>

              {/* Right side: Price and toggle */}
              <div className="flex items-center gap-3 shrink-0">
                {addOnPrice && (
                  <span className="text-sm font-semibold text-primary">
                    {addOnPrice}
                  </span>
                )}
                <Switch
                  id={`addon-${addOn.id}`}
                  checked={isSelected}
                  onCheckedChange={(checked) => handleToggle(addOn.id, checked)}
                />
              </div>
            </div>
          );
        })}

        {/* Total add-ons price when > 0 */}
        {totalAddOnPrice > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-primary/20">
            <span className="text-sm text-muted-foreground">
              Selected add-ons total
            </span>
            <span className="text-sm font-bold text-primary">
              {formatCurrency(totalAddOnPrice.toString(), currency)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
