import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const PED_CONDITIONS = [
  { id: "diabetes", label: "Diabetes" },
  { id: "bloodPressure", label: "Blood Pressure / Hypertension" },
  { id: "heartAilments", label: "Heart Ailments" },
  { id: "asthma", label: "Asthma / Respiratory" },
  { id: "thyroid", label: "Thyroid Disorders" },
  { id: "cancer", label: "Cancer" },
  { id: "other", label: "Other" },
] as const;

export type PEDConditionId = (typeof PED_CONDITIONS)[number]["id"];

export interface PEDConditions {
  diabetes: boolean;
  bloodPressure: boolean;
  heartAilments: boolean;
  asthma: boolean;
  thyroid: boolean;
  cancer: boolean;
  other: boolean;
}

export interface PEDSelectorProps {
  conditions: PEDConditions;
  onConditionChange: (id: PEDConditionId, checked: boolean) => void;
  otherDescription: string;
  onOtherDescriptionChange: (value: string) => void;
  error?: string;
  otherError?: string;
  className?: string;
}

export function PEDSelector({
  conditions,
  onConditionChange,
  otherDescription,
  onOtherDescriptionChange,
  error,
  otherError,
  className,
}: PEDSelectorProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <Label className="text-base font-medium">
        Pre-Existing Diseases (PED)
      </Label>
      <p className="text-sm text-muted-foreground">
        Select any conditions that apply to you
      </p>

      <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
        {PED_CONDITIONS.map(({ id, label }) => (
          <div key={id} className="flex items-center gap-3">
            <Checkbox
              id={`ped-${id}`}
              checked={conditions[id]}
              onCheckedChange={(checked) =>
                onConditionChange(id, checked === true)
              }
            />
            <Label htmlFor={`ped-${id}`} className="font-normal cursor-pointer">
              {label}
            </Label>
          </div>
        ))}

        {/* Other description field - expands when "Other" is checked */}
        <Collapsible open={conditions.other}>
          <CollapsibleContent className="pt-2">
            <div className="ml-7 space-y-2">
              <Input
                placeholder="Please describe your condition"
                value={otherDescription}
                onChange={(e) => onOtherDescriptionChange(e.target.value)}
                aria-invalid={!!otherError}
              />
              {otherError && (
                <p className="text-xs text-destructive">{otherError}</p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
