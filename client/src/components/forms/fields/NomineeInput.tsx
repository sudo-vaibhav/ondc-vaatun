import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  NOMINEE_RELATIONSHIPS,
  type NomineeData,
} from "@/lib/form-schemas/nominee";
import { cn } from "@/lib/utils";
import { DateInput } from "./DateInput";

export interface NomineeInputProps {
  /** The nominee object to edit */
  nominee: NomineeData;
  /** 0-based index for labeling "Nominee 1", "Nominee 2" */
  index: number;
  /** Called when any field in the nominee changes */
  onUpdate: (nominee: NomineeData) => void;
  /** Called when remove button is clicked */
  onRemove: () => void;
  /** Field-level error messages */
  errors?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    relationship?: string;
  };
  /** Additional className for the container */
  className?: string;
}

/**
 * Single nominee entry component with all fields.
 * Renders first name, last name, DOB, and relationship dropdown.
 * First nominee (index 0) cannot be removed.
 */
export function NomineeInput({
  nominee,
  index,
  onUpdate,
  onRemove,
  errors,
  className,
}: NomineeInputProps) {
  const updateField = <K extends keyof NomineeData>(
    field: K,
    value: NomineeData[K],
  ) => {
    onUpdate({ ...nominee, [field]: value });
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 space-y-4",
        className,
      )}
    >
      {/* Header with title and remove button */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Nominee {index + 1}</h4>
        {index > 0 && (
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
            aria-label={`Remove nominee ${index + 1}`}
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      {/* Name fields - 2 columns on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`nominee-${index}-firstName`}>First Name</Label>
          <Input
            id={`nominee-${index}-firstName`}
            type="text"
            value={nominee.firstName}
            onChange={(e) => updateField("firstName", e.target.value)}
            aria-invalid={!!errors?.firstName}
            placeholder="First name"
          />
          {errors?.firstName && (
            <p className="text-xs text-destructive">{errors.firstName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`nominee-${index}-lastName`}>Last Name</Label>
          <Input
            id={`nominee-${index}-lastName`}
            type="text"
            value={nominee.lastName}
            onChange={(e) => updateField("lastName", e.target.value)}
            aria-invalid={!!errors?.lastName}
            placeholder="Last name"
          />
          {errors?.lastName && (
            <p className="text-xs text-destructive">{errors.lastName}</p>
          )}
        </div>
      </div>

      {/* Date of Birth - full width */}
      <DateInput
        id={`nominee-${index}-dateOfBirth`}
        label="Date of Birth"
        value={nominee.dateOfBirth}
        onChange={(value) => updateField("dateOfBirth", value)}
        error={errors?.dateOfBirth}
      />

      {/* Relationship dropdown - full width */}
      <div className="space-y-2">
        <Label htmlFor={`nominee-${index}-relationship`}>Relationship</Label>
        <Select
          value={nominee.relationship}
          onValueChange={(value) =>
            updateField("relationship", value as NomineeData["relationship"])
          }
        >
          <SelectTrigger
            id={`nominee-${index}-relationship`}
            className="w-full"
            aria-invalid={!!errors?.relationship}
          >
            <SelectValue placeholder="Select relationship" />
          </SelectTrigger>
          <SelectContent>
            {NOMINEE_RELATIONSHIPS.map((rel) => (
              <SelectItem key={rel.value} value={rel.value}>
                {rel.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.relationship && (
          <p className="text-xs text-destructive">{errors.relationship}</p>
        )}
      </div>
    </div>
  );
}
