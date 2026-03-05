import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export interface StepProgressProps {
  currentStep: number; // 0-indexed
  totalSteps: number;
  stepTitles?: string[]; // Optional labels for each step
  className?: string;
}

export function StepProgress({
  currentStep,
  totalSteps,
  stepTitles,
  className,
}: StepProgressProps) {
  return (
    <div
      className={cn("flex items-center justify-between gap-1 sm:gap-2", className)}
      role="progressbar"
      aria-valuenow={currentStep + 1}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`Step ${currentStep + 1} of ${totalSteps}${stepTitles?.[currentStep] ? `: ${stepTitles[currentStep]}` : ""}`}
    >
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isFuture = index > currentStep;

        return (
          <div key={index} className="flex items-center min-w-0">
            {/* Step circle */}
            <div
              className={cn(
                "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 font-semibold text-xs sm:text-sm transition-colors shrink-0",
                isCompleted &&
                  "bg-primary border-primary text-primary-foreground",
                isCurrent && "border-primary text-primary bg-primary/10",
                isFuture && "border-muted-foreground/30 text-muted-foreground",
              )}
            >
              {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
            </div>

            {/* Connector line (except for last step) */}
            {index < totalSteps - 1 && (
              <div
                className={cn(
                  "h-0.5 w-4 sm:w-8 md:w-12 mx-1 sm:mx-2 transition-colors",
                  index < currentStep ? "bg-primary" : "bg-muted",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
