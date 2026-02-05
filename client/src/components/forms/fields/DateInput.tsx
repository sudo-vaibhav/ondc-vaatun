import { forwardRef, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDOB } from "@/lib/form-formatters";
import { cn } from "@/lib/utils";

export interface DateInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  label?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  onBlurFormat?: boolean;
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      label = "Date of Birth",
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
        const formatted = formatDOB(e.target.value);
        onChange(formatted);
      }
      props.onBlur?.(e);
    };

    return (
      <div className={cn("space-y-2", className)}>
        <Label htmlFor={props.id}>{label}</Label>
        <Input
          ref={ref}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={handleBlur}
          aria-invalid={!!error}
          {...props}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  },
);
DateInput.displayName = "DateInput";
