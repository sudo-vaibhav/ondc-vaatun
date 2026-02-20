---
phase: 01-sdk-foundation
plan: 01
subsystem: infra
tags: [opentelemetry, otlp, tracing, observability, signoz]

# Dependency graph
requires:
  - phase: none
    provides: First plan in project
provides:
  - OpenTelemetry SDK initialized with auto-instrumentation
  - OTLP HTTP exporter configured for SigNoz
  - Tracing module ready for import in server entry point
affects: [01-sdk-foundation, 02-http-tracing, 03-async-tracing, 04-manual-spans, 05-verification]

# Tech tracking
tech-stack:
  added:
    - "@opentelemetry/sdk-node@^0.211.0"
    - "@opentelemetry/api@^1.9.0"
    - "@opentelemetry/auto-instrumentations-node@^0.69.0"
    - "@opentelemetry/instrumentation@^0.211.0"
    - "@opentelemetry/exporter-trace-otlp-http@^0.211.0"
    - "@opentelemetry/semantic-conventions@^1.39.0"
  patterns:
    - "OTLP HTTP exporter for vendor-neutral trace export"
    - "16KB span attribute limit for large ONDC payloads"
    - "Disabled FS/DNS instrumentation to reduce noise"
    - "ioredis key name capture for debugging"
    - "Graceful SDK shutdown on SIGTERM"

key-files:
  created:
    - "server/src/tracing.ts"
  modified:
    - "server/package.json"
    - "pnpm-lock.yaml"
    - ".env.example"

key-decisions:
  - "Use HTTP exporter over gRPC for simplicity (fewer dependencies)"
  - "Set 16KB attribute limit to prevent span drops from large ONDC payloads"
  - "Disable FS and DNS instrumentation to reduce trace noise"
  - "Configure ioredis to capture key names for debugging"
  - "Use environment variables for OTLP endpoint and service name (defaults provided)"

patterns-established:
  - "Tracing module pattern: separate initialization file imported first in entry point"
  - "Auto-instrumentation over manual: let OpenTelemetry handle Express/HTTP/ioredis"
  - "Resource attributes: service.name, service.version, deployment.environment"
  - "OTLP exporter pattern: HTTP endpoint with headers for auth (prepared for cloud backends)"

# Metrics
duration: 1m
completed: 2026-02-09
---

# Phase 01 Plan 01: Install OpenTelemetry Packages and Create Tracing Module Summary

**OpenTelemetry SDK initialized with OTLP HTTP exporter, auto-instrumentation for Express/HTTP/ioredis, and 16KB payload limits for SigNoz tracing**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-09T08:07:12Z
- **Completed:** 2026-02-09T08:08:08Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Installed 6 OpenTelemetry packages for Node.js auto-instrumentation and OTLP export
- Created tracing.ts module with NodeSDK initialization, resource attributes, and graceful shutdown
- Documented optional OTEL environment variables in .env.example with sensible defaults
- Configured span attribute limit (16KB) to handle large ONDC payloads
- Disabled noisy FS/DNS instrumentation while enabling ioredis key name capture

## Task Commits

Each task was committed atomically:

1. **Task 1: Install OpenTelemetry packages** - `27526af` (chore)
2. **Task 2: Create tracing.ts module** - `3905510` (feat)
3. **Task 3: Add OpenTelemetry environment variables to .env.example** - `965a3c7` (docs)

## Files Created/Modified
- `server/src/tracing.ts` - OpenTelemetry SDK initialization with OTLP exporter, auto-instrumentations, and resource configuration
- `server/package.json` - Added 6 OpenTelemetry dependencies
- `pnpm-lock.yaml` - Lockfile updated with 132 new packages
- `.env.example` - Added OTEL_EXPORTER_OTLP_ENDPOINT and OTEL_SERVICE_NAME documentation

## Decisions Made

1. **HTTP exporter over gRPC**: Simpler integration, fewer dependencies, sufficient for our use case
2. **16KB span attribute limit**: Prevents span drops when capturing large ONDC payloads (search/select responses)
3. **Disabled FS/DNS instrumentation**: Reduces trace noise from file system and DNS operations
4. **ioredis key name capture**: Configured dbStatementSerializer to include Redis key names for debugging
5. **Optional environment variables**: Provided sensible defaults (localhost:4831, service name "ondc-bap") to work out of the box

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all packages installed successfully, tracing module created as specified, environment variables documented correctly.

## User Setup Required

None - no external service configuration required for this plan. Module is ready for import in server entry point (covered in plan 01-03).

**Note:** Users will need to run SigNoz before traces appear, but that's documented separately in plan 01-02.

## Next Phase Readiness

✅ **Ready for plan 01-02**: SigNoz setup documentation
✅ **Ready for plan 01-03**: Server entry point modification to import tracing.ts
✅ **Foundation complete**: All OpenTelemetry packages installed and SDK initialized

**No blockers**: Module is self-contained and doesn't affect existing server functionality until imported.

**Next steps**:
1. Plan 01-02: Document SigNoz Docker setup in README
2. Plan 01-03: Import tracing.ts as first import in server/src/index.ts
3. Verify traces appear in SigNoz after server starts

---
*Phase: 01-sdk-foundation*
*Completed: 2026-02-09*
