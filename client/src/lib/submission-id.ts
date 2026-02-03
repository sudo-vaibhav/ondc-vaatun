/**
 * Generate a unique submission ID for ONDC protocol compliance.
 * Uses crypto.randomUUID() for browser-native UUID v4 generation.
 *
 * Format: UUID v4 (e.g., "550e8400-e29b-41d4-a716-446655440000")
 */
export function generateSubmissionId(): string {
  // crypto.randomUUID() is available in all modern browsers (Chrome 92+, Firefox 95+, Safari 15.4+)
  // and Node.js 19+
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older environments (unlikely in modern browsers)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Validate that a string is a valid UUID v4 format
 */
export function isValidSubmissionId(id: string): boolean {
  const uuidV4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(id);
}
