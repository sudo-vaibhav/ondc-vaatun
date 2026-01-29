# Tech Debt Tracker

This folder tracks technical debt items identified in the ondc-vaatun codebase. Each item is documented with context, impact, and proposed solutions.

## Summary

| # | Item | Priority | Category | Effort |
|---|------|----------|----------|--------|
| 001 | [Signature Verification](./001-signature-verification.md) | Critical | Security | Medium |
| 002 | [Redis KEYS Performance](./002-redis-keys-performance.md) | High | Performance | Low |
| 003 | [Incomplete Transaction Flows](./003-incomplete-transaction-flows.md) | High | Feature Gap | High |
| 004 | [Hardcoded Configuration](./004-hardcoded-configuration.md) | High | Configuration | Medium |
| 005 | [Logging Improvements](./005-logging-improvements.md) | Medium | Operations | Medium |
| 006 | [Error Handling](./006-error-handling.md) | Medium | Code Quality | Medium |
| 007 | [Type Safety](./007-type-safety.md) | Medium | Code Quality | Medium |
| 008 | [Test Quality](./008-test-quality.md) | Medium | Testing | Medium |
| 009 | [Documentation Gaps](./009-documentation-gaps.md) | Low | Documentation | Low-Medium |
| 010 | [Configuration Gaps](./010-configuration-gaps.md) | Low | Configuration | Low |

## Priority Definitions

- **Critical**: Security vulnerability or data integrity risk. Fix immediately.
- **High**: Blocks scaling, causes production issues, or missing essential functionality.
- **Medium**: Impacts maintainability, developer experience, or code quality.
- **Low**: Nice-to-have improvements, cleanup, documentation.

## Effort Definitions

- **Low**: < 1 day of work
- **Medium**: 1-3 days of work
- **High**: 1+ week of work

## Recommended Order of Work

### Phase 1: Security & Stability
1. [001 - Signature Verification](./001-signature-verification.md) - Critical security gap
2. [002 - Redis KEYS Performance](./002-redis-keys-performance.md) - Production blocker

### Phase 2: Feature Completion
3. [003 - Incomplete Transaction Flows](./003-incomplete-transaction-flows.md) - Complete Beckn cycle
4. [004 - Hardcoded Configuration](./004-hardcoded-configuration.md) - Enable multi-tenant

### Phase 3: Code Quality
5. [006 - Error Handling](./006-error-handling.md) - Better debugging
6. [005 - Logging Improvements](./005-logging-improvements.md) - Operational visibility
7. [007 - Type Safety](./007-type-safety.md) - Reduce runtime errors

### Phase 4: Testing & Documentation
8. [008 - Test Quality](./008-test-quality.md) - Confidence in changes
9. [009 - Documentation Gaps](./009-documentation-gaps.md) - Onboarding
10. [010 - Configuration Gaps](./010-configuration-gaps.md) - Operational flexibility

## How to Use This Tracker

1. **Before starting work**: Review the relevant tech debt doc for context
2. **When completing**: Update the doc with implementation notes
3. **When discovering new debt**: Create a new numbered file following the template
4. **In PRs**: Reference tech debt items being addressed (e.g., "Addresses #001")

## Template for New Items

```markdown
# Tech Debt: [Title]

**Priority**: Critical | High | Medium | Low
**Category**: Security | Performance | Feature Gap | Code Quality | Testing | Documentation | Configuration
**Effort**: Low | Medium | High

## Problem

[Describe the issue]

## Affected Files

- `path/to/file.ts`

## Current Behavior

[Code example or description]

## Proposed Solution

[Implementation approach]

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
```
