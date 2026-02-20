import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import type { NomineeData } from "@/lib/form-schemas/nominee";
import { panDobSchema } from "@/lib/form-schemas/pan-dob";
import { personalInfoSchema } from "@/lib/form-schemas/personal-info";
import { generateSubmissionId } from "@/lib/submission-id";
import { ReviewPage } from "../review";
import { FormStep } from "./FormStep";
import {
  DateInput,
  NomineeInput,
  PANInput,
  type PEDConditionId,
  type PEDConditions,
  PEDSelector,
  PhoneInput,
} from "./fields";
import { MultiStepForm } from "./MultiStepForm";
import { ResumePrompt } from "./ResumePrompt";
import { StepProgress } from "./StepProgress";

// Define PED conditions schema inline (to avoid ZodEffects complexity from pedSchema.refine())
const conditionsSchema = z.object({
  diabetes: z.boolean(),
  bloodPressure: z.boolean(),
  heartAilments: z.boolean(),
  asthma: z.boolean(),
  thyroid: z.boolean(),
  cancer: z.boolean(),
  other: z.boolean(),
});

// Base schema without refinement for type inference
const baseKycSchema = z.object({
  ...personalInfoSchema.shape,
  ...panDobSchema.shape,
  hasPED: z.boolean(),
  conditions: conditionsSchema,
  otherDescription: z.string().optional(),
  nominees: z
    .array(
      z.object({
        firstName: z.string(),
        lastName: z.string(),
        dateOfBirth: z.string(),
        relationship: z.string(),
      }),
    )
    .max(2),
  termsAccepted: z.boolean(),
});

// Combined form data schema with refinement
const kycFormSchema = baseKycSchema.refine(
  (data) => {
    // If "other" is selected, description is required
    if (data.conditions.other) {
      return (
        data.otherDescription !== undefined &&
        data.otherDescription.trim().length > 0
      );
    }
    return true;
  },
  {
    message: "Please describe your condition",
    path: ["otherDescription"],
  },
);

// Use base schema for type inference to avoid ZodEffects complexity
type KYCFormData = z.infer<typeof baseKycSchema>;

const defaultValues: KYCFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  pincode: "",
  city: "",
  state: "",
  panNumber: "",
  dateOfBirth: "",
  hasPED: false,
  conditions: {
    diabetes: false,
    bloodPressure: false,
    heartAilments: false,
    asthma: false,
    thyroid: false,
    cancer: false,
    other: false,
  },
  otherDescription: "",
  nominees: [],
  termsAccepted: false,
};

const FORM_ID = "kyc-form";
const STEP_TITLES = [
  "Personal Information",
  "Identity Verification",
  "Health Information",
  "Nominee Details",
  "Review & Submit",
];

export interface KYCFormProps {
  onSubmit: (data: KYCFormData, submissionId: string) => void;
  className?: string;
  quote?: {
    price: { currency: string; value: string };
    breakup?: Array<{
      title: string;
      price: { currency: string; value: string };
      item?: { id: string; add_ons?: Array<{ id: string }> };
    }>;
    ttl?: string;
  };
}

export function KYCForm({ onSubmit, className, quote }: KYCFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [showNomineeForm, setShowNomineeForm] = useState(false);

  const { getStoredData, saveData, debouncedSave, clearData, hasStoredData } =
    useFormPersistence<KYCFormData>({
      formId: FORM_ID,
    });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
    trigger,
    reset,
  } = useForm<KYCFormData>({
    resolver: zodResolver(kycFormSchema),
    defaultValues,
    mode: "onBlur",
    reValidateMode: "onBlur",
  });

  // Check for stored data on mount
  useEffect(() => {
    if (hasStoredData()) {
      setShowResumePrompt(true);
    }
  }, [hasStoredData]);

  // Handle resume prompt
  const handleResume = useCallback(() => {
    const stored = getStoredData();
    if (stored) {
      reset(stored.formData);
      setCurrentStep(stored.currentStep);
    }
    setShowResumePrompt(false);
  }, [getStoredData, reset]);

  const handleStartFresh = useCallback(() => {
    clearData();
    reset(defaultValues);
    setShowResumePrompt(false);
  }, [clearData, reset]);

  // Debounced auto-save on every form change (catches mid-typing data)
  useEffect(() => {
    const subscription = watch((formValues) => {
      debouncedSave(formValues as KYCFormData, currentStep);
    });
    return () => subscription.unsubscribe();
  }, [watch, debouncedSave, currentStep]);

  // Immediate save on blur (for instant persistence when leaving a field)
  const handleFieldBlur = useCallback(() => {
    const currentData = getValues();
    saveData(currentData, currentStep);
  }, [getValues, saveData, currentStep]);

  // Step navigation
  const goToNextStep = useCallback(async () => {
    // Validate current step fields before proceeding
    const stepFields = getStepFields(currentStep);
    const isValid = await trigger(stepFields);

    if (isValid) {
      const nextStep = Math.min(currentStep + 1, 4);
      setCurrentStep(nextStep);
      saveData(getValues(), nextStep);
    }
  }, [currentStep, trigger, saveData, getValues]);

  const goToPrevStep = useCallback(() => {
    const prevStep = Math.max(currentStep - 1, 0);
    setCurrentStep(prevStep);
    saveData(getValues(), prevStep);
  }, [currentStep, saveData, getValues]);

  // Final submit
  const handleFinalSubmit = handleSubmit((data) => {
    const submissionId = generateSubmissionId();
    clearData(); // Clear persisted data on successful submit
    onSubmit(data, submissionId);
  });

  // Watch values with proper typing
  const phone = watch("phone");
  const panNumber = watch("panNumber");
  const dateOfBirth = watch("dateOfBirth");
  const hasPED = watch("hasPED");
  const conditions = watch("conditions");
  const otherDescription = watch("otherDescription");
  const nominees = watch("nominees") || [];
  const termsAccepted = watch("termsAccepted");

  // Nominee management handlers
  const addNominee = useCallback(() => {
    const current = getValues("nominees") || [];
    if (current.length < 2) {
      setValue("nominees", [
        ...current,
        { firstName: "", lastName: "", dateOfBirth: "", relationship: "" },
      ]);
      setShowNomineeForm(true);
    }
  }, [getValues, setValue]);

  const updateNominee = useCallback(
    (index: number, nominee: NomineeData) => {
      const current = getValues("nominees") || [];
      const updated = [...current];
      updated[index] = nominee;
      setValue("nominees", updated);
      saveData(getValues(), currentStep);
    },
    [getValues, setValue, saveData, currentStep],
  );

  const removeNominee = useCallback(
    (index: number) => {
      const current = getValues("nominees") || [];
      setValue(
        "nominees",
        current.filter((_, i) => i !== index),
      );
      saveData(getValues(), currentStep);
    },
    [getValues, setValue, saveData, currentStep],
  );

  // Navigate to specific step (for review edit links)
  const goToStep = useCallback(
    (step: number) => {
      setCurrentStep(step);
      saveData(getValues(), step);
    },
    [saveData, getValues],
  );

  // Section to step mapping for review edit navigation
  const sectionStepMap: Record<string, number> = {
    personal: 0,
    identity: 1,
    health: 2,
    nominee: 3,
  };

  return (
    <div className={className}>
      <ResumePrompt
        open={showResumePrompt}
        onResume={handleResume}
        onStartFresh={handleStartFresh}
      />

      <StepProgress
        currentStep={currentStep}
        totalSteps={5}
        stepTitles={STEP_TITLES}
        className="mb-8"
      />

      <form onSubmit={handleFinalSubmit}>
        <MultiStepForm currentStep={currentStep}>
          {/* Step 1: Personal Information */}
          <FormStep
            title="Personal Information"
            description="Tell us about yourself so we can personalize your insurance options."
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    {...register("firstName")}
                    onBlur={(e) => {
                      register("firstName").onBlur(e);
                      handleFieldBlur();
                    }}
                    aria-invalid={!!errors.firstName}
                  />
                  {errors.firstName && (
                    <p className="text-xs text-destructive">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    {...register("lastName")}
                    onBlur={(e) => {
                      register("lastName").onBlur(e);
                      handleFieldBlur();
                    }}
                    aria-invalid={!!errors.lastName}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  onBlur={(e) => {
                    register("email").onBlur(e);
                    handleFieldBlur();
                  }}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <PhoneInput
                id="phone"
                value={phone}
                onChange={(value) => setValue("phone", value)}
                onBlur={handleFieldBlur}
                error={errors.phone?.message}
              />

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  {...register("address")}
                  onBlur={(e) => {
                    register("address").onBlur(e);
                    handleFieldBlur();
                  }}
                  aria-invalid={!!errors.address}
                />
                {errors.address && (
                  <p className="text-xs text-destructive">
                    {errors.address.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    {...register("pincode")}
                    onBlur={(e) => {
                      register("pincode").onBlur(e);
                      handleFieldBlur();
                    }}
                    maxLength={6}
                    aria-invalid={!!errors.pincode}
                  />
                  {errors.pincode && (
                    <p className="text-xs text-destructive">
                      {errors.pincode.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    {...register("city")}
                    onBlur={(e) => {
                      register("city").onBlur(e);
                      handleFieldBlur();
                    }}
                    aria-invalid={!!errors.city}
                  />
                  {errors.city && (
                    <p className="text-xs text-destructive">
                      {errors.city.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    {...register("state")}
                    onBlur={(e) => {
                      register("state").onBlur(e);
                      handleFieldBlur();
                    }}
                    aria-invalid={!!errors.state}
                  />
                  {errors.state && (
                    <p className="text-xs text-destructive">
                      {errors.state.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </FormStep>

          {/* Step 2: PAN & DOB */}
          <FormStep
            title="Identity Verification"
            description="We need your PAN and date of birth for regulatory compliance."
          >
            <div className="space-y-4">
              <PANInput
                id="panNumber"
                value={panNumber}
                onChange={(value) => setValue("panNumber", value)}
                onBlur={handleFieldBlur}
                error={errors.panNumber?.message}
              />

              <DateInput
                id="dateOfBirth"
                value={dateOfBirth}
                onChange={(value) => setValue("dateOfBirth", value)}
                onBlur={handleFieldBlur}
                error={errors.dateOfBirth?.message}
              />
            </div>
          </FormStep>

          {/* Step 3: PED */}
          <FormStep
            title="Health Information"
            description="Let us know about any pre-existing conditions for accurate coverage."
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
                <input
                  type="checkbox"
                  id="hasPED"
                  {...register("hasPED")}
                  onChange={(e) => {
                    register("hasPED").onChange(e);
                    handleFieldBlur();
                  }}
                  className="w-4 h-4"
                />
                <Label htmlFor="hasPED" className="font-normal cursor-pointer">
                  I have pre-existing medical conditions
                </Label>
              </div>

              {hasPED && (
                <PEDSelector
                  conditions={conditions as PEDConditions}
                  onConditionChange={(id: PEDConditionId, checked: boolean) => {
                    setValue(`conditions.${id}`, checked);
                    handleFieldBlur();
                  }}
                  otherDescription={otherDescription || ""}
                  onOtherDescriptionChange={(value: string) => {
                    setValue("otherDescription", value);
                    handleFieldBlur();
                  }}
                  otherError={errors.otherDescription?.message}
                />
              )}
            </div>
          </FormStep>

          {/* Step 4: Nominee (prompt-but-skippable) */}
          <FormStep
            title="Nominee Details"
            description="Add beneficiaries for your policy (optional)"
          >
            <div className="space-y-6">
              {!showNomineeForm && nominees.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Would you like to add a nominee to your policy?
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button type="button" onClick={addNominee}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Nominee
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={goToNextStep}
                    >
                      Skip for Now
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {nominees.map((nominee, index) => (
                    <NomineeInput
                      key={`nominee-${index}`}
                      nominee={nominee}
                      index={index}
                      onUpdate={(updated) => updateNominee(index, updated)}
                      onRemove={() => removeNominee(index)}
                    />
                  ))}
                  {nominees.length < 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addNominee}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Another Nominee
                    </Button>
                  )}
                </div>
              )}
            </div>
          </FormStep>

          {/* Step 5: Review & Submit */}
          <FormStep
            title="Review & Submit"
            description="Verify your details before proceeding"
          >
            <ReviewPage
              formData={getValues()}
              quote={quote || { price: { currency: "INR", value: "0" } }}
              onEdit={(section) => goToStep(sectionStepMap[section])}
              onSubmit={() => {}}
              termsAccepted={termsAccepted}
              onTermsChange={(checked) => {
                setValue("termsAccepted", checked);
                saveData(getValues(), currentStep);
              }}
            />
          </FormStep>
        </MultiStepForm>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={goToPrevStep}
            disabled={currentStep === 0}
          >
            Previous
          </Button>

          {currentStep < 4 ? (
            <Button type="button" onClick={goToNextStep}>
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={!termsAccepted}>
              Submit
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

// Helper to get field names for each step (for validation)
function getStepFields(step: number): (keyof KYCFormData)[] {
  switch (step) {
    case 0:
      return [
        "firstName",
        "lastName",
        "email",
        "phone",
        "address",
        "pincode",
        "city",
        "state",
      ];
    case 1:
      return ["panNumber", "dateOfBirth"];
    case 2:
      return ["hasPED", "conditions", "otherDescription"];
    case 3:
      return ["nominees"];
    case 4:
      return ["termsAccepted"];
    default:
      return [];
  }
}

export type { KYCFormData };
