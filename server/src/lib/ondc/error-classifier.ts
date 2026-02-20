export type ErrorSource = "bap" | "bpp" | "gateway" | "network";

/**
 * Classifies the source of an error based on error properties, response status, and URL context.
 *
 * @param error - The error object thrown during the operation
 * @param response - The HTTP response object (if fetch succeeded)
 * @param url - The URL being requested (helps identify gateway/registry calls)
 * @returns ErrorSource indicating where the error originated
 *
 * Classification logic:
 * - network: No response + connection/timeout/DNS errors
 * - bpp: HTTP response with status >= 400
 * - gateway: URL contains /lookup or /subscribe, or error mentions gateway/registry
 * - bap: Default fallback (our own validation/code errors)
 */
export function classifyErrorSource(
  error: Error,
  response?: Response,
  url?: string,
): ErrorSource {
  // Network failures: fetch threw before getting a response
  if (!response) {
    const errorMessage = error.message || "";
    const errorCode = (error as Error & { code?: string }).code || "";

    // Common network error patterns
    if (
      errorCode === "ECONNREFUSED" ||
      errorCode === "ETIMEDOUT" ||
      errorCode === "ENOTFOUND" ||
      errorMessage.includes("DNS") ||
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ETIMEDOUT") ||
      errorMessage.includes("ENOTFOUND") ||
      error.name === "AbortError"
    ) {
      return "network";
    }
  }

  // BPP returned an HTTP error response
  if (response && response.status >= 400) {
    return "bpp";
  }

  // Gateway/registry operations (lookup, subscribe)
  if (url) {
    const urlLower = url.toLowerCase();
    if (urlLower.includes("/lookup") || urlLower.includes("/subscribe")) {
      return "gateway";
    }
  }

  // Error message mentions gateway or registry
  const errorMessage = error.message?.toLowerCase() || "";
  if (errorMessage.includes("gateway") || errorMessage.includes("registry")) {
    return "gateway";
  }

  // Default: BAP-side error (validation, our code)
  return "bap";
}
