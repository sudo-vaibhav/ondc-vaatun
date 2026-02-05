import { z } from "zod";

/**
 * Labels for PED (Pre-Existing Disease) condition checkboxes.
 * Used for displaying human-readable labels in the UI.
 */
export const pedConditionLabels = {
  diabetes: "Diabetes",
  bloodPressure: "Blood Pressure / Hypertension",
  heartAilments: "Heart Ailments",
  asthma: "Asthma / Respiratory",
  thyroid: "Thyroid Disorders",
  cancer: "Cancer",
  other: "Other",
} as const;

/**
 * Schema for PED conditions object.
 * Each condition is a boolean checkbox.
 */
const conditionsSchema = z.object({
  diabetes: z.boolean().default(false),
  bloodPressure: z.boolean().default(false),
  heartAilments: z.boolean().default(false),
  asthma: z.boolean().default(false),
  thyroid: z.boolean().default(false),
  cancer: z.boolean().default(false),
  other: z.boolean().default(false),
});

/**
 * Zod schema for Pre-Existing Disease (PED) form step.
 *
 * Fields:
 * - hasPED: Whether the user has any pre-existing conditions
 * - conditions: Object with boolean fields for each condition type
 * - otherDescription: Required when conditions.other is true
 *
 * Uses refine() for conditional validation:
 * If conditions.other is true, otherDescription must have content.
 */
export const pedSchema = z
  .object({
    hasPED: z.boolean(),
    conditions: conditionsSchema.default({
      diabetes: false,
      bloodPressure: false,
      heartAilments: false,
      asthma: false,
      thyroid: false,
      cancer: false,
      other: false,
    }),
    otherDescription: z.string().optional(),
  })
  .refine(
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
    }
  );

export type PedData = z.infer<typeof pedSchema>;
