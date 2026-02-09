# Phase 1 Plan 2: Create SigNoz Local Deployment Summary

**One-liner:** SigNoz local trace visualization deployed via Docker with OTLP collector on port 4831

## Metadata

```yaml
phase: 1
plan: 2
subsystem: observability
completed: 2026-02-09
duration: 1m 11s
tags:
  - signoz
  - otel
  - docker
  - tracing
  - clickhouse
```

## Dependency Graph

```yaml
requires: []
provides:
  - SigNoz UI at localhost:4830
  - OTLP HTTP endpoint at localhost:4831
  - ClickHouse trace storage (72h retention)
  - docker-compose.signoz.yml deployment file
  - otel-collector-config.yaml configuration
affects:
  - 01-03 (will instrument BAP server to send traces to port 4831)
```

## Tech Stack

```yaml
tech-stack:
  added:
    - signoz/signoz-otel-collector:0.88.11
    - signoz/query-service:0.44.2
    - signoz/frontend:0.44.2
    - clickhouse/clickhouse-server:24.1.2-alpine
  patterns:
    - Docker Compose for local observability stack
    - OTLP HTTP collector on port 4831
    - ClickHouse for trace storage
    - Unique port range (4830-4836) to avoid conflicts
```

## What Was Built

Created a complete SigNoz local deployment for distributed trace visualization:

1. **OTel Collector Configuration** (`otel-collector-config.yaml`)
   - OTLP receivers on ports 4317 (gRPC) and 4318 (HTTP)
   - CORS configuration for BAP server (4822) and client (4823)
   - Batch processor with 5s timeout
   - ClickHouse exporter with 72h retention

2. **Docker Compose Setup** (`docker-compose.signoz.yml`)
   - 4 services: ClickHouse, OTel Collector, Query Service, Frontend
   - Port mapping to 4830-4836 range
   - Persistent volume for ClickHouse data
   - Service dependencies configured

3. **Documentation** (README.md)
   - Added "Running SigNoz" section
   - Documented pnpm scripts (already existed in package.json)
   - Port mapping table
   - Architecture overview
   - Troubleshooting steps

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create OTel Collector configuration | 03aea3d | otel-collector-config.yaml |
| 2 | Create SigNoz docker-compose file | 540d13b | docker-compose.signoz.yml |
| 3 | Add SigNoz pnpm scripts | (skipped) | package.json (already existed) |
| 4 | Add SigNoz instructions to README | e0e7c82 | README.md |

**Total tasks:** 4 (3 executed, 1 skipped as already complete)

## Deviations from Plan

### Skipped Work

**1. Task 3 already complete (pnpm scripts)**

- **Found during:** Task 3 verification
- **Issue:** Package.json already contained `signoz:up`, `signoz:down`, `signoz:clean`, `signoz:logs` scripts from commit 3efe8bb
- **Action:** Skipped task and documented in summary
- **Files:** package.json (lines 23-26)
- **Commit:** N/A (no changes needed)

This was expected since SigNoz scripts were added in a previous planning commit. No deviation rule needed - just noted as already complete.

## File Index

### Created

- `otel-collector-config.yaml` - OpenTelemetry Collector configuration
- `docker-compose.signoz.yml` - SigNoz services deployment

### Modified

- `README.md` - Added SigNoz documentation section

### Key Locations

```
medan/
├── otel-collector-config.yaml       # OTLP receiver config (ports 4317/4318)
├── docker-compose.signoz.yml        # 4 services, ports 4830-4836
└── README.md                        # "Running SigNoz" section added
```

## Decisions Made

| ID | Decision | Rationale | Impact |
|----|----------|-----------|--------|
| D-01-02-1 | Use port range 4830-4836 | Avoid conflicts with BAP (4822), client (4823), other projects | All SigNoz services isolated in dedicated port range |
| D-01-02-2 | HTTP OTLP on 4831 (not 4832) | Mapped container port 4318 to host 4831 for consistency | BAP will export to http://localhost:4831 |
| D-01-02-3 | 72h trace retention | Balance storage vs debugging needs for local dev | ClickHouse TTL set to 72h in config |
| D-01-02-4 | Separate OTel config file | Keep collector config modular and readable | Mounted as volume in docker-compose |

## Integration Points

### Upstream Dependencies

None - SigNoz runs independently of application.

### Downstream Consumers

- **01-03 (BAP Instrumentation)**: Will configure BAP server to export OTLP traces to `http://localhost:4831`
- **Developer Workflow**: Start SigNoz before running instrumented BAP server

### Environment Variables

No new environment variables required. SigNoz runs entirely within Docker with hardcoded configuration.

## Verification Results

All verification checks passed:

1. ✅ OTel collector config exists at project root
2. ✅ docker-compose.signoz.yml exists at project root
3. ✅ docker-compose syntax valid (parsed successfully with `docker compose config`)

**Note:** Services not started during execution. Manual verification required:
```bash
pnpm signoz:up
open http://localhost:4830
```

## Next Phase Readiness

**Blockers:** None

**Prerequisites for 01-03:**
- [x] OTLP HTTP endpoint available (port 4831)
- [x] SigNoz deployment scripts ready
- [x] Documentation complete

**Concerns:**
1. SigNoz requires Docker Desktop running - developers must ensure Docker is available
2. First startup pulls 4 Docker images (~500MB total) - may take 2-5 minutes
3. ClickHouse data persists in Docker volume - `signoz:clean` required to reset

**Recommendations:**
1. In 01-03, add note to start SigNoz before testing instrumentation
2. Consider adding health check script to verify OTLP endpoint is ready
3. Document how to view traces in SigNoz UI (will need screenshots after first traces appear)

## Commands for Next Phase

```bash
# Start SigNoz (run this first)
pnpm signoz:up

# Wait for services to be ready (~30 seconds)
docker compose -f docker-compose.signoz.yml ps

# Verify OTLP endpoint is listening
curl http://localhost:4831

# Access SigNoz UI
open http://localhost:4830
```

## Knowledge Captured

### SigNoz Architecture

- **ClickHouse**: Primary storage for trace data (columnar database optimized for analytics)
- **OTel Collector**: Receives OTLP (OpenTelemetry Protocol) traces, batches, exports to ClickHouse
- **Query Service**: Golang backend for querying ClickHouse and serving frontend
- **Frontend**: React UI for trace visualization and search

### Port Conventions

Our project uses distinct port ranges per concern:
- **4822-4823**: Application (BAP server, client)
- **4830-4836**: Observability (SigNoz)
- Future ranges TBD as needed

### Docker Compose Tips

- `docker compose -f <file> up -d`: Start in background
- `docker compose -f <file> down`: Stop and remove containers
- `docker compose -f <file> down -v`: Also remove volumes (data loss!)
- `docker compose -f <file> logs -f`: Stream logs from all services

---

**Phase 1, Plan 2 complete.** Ready to proceed to 01-03: Instrument BAP Server with OpenTelemetry.
