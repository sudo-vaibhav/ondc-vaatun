# ONDC FIS13 Health Insurance Protocol Reference

**Source:** ONDC-Official/ONDC-FIS-Specifications
**Branch:** draft-FIS13-health-2.0.1
**Fetched:** 2026-02-05
**Domain Code:** ONDC:FIS13

## Directory Structure

- `schemas/build.yaml` - Full OpenAPI specification
- `examples/` - Request/response examples by endpoint:
  - `select/` - Select request examples
  - `on_select/` - Select callback examples
  - `init/` - Init request examples (buyer info, medical info)
  - `on_init/` - Init callback with payment URL
  - `confirm/` - Confirm request after payment
  - `on_confirm/` - Policy confirmation with order ID
  - `status/` - Status query request
  - `on_status/` - Policy status with documents

## Updating Specs

To refresh specs from upstream:
```bash
gh api "repos/ONDC-Official/ONDC-FIS-Specifications/contents/api/build/build.yaml?ref=draft-FIS13-health-2.0.1" --jq '.content' | base64 -d > docs/protocol/ondc/fis13/health/schemas/build.yaml
```

## Usage

Reference these YAML files for:
- Understanding expected request/response structures
- Debugging payload mismatches with BPPs
- Implementing new ONDC endpoints
