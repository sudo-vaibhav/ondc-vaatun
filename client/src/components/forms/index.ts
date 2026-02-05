// Core multi-step form components
export { MultiStepForm, type MultiStepFormProps } from "./MultiStepForm";
export { FormStep, type FormStepProps } from "./FormStep";
export { StepProgress, type StepProgressProps } from "./StepProgress";
export { ResumePrompt, type ResumePromptProps } from "./ResumePrompt";

// Complete KYC form
export { KYCForm, type KYCFormProps, type KYCFormData } from "./KYCForm";

// Field components (re-export from fields/)
export {
  PANInput,
  PhoneInput,
  DateInput,
  PEDSelector,
  PED_CONDITIONS,
  type PANInputProps,
  type PhoneInputProps,
  type DateInputProps,
  type PEDSelectorProps,
  type PEDConditions,
  type PEDConditionId,
} from "./fields";
