# ONDC Vaatun Documentation

Welcome to the ONDC Vaatun documentation. This directory contains comprehensive guides for understanding and working with the codebase.

## Documentation Index

### Architecture
- **[Tenant Architecture](./TENANT_ARCHITECTURE.md)** - Comprehensive guide to the Tenant entity system for credential management

### Planning
- **[Feature PRD](./prds/features.md)** - Product Requirements Document for implementing full ONDC protocol support

## Quick Start

### Understanding the Codebase

1. **Read the main [README.md](../README.md)** - Overview of the project and setup instructions
2. **Review [CLAUDE.md](../CLAUDE.md)** - Detailed codebase context and architecture
3. **Study [Tenant Architecture](./TENANT_ARCHITECTURE.md)** - Learn how credentials are managed

### Making Changes

1. **Check [Feature PRD](./prds/features.md)** - See planned features and implementation phases
2. **Follow Tenant patterns** - All new endpoints should use the Tenant entity for credentials
3. **Update documentation** - Keep docs in sync with code changes

## Key Concepts

### Tenant Entity
The Tenant entity is the cornerstone of ONDC credential management:
- **Singleton pattern** - Single instance throughout application
- **Encapsulated credentials** - Private keys never exposed
- **Pre-computed secrets** - Shared secrets computed once for performance
- **Type-safe API** - All operations through well-defined methods

### ONDC Integration Flow
```
1. Subscription → POST /api/ondc/on_subscribe
   ↳ Decrypt challenge using Tenant

2. Domain Verification → GET /ondc-site-verification.html
   ↳ Sign request ID using Tenant

3. Health Check → GET /api/ondc/health
   ↳ Validate tenant configuration
```

## Contributing

When adding new features:

1. **Use Tenant entity** - Never access environment variables directly
2. **Add tests** - Unit and integration tests for new functionality
3. **Update docs** - Document new endpoints and features
4. **Follow patterns** - Match existing code style and patterns

## Resources

### External Documentation
- [ONDC Official](https://ondc.org/)
- [ONDC GitHub](https://github.com/ONDC-Official)
- [ONDC Developer Docs](https://github.com/ONDC-Official/developer-docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [libsodium](https://doc.libsodium.org/)

### Internal Resources
- [Project README](../README.md)
- [Codebase Context](../CLAUDE.md)
- [Environment Template](../.env.example)

## Document Updates

This documentation should be updated when:
- New features are added
- Architecture changes
- API endpoints added/modified
- Environment variables change
- Security considerations change

## Questions?

If you have questions about:
- **Architecture** → See [CLAUDE.md](../CLAUDE.md)
- **Credentials** → See [Tenant Architecture](./TENANT_ARCHITECTURE.md)
- **Future Features** → See [Feature PRD](./prds/features.md)
- **Setup** → See [README.md](../README.md)
