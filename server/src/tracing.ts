// server/src/tracing.ts
// OpenTelemetry SDK initialization - MUST be imported first in entry point
// Telemetry export is opt-in: set OTEL_EXPORTER_OTLP_ENDPOINT env var to enable.

import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { PinoInstrumentation } from "@opentelemetry/instrumentation-pino";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

// Configure resource attributes
const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "ondc-bap",
  [ATTR_SERVICE_VERSION]: "0.1.0",
  "deployment.environment": process.env.NODE_ENV || "development",
});

// Initialize SDK — exporters only created when endpoint is configured
const sdk = new NodeSDK({
  resource,
  traceExporter: otlpEndpoint
    ? new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` })
    : undefined,
  logRecordProcessor: otlpEndpoint
    ? new BatchLogRecordProcessor(
        new OTLPLogExporter({ url: `${otlpEndpoint}/v1/logs` }),
      )
    : undefined,
  spanLimits: {
    attributeValueLengthLimit: 16384, // 16KB for ONDC payloads
  },
  instrumentations: [
    getNodeAutoInstrumentations({
      // fs: generates a span for every file read/write/stat — extremely noisy
      // in a Node server (module resolution, config loading, etc.)
      "@opentelemetry/instrumentation-fs": { enabled: false },
      // dns: creates spans for every DNS lookup including internal resolution;
      // adds clutter without actionable insight for an HTTP-based service
      "@opentelemetry/instrumentation-dns": { enabled: false },
      // ioredis: default serializer captures full command args which can
      // include large ONDC payloads; we limit to command name + key only
      "@opentelemetry/instrumentation-ioredis": {
        dbStatementSerializer: (cmdName, cmdArgs) => {
          return `${cmdName} ${cmdArgs[0] || ""}`;
        },
      },
    }),
    // PinoInstrumentation injects trace_id/span_id into every pino log record
    // and forwards logs to the LogRecordProcessor (if configured above)
    new PinoInstrumentation(),
  ],
});

sdk.start();
console.log(
  `[OpenTelemetry] SDK initialized${otlpEndpoint ? ` — exporting to ${otlpEndpoint}` : " — no export (set OTEL_EXPORTER_OTLP_ENDPOINT to enable)"}`,
);

// Graceful shutdown on SIGTERM
process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => {
      console.log("[OpenTelemetry] SDK shut down successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("[OpenTelemetry] Error shutting down SDK", error);
      process.exit(1);
    });
});
