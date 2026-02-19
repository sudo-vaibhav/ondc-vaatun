import { z } from "zod";

/**
 * Zod schema for PAN and Date of Birth form step.
 *
 * PAN Format: ABCDE1234F
 * - First 5 characters: uppercase letters (A-Z)
 * - Next 4 characters: digits (0-9)
 * - Last character: uppercase letter (A-Z)
 *
 * DOB: Required date string (validated at form level, formatted to YYYY-MM-DD)
 */
export const panDobSchema = z.object({
  panNumber: z
    .string()
    .length(10, "PAN must be exactly 10 characters")
    .regex(
      /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
      "Invalid PAN format (e.g., ABCDE1234F)",
    ),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
});

export type PanDobData = z.infer<typeof panDobSchema>;
