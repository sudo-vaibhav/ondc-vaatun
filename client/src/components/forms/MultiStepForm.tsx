import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type Direction = "forward" | "back";

const slideVariants = {
  initial: (direction: Direction) => ({
    x: direction === "forward" ? "100%" : "-100%",
    opacity: 0,
  }),
  animate: {
    x: "0%",
    opacity: 1,
  },
  exit: (direction: Direction) => ({
    x: direction === "forward" ? "-100%" : "100%",
    opacity: 0,
  }),
};

const slideTransition = {
  type: "spring" as const,
  damping: 25,
  stiffness: 300,
  mass: 0.8,
};

export interface MultiStepFormProps {
  children: ReactNode[]; // Array of step content (FormStep components)
  currentStep: number;
  className?: string;
}

export function MultiStepForm({
  children,
  currentStep,
  className,
}: MultiStepFormProps) {
  const [direction, setDirection] = useState<Direction>("forward");
  const [prevStep, setPrevStep] = useState(currentStep);

  // Track direction based on step changes
  if (currentStep !== prevStep) {
    setDirection(currentStep > prevStep ? "forward" : "back");
    setPrevStep(currentStep);
  }

  const steps = Array.isArray(children) ? children : [children];
  const currentChild = steps[currentStep];

  return (
    <div className={cn("overflow-hidden relative", className)}>
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          variants={slideVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={slideTransition}
        >
          {currentChild}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
