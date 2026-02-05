/**
 * Form input formatters.
 *
 * These functions are applied on blur (when user leaves field),
 * not in real-time (per CONTEXT.md). This avoids cursor position
 * issues and provides a better UX.
 */

/**
 * Format PAN to uppercase, remove non-alphanumeric, max 10 chars.
 * Applied on blur, not real-time (per CONTEXT.md).
 *
 * @example formatPAN("abcde 1234f") => "ABCDE1234F"
 */
export function formatPAN(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
}

/**
 * Format phone to digits only, max 10 chars.
 * Applied on blur, not real-time (per CONTEXT.md).
 *
 * @example formatPhone("98765-43210") => "9876543210"
 */
export function formatPhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

/**
 * Format DOB to YYYY-MM-DD (ISO format).
 * If already in format, returns as-is.
 * Applied on blur, not real-time (per CONTEXT.md).
 *
 * @example formatDOB("2024-01-15") => "2024-01-15"
 * @example formatDOB("Jan 15, 2024") => "2024-01-15"
 */
export function formatDOB(value: string): string {
  // Already in ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  // Try to parse and format
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toISOString().split("T")[0];
}

/**
 * Format pincode to digits only, max 6 chars.
 *
 * @example formatPincode("110 001") => "110001"
 */
export function formatPincode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}
