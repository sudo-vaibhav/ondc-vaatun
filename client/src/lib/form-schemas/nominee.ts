import { z } from "zod";

/**
 * Relationship options for nominee dropdown.
 * Each entry has a value (used in API/storage) and label (displayed to user).
 */
export const NOMINEE_RELATIONSHIPS = [
  { value: "spouse", label: "Spouse" },
  { value: "son", label: "Son" },
  { value: "daughter", label: "Daughter" },
  { value: "father", label: "Father" },
  { value: "mother", label: "Mother" },
  { value: "other", label: "Other" },
] as const;

/**
 * Extract relationship values for Zod enum validation.
 */
const relationshipValues = NOMINEE_RELATIONSHIPS.map((r) => r.value) as [
  string,
  ...string[],
];

/**
 * Zod schema for a single nominee.
 *
 * Fields:
 * - firstName, lastName: Required text fields
 * - dateOfBirth: Must be in YYYY-MM-DD format
 * - relationship: Must be one of the predefined relationship types
 */
export const nomineeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  relationship: z.enum(relationshipValues, {
    message: "Please select a relationship",
  }),
});

/**
 * Zod schema for an array of nominees.
 * Maximum 2 nominees allowed per policy.
 */
export const nomineesSchema = z
  .array(nomineeSchema)
  .max(2, "Maximum 2 nominees allowed");

export type NomineeData = z.infer<typeof nomineeSchema>;
