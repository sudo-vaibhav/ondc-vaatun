/**
 * Validity Date Utilities
 *
 * Parses ISO 8601 durations and formats validity date ranges.
 */

/**
 * Calculate end date from start date and ISO 8601 duration
 * @param startDate - Start date
 * @param duration - ISO 8601 duration (e.g., "P1Y", "P6M", "P30D")
 */
export function calculateValidityEnd(startDate: Date, duration: string): Date {
  const result = new Date(startDate);

  // Parse ISO 8601 duration: P[n]Y[n]M[n]D
  const yearMatch = duration.match(/(\d+)Y/);
  const monthMatch = duration.match(/(\d+)M/);
  const dayMatch = duration.match(/(\d+)D/);

  if (yearMatch) {
    result.setFullYear(result.getFullYear() + parseInt(yearMatch[1], 10));
  }
  if (monthMatch) {
    result.setMonth(result.getMonth() + parseInt(monthMatch[1], 10));
  }
  if (dayMatch) {
    result.setDate(result.getDate() + parseInt(dayMatch[1], 10));
  }

  return result;
}

/**
 * Format validity range as "Valid: Jan 1, 2026 - Dec 31, 2026"
 */
export function formatValidity(startDate: Date, endDate: Date): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `Valid: ${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}

/**
 * Parse validity from ONDC time object
 * @param time - ONDC time object with range.start and duration
 */
export function parseValidity(time?: {
  range?: { start?: string; end?: string };
  duration?: string;
}): { validFrom: Date | null; validTo: Date | null; formatted: string | null } {
  if (!time?.range?.start) {
    return { validFrom: null, validTo: null, formatted: null };
  }

  const validFrom = new Date(time.range.start);

  // If end is provided, use it; otherwise calculate from duration
  let validTo: Date;
  if (time.range.end) {
    validTo = new Date(time.range.end);
  } else if (time.duration) {
    validTo = calculateValidityEnd(validFrom, time.duration);
  } else {
    // Default to 1 year
    validTo = calculateValidityEnd(validFrom, "P1Y");
  }

  return {
    validFrom,
    validTo,
    formatted: formatValidity(validFrom, validTo),
  };
}
