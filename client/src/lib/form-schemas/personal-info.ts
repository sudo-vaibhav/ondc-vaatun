import { z } from "zod";

/**
 * Zod schema for personal information form step.
 *
 * Fields:
 * - firstName, lastName: Required text fields
 * - email: Must be valid email format
 * - phone: Indian mobile number (10 digits starting with 6-9)
 * - address, city, state: Required text fields
 * - pincode: Must be exactly 6 digits
 */
export const personalInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid 10-digit mobile number"),
  address: z.string().min(1, "Address is required"),
  pincode: z
    .string()
    .length(6, "Pincode must be 6 digits")
    .regex(/^\d{6}$/, "Pincode must be 6 digits"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
});

export type PersonalInfoData = z.infer<typeof personalInfoSchema>;
