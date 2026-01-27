# /tlc:docs - Team Documentation

Generate and maintain project documentation for your team.

## Usage

```
/tlc:docs [command]
```

Commands:
- `generate` - Generate docs from code and plans
- `api` - Generate API documentation
- `setup` - Create team onboarding guide
- `changelog` - Generate changelog from commits
- `decisions` - Document architectural decisions

## Generate Documentation

```
> /tlc:docs generate

Analyzing project...

Found:
  - 45 source files
  - 12 API endpoints
  - 8 phases planned
  - 23 completed tasks

Generating documentation...

Created:
  docs/
    README.md          Project overview
    ARCHITECTURE.md    System design
    API.md             API reference
    CONTRIBUTING.md    How to contribute
    ONBOARDING.md      New team member guide
    CHANGELOG.md       Version history

Open docs/README.md? (Y/n)
```

## API Documentation

### From Code

```
> /tlc:docs api

Scanning for API routes...

Found 12 endpoints:
  POST /api/auth/login
  POST /api/auth/register
  GET  /api/users
  GET  /api/users/:id
  PUT  /api/users/:id
  DELETE /api/users/:id
  ...

Generating docs/API.md...

Options:
  1) OpenAPI/Swagger format
  2) Markdown format
  3) Both

Choice: 3

Created:
  docs/API.md           Markdown documentation
  docs/openapi.yaml     OpenAPI 3.0 spec
```

### Generated API.md

```markdown
# API Reference

Base URL: `http://localhost:3000/api`

## Authentication

### POST /auth/login

Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

**Response:**
```json
{
  "token": "eyJ...",
  "user": {
    "id": "123",
    "email": "user@example.com"
  }
}
```

**Errors:**
| Code | Description |
|------|-------------|
| 401 | Invalid credentials |
| 400 | Missing email or password |

---

### POST /auth/register
...
```

## Team Onboarding

```
> /tlc:docs setup

Creating team onboarding documentation...

Questions:
  1. Project name: My Project
  2. Tech stack: Node.js, React, PostgreSQL
  3. Dev environment: Docker? (Y/n) y
  4. Testing: mocha (detected)
  5. CI/CD: GitHub Actions (detected)

Created docs/ONBOARDING.md

Preview:
---
# Onboarding Guide

Welcome to My Project!

## Quick Start

1. Clone the repo
2. Run `docker-compose up`
3. Visit http://localhost:3000

## Development

### Prerequisites
- Node.js 20+
- Docker Desktop
- VS Code (recommended)

### Setup
```bash
git clone git@github.com:acme/myproject.git
cd myproject
npm install
docker-compose up -d db
npm run dev
```

### Testing
```bash
npm test          # Run all tests
npm run test:watch  # Watch mode
```

### Common Tasks
- `/tlc` - See what to work on next
- `/tlc:claim N` - Claim a task
- `/tlc:build` - Build with tests

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md)

## API

See [API.md](API.md)
---
```

## Architecture Documentation

```
> /tlc:docs architecture

Analyzing codebase structure...

Detected patterns:
  - MVC architecture
  - REST API
  - Repository pattern for data access
  - Service layer for business logic

Creating docs/ARCHITECTURE.md...

Preview:
---
# Architecture

## Overview

```
┌──────────────────────────────────────────────────┐
│                   Frontend                        │
│                  (React SPA)                      │
└──────────────────────┬───────────────────────────┘
                       │ HTTP/REST
┌──────────────────────┴───────────────────────────┐
│                   API Layer                       │
│            (Express Controllers)                  │
├──────────────────────────────────────────────────┤
│                 Service Layer                     │
│             (Business Logic)                      │
├──────────────────────────────────────────────────┤
│                Repository Layer                   │
│              (Data Access)                        │
└──────────────────────┬───────────────────────────┘
                       │
┌──────────────────────┴───────────────────────────┐
│                  PostgreSQL                       │
└──────────────────────────────────────────────────┘
```

## Directory Structure

```
src/
├── controllers/     API route handlers
├── services/        Business logic
├── repositories/    Database queries
├── models/          Data models
├── middleware/      Express middleware
└── utils/           Shared utilities
```

## Key Components

### AuthService
Handles authentication and session management.
Location: `src/services/auth.js`

### UserRepository
User database operations.
Location: `src/repositories/user.js`
---
```

## Changelog Generation

```
> /tlc:docs changelog

Analyzing git history since last release (v1.0.0)...

Commits: 47
  Features: 12
  Fixes: 23
  Refactors: 8
  Docs: 4

Generated CHANGELOG.md:

---
# Changelog

## [Unreleased]

### Added
- User authentication with JWT (#45)
- Password reset flow (#52)
- Email verification (#58)
- Rate limiting on auth endpoints (#61)

### Fixed
- Login button not working on mobile (#67)
- Session timeout not refreshing (#71)
- Email validation regex (#73)

### Changed
- Moved auth logic to dedicated service
- Updated dependencies to latest versions

---

Update version? (Y/n)
  Current: 1.0.0
  New version: 1.1.0
```

## Architectural Decision Records

```
> /tlc:docs decisions

Architectural Decision Records (ADRs) document important choices.

Commands:
  /tlc:docs decisions new     Create new ADR
  /tlc:docs decisions list    List all ADRs
  /tlc:docs decisions search  Search ADRs

> /tlc:docs decisions new

Title: Choose authentication strategy

Context:
  Need to implement user authentication for the API.
  Options considered:
    1. JWT tokens (stateless)
    2. Session cookies (stateful)
    3. OAuth only (delegate to provider)

Decision: JWT tokens

Rationale:
  - Stateless: scales horizontally
  - Works well with mobile apps
  - Can include user claims in token

Consequences:
  - Need token refresh mechanism
  - Can't immediately revoke tokens
  - Must secure token storage on client

Created: docs/decisions/001-auth-strategy.md
```

### ADR Template

```markdown
# ADR-001: Choose authentication strategy

**Status:** Accepted
**Date:** 2024-01-15
**Deciders:** Alice, Bob

## Context

Need to implement user authentication for the API.

## Decision

Use JWT tokens for authentication.

## Options Considered

1. **JWT tokens** - Stateless, scalable
2. **Session cookies** - Simple, server-managed
3. **OAuth only** - Delegate to providers

## Rationale

JWT chosen because:
- Horizontal scaling (no session store needed)
- Works with mobile and web clients
- Can embed user claims

## Consequences

### Positive
- No session storage required
- Easy to scale API servers

### Negative
- Token revocation requires additional infrastructure
- Must handle token refresh

## Related

- ADR-002: Token refresh strategy
```

## Contributing Guide

```
> /tlc:docs contributing

Created docs/CONTRIBUTING.md:

---
# Contributing to My Project

## Quick Start

1. Fork the repository
2. Create a feature branch
3. Write tests first (TLC style)
4. Implement the feature
5. Submit a pull request

## Development Process

This project uses **TLC (Test-Led Coding)**:

1. Write tests that describe the feature
2. Run tests (they should fail)
3. Implement until tests pass
4. Refactor if needed
5. Submit PR

## Commit Messages

Format: `type: description`

Types:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `test:` Adding tests
- `refactor:` Code restructuring

Example:
```
feat: add password reset flow

- Add /auth/reset-password endpoint
- Send reset email with token
- Validate token expiry

Closes #52
```

## Pull Request Process

1. Update tests for new functionality
2. Ensure all tests pass
3. Update documentation if needed
4. Request review from maintainers

## Code Style

- ESLint configuration in `.eslintrc`
- Prettier for formatting
- Run `npm run lint` before committing

## Questions?

Open an issue or ask in #dev-help Slack channel.
---
```

## Configuration

In `.tlc.json`:

```json
{
  "docs": {
    "outputDir": "docs",
    "api": {
      "format": ["markdown", "openapi"],
      "baseUrl": "http://localhost:3000/api"
    },
    "changelog": {
      "types": {
        "feat": "Added",
        "fix": "Fixed",
        "refactor": "Changed",
        "docs": "Documentation"
      }
    }
  }
}
```

## Auto-Update

Keep docs in sync with code:

```json
{
  "docs": {
    "autoUpdate": true,
    "updateOn": ["build", "release"]
  }
}
```

This regenerates docs when:
- `/tlc:build` completes a phase
- `/tlc:complete` tags a release

## Notes

- Documentation lives in `docs/` by default
- API docs extracted from code comments and types
- Changelog follows Keep a Changelog format
- ADRs numbered sequentially (001, 002, etc.)
- All docs are Markdown for easy editing
