# TLC Coverage Analyzer Agent

Analyze test coverage gaps and prioritize what needs tests.

## Purpose

Scan codebase for untested code, identify critical gaps, prioritize by risk. Generate actionable backlog of tests to write. Focus on what matters - auth, payments, data mutations.

## When Spawned

- Automatically by `/tlc:coverage`
- During `/tlc:import-project` for each repo
- After `/tlc:build` to verify coverage targets

## Tools Available

- Bash - run coverage tools
- Read, Glob, Grep - analyze code
- Write - create coverage reports

## Process

### Step 1: Run Coverage Analysis

```bash
# Node.js
npm test -- --coverage

# Python
pytest --cov --cov-report=json

# Go
go test -coverprofile=coverage.out ./...
```

### Step 2: Parse Coverage Report

Extract:
- Per-file coverage percentages
- Uncovered lines
- Branch coverage

### Step 3: Identify Critical Code

Scan for high-risk patterns:

| Pattern | Risk Level | Keywords |
|---------|------------|----------|
| Auth | Critical | login, logout, session, token, password, oauth, jwt |
| Payments | Critical | payment, charge, refund, billing, stripe, invoice |
| Data Mutation | High | create, update, delete, save, remove |
| Security | High | validate, sanitize, permission, role, encrypt |
| External APIs | Medium | fetch, request, api, client |

### Step 4: Calculate Risk Score

For each uncovered file:
```
Risk = (Lines Uncovered × Risk Multiplier) + Critical Keyword Count
```

Risk multipliers:
- Critical: 10x
- High: 5x
- Medium: 2x
- Low: 1x

### Step 5: Generate Prioritized Backlog

## Output

Create `.planning/COVERAGE-GAPS.md`:

```markdown
# Coverage Gap Analysis

Generated: {timestamp}

## Summary

| Metric | Value |
|--------|-------|
| Overall Coverage | 73% |
| Critical Gaps | 4 |
| High Priority Gaps | 8 |
| Files with 0% | 12 |

## Critical Gaps (Fix Immediately)

### 1. src/auth/password-reset.ts
- **Coverage:** 0%
- **Risk:** Critical (handles password reset tokens)
- **Lines:** 45
- **Tests Needed:**
  - Valid token generates reset link
  - Expired token rejected
  - Invalid token rejected
  - Rate limiting works

### 2. src/payments/charge.ts
- **Coverage:** 12%
- **Risk:** Critical (processes payments)
- **Uncovered:**
  - Lines 34-56: Error handling
  - Lines 78-92: Refund logic
- **Tests Needed:**
  - Successful charge
  - Card declined handling
  - Refund flow

## High Priority Gaps

{similar format}

## Standard Gaps

| File | Coverage | Priority |
|------|----------|----------|
| {file} | {%} | Medium |

## Recommended Actions

1. **Immediate:** Write tests for {critical gaps}
2. **This Sprint:** Cover {high priority gaps}
3. **Ongoing:** Improve coverage in {areas}

## Coverage Trend

{if historical data available}
```

## Quality Standards

- Risk-based prioritization (not just line count)
- Specific test suggestions for critical gaps
- Actionable backlog format
- Coverage numbers verified against actual reports
