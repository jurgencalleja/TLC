# /tlc:import-project - Import Multi-Repo Architecture

Scan multiple GitHub repositories, analyze test coverage, create unified project view.

## What This Does

1. Clones private repos to temp directory (shallow clone)
2. Detects stack & test framework per repo
3. Runs coverage analysis per repo
4. Generates unified coverage report
5. Creates multi-service PROJECT.md
6. Identifies critical untested paths across all services

## When to Use

- Inheriting a multi-repo microservices codebase
- Verifying "coverage is good" claims
- Managing multiple services as one TLC project
- Onboarding to unfamiliar architecture

## Prerequisites

- GitHub CLI authenticated: `gh auth status`
- Access to all repos: `gh repo list {org} --limit 100`

## Process

### Step 1: Gather Repos

Ask user for repos. Accept:
- GitHub org name (scan all repos)
- Comma-separated repo URLs
- Path to file with repo list

```bash
gh repo list {org} --json name,url --limit 100
```

### Step 2: Clone Each Repo (Shallow)

For each repo:
```bash
gh repo clone {owner}/{repo} .tlc-scan/{repo} -- --depth=1
```

### Step 3: Detect Stack Per Repo

Check for indicators:
| File | Stack |
|------|-------|
| package.json | Node.js |
| pyproject.toml | Python |
| go.mod | Go |
| Cargo.toml | Rust |

Check for test framework:
| Indicator | Framework |
|-----------|-----------|
| vitest.config.* | Vitest |
| jest.config.* | Jest |
| pytest.ini / [tool.pytest] | pytest |
| *_test.go | go test |

### Step 4: Run Coverage Per Repo

Execute framework-specific coverage:
- **Node.js (vitest):** `npm test -- --coverage --reporter=json`
- **Node.js (jest):** `npm test -- --coverage --json`
- **Python:** `pytest --cov --cov-report=json`
- **Go:** `go test -coverprofile=coverage.out ./...`

Parse coverage reports:
- Node.js: `coverage/coverage-final.json`
- Python: `coverage.json`
- Go: parse `coverage.out`

### Step 5: Identify Untested Critical Paths

Scan for keywords indicating critical code:
- **Auth:** login, logout, session, token, password, oauth, jwt
- **Payments:** payment, billing, charge, stripe, invoice
- **Data mutations:** create, update, delete, save
- **Security:** validate, sanitize, permission, role

Flag any file with these keywords that lacks corresponding test.

### Step 6: Generate Unified Report

Create `.planning/COVERAGE-REPORT.md`:

```markdown
# Coverage Report - Multi-Service Architecture

Generated: {timestamp}

## Summary

| Metric | Value |
|--------|-------|
| Total Repos | 12 |
| Avg Coverage | 67% |
| Critical Gaps | 4 |

## Per-Service Coverage

| Service | Stack | Coverage | Tests | Critical Gaps |
|---------|-------|----------|-------|---------------|
| auth-service | Node.js | 87% | 45 | 0 |
| payment-service | Node.js | 23% | 8 | 2 (charge, refund) |
| user-service | Python | 91% | 112 | 0 |
| notification-svc | Node.js | 0% | 0 | 1 (send) |

## Critical Gaps (Priority Order)

### 1. payment-service/src/charge.ts
- Handles: Credit card charging
- Risk: Money handling with no tests
- Action: Write tests for charge flow

### 2. payment-service/src/refund.ts
- Handles: Refund processing
- Risk: Money handling with no tests
- Action: Write tests for refund flow

...
```

### Step 7: Create Multi-Service PROJECT.md

Create `.planning/PROJECT.md`:

```markdown
# {Project Name} - Multi-Service Architecture

## Overview

{Inferred from repo names and README files}

## Services

### auth-service
- **Path:** github.com/{org}/auth-service
- **Stack:** Node.js + Express
- **Test Framework:** Vitest
- **Coverage:** 87%
- **Role:** Authentication & session management

### payment-service
- **Path:** github.com/{org}/payment-service
- **Stack:** Node.js + Stripe
- **Test Framework:** Jest
- **Coverage:** 23%
- **Role:** Payment processing

...

## Architecture

```
[API Gateway]
    |-- [Auth Service] --> [User DB]
    |-- [User Service] --> [User DB]
    |-- [Payment Service] --> [Stripe API]
    +-- [Notification Service] --> [Email/SMS]
```

## Development Methodology: Test-Led Development

All services follow TLC. New code requires tests first.

## Next Steps

1. Fix critical coverage gaps (see COVERAGE-REPORT.md)
2. Run `/tlc:coverage` per service for detailed backlog
3. Use `/tlc` for new features
```

### Step 8: Create Test Backlog

Create `.planning/BACKLOG.md`:

```markdown
# Test Backlog - Multi-Service

## Critical (Security/Money)

- [ ] payment-service: src/charge.ts
- [ ] payment-service: src/refund.ts
- [ ] auth-service: src/password-reset.ts (if untested)

## High Priority (Core Business Logic)

- [ ] user-service: src/registration.ts
- [ ] order-service: src/checkout.ts

## Standard

- [ ] notification-svc: all files (0% coverage)
```

### Step 9: Cleanup

Remove temp directory:
```bash
rm -rf .tlc-scan/
```

### Step 10: Report Summary

```
Import complete for {org}

Repos scanned: 12
Total coverage: 67% average

Critical findings:
  - payment-service: 23% coverage (handles money!)
  - notification-svc: 0% coverage

Files created:
  .planning/PROJECT.md
  .planning/COVERAGE-REPORT.md
  .planning/BACKLOG.md

Next: Run /tlc:build backlog to write tests for critical gaps
```

## Usage

```bash
# Scan entire GitHub org
/tlc:import-project myorg

# Scan specific repos
/tlc:import-project myorg/auth-service,myorg/payment-service

# Scan from file
/tlc:import-project --file repos.txt
```

## Notes

- Requires `gh` CLI authenticated with access to private repos
- Shallow clones only (--depth=1) to minimize bandwidth
- Temp files cleaned up after scan
- Re-run anytime to update coverage report
