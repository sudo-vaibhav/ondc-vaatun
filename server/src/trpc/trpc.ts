import { SpanStatusCode, trace } from "@opentelemetry/api";
import { initTRPC } from "@trpc/server";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create();

const tracer = trace.getTracer("ondc-bap-trpc", "0.1.0");

const tracingMiddleware = t.middleware(async (opts) => {
  return tracer.startActiveSpan(
    `trpc.${opts.type}.${opts.path}`,
    async (span) => {
      try {
        span.setAttribute("trpc.procedure", opts.path);
        span.setAttribute("trpc.type", opts.type);

        const result = await opts.next();

        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        throw error;
      } finally {
        span.end();
      }
    },
  );
});

export const router = t.router;
export const publicProcedure = t.procedure.use(tracingMiddleware);
