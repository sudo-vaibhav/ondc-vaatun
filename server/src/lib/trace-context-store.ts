/**
 * Trace Context Store - Utilities for serializing and restoring W3C trace context
 *
 * Used for correlating async ONDC callbacks (on_search, on_select, etc.) with their
 * originating requests by storing and restoring trace context via Redis.
 */

import {
  context,
  propagation,
  trace,
  type SpanContext,
  type SpanOptions,
} from "@opentelemetry/api";

/**
 * Serializes the current active span's trace context to a W3C traceparent string.
 *
 * @returns W3C traceparent string if an active span exists, undefined otherwise
 *
 * @example
 * const traceparent = serializeTraceContext();
 * if (traceparent) {
 *   await redis.set(`trace:${transactionId}`, traceparent);
 * }
 */
export function serializeTraceContext(): string | undefined {
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  return carrier.traceparent;
}

/**
 * Restores a SpanContext from a stored W3C traceparent string.
 *
 * The returned SpanContext will have `isRemote: true` set automatically by the propagator,
 * indicating it represents a span from a different process/request.
 *
 * @param traceparent - W3C traceparent string (format: version-traceId-spanId-flags)
 * @returns SpanContext if traceparent is valid, undefined otherwise
 *
 * @example
 * const traceparent = await redis.get(`trace:${transactionId}`);
 * const spanContext = restoreTraceContext(traceparent);
 * if (spanContext) {
 *   const options = createLinkedSpanOptions(spanContext, { attributes: {...} });
 *   tracer.startActiveSpan("on_search", options, async (span) => {
 *     // callback handler logic
 *   });
 * }
 */
export function restoreTraceContext(
  traceparent: string | undefined,
): SpanContext | undefined {
  if (!traceparent) {
    return undefined;
  }

  const carrier = { traceparent };
  const extractedContext = propagation.extract(context.active(), carrier);
  const spanContext = trace.getSpanContext(extractedContext);

  return spanContext;
}

/**
 * Creates SpanOptions with a link to the original span for async callback correlation.
 *
 * This establishes a "link" relationship (not parent-child) because the original span
 * has already ended by the time the callback arrives. Links allow trace viewers to
 * navigate between related spans across async boundaries.
 *
 * @param originalSpanContext - SpanContext from the originating request (restored from Redis)
 * @param baseOptions - Base SpanOptions to merge with (attributes, kind, etc.)
 * @returns SpanOptions with links array populated
 *
 * @example
 * const options = createLinkedSpanOptions(spanContext, {
 *   attributes: {
 *     "ondc.action": "on_search",
 *     "ondc.bpp_id": bppId,
 *   },
 * });
 */
export function createLinkedSpanOptions(
  originalSpanContext: SpanContext | undefined,
  baseOptions: SpanOptions = {},
): SpanOptions {
  return {
    ...baseOptions,
    links: originalSpanContext
      ? [
          {
            context: originalSpanContext,
            attributes: {
              "link.type": "async_callback",
            },
          },
        ]
      : [],
  };
}
