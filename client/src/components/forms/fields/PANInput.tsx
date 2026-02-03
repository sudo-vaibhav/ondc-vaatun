import { forwardRef, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPAN } from "@/lib/form-formatters";
import { cn } from "@/lib/utils";

export interface PANInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  label?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  onBlurFormat?: boolean; // Default true - format on blur
}

export const PANInput = forwardRef<HTMLInputElement, PANInputProps>(
  (
    {
      label = "PAN Number",
      error,
      value,
      onChange,
      onBlurFormat = true,
      className,
      ...props
    },
    ref,
  ) => {
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (onBlurFormat) {
        const formatted = formatPAN(e.target.value);
        onChange(formatted);
      }
      props.onBlur?.(e);
    };

    return (
      <div className={cn("space-y-2", className)}>
        <Label htmlFor={props.id}>{label}</Label>
        <Input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="ABCDE1234F"
          maxLength={10}
          aria-invalid={!!error}
          {...props}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  },
);
PANInput.displayName = "PANInput";
