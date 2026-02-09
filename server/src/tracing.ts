// server/src/tracing.ts
// OpenTelemetry SDK initialization - MUST be imported first in entry point
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION
} from '@opentelemetry/semantic-conventions';

// Initialize OTLP exporter pointing to SigNoz
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4831/v1/traces',
  headers: {}, // Add auth headers if needed for cloud backends
});

// Configure resource attributes
const resource = new Resource({
  [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'ondc-bap',
  [ATTR_SERVICE_VERSION]: '0.1.0',
  'deployment.environment': process.env.NODE_ENV || 'development',
});

// Initialize SDK with auto-instrumentations
const sdk = new NodeSDK({
  resource,
  traceExporter,
  spanLimits: {
    attributeValueLengthLimit: 16384, // 16KB for ONDC payloads
  },
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable noisy instrumentations
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },

      // Configure ioredis to include key names
      '@opentelemetry/instrumentation-ioredis': {
        dbStatementSerializer: (cmdName, cmdArgs) => {
          return `${cmdName} ${cmdArgs[0] || ''}`;
        },
      },
    }),
  ],
});

// Start SDK
sdk.start();
console.log('[OpenTelemetry] SDK initialized');

// Graceful shutdown on SIGTERM
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => {
      console.log('[OpenTelemetry] SDK shut down successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[OpenTelemetry] Error shutting down SDK', error);
      process.exit(1);
    });
});
