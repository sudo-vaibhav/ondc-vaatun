import type { ReactNode } from "react";

export interface FormStepProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function FormStep({ title, description, children }: FormStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}
