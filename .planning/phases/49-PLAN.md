# Phase 49: Container Security Hardening - Plan

## Overview

Production-grade container security following CIS Docker Benchmark and OWASP Docker Security guidelines.

## Prerequisites

- [x] Phase 48 complete (security code modules)
- [x] Existing docker-compose.dev.yml as baseline

## Tasks

### Task 1: Dockerfile Security Linter [x]

**Goal:** Create a Dockerfile linting module to enforce security best practices.

**Files:**
- `lib/security/dockerfile-linter.js`
- `lib/security/dockerfile-linter.test.js`

**Acceptance Criteria:**
- [x] Detects missing USER directive (non-root)
- [x] Detects use of `latest` tag
- [x] Detects hardcoded secrets in ENV/ARG
- [x] Detects COPY/ADD of sensitive files
- [x] Detects unnecessary SUID/SGID binaries
- [x] Validates multi-stage build usage
- [x] Warns on full base images (prefer alpine/distroless)

**Test Cases (~25 tests):**
- Linter detects USER missing
- Linter detects latest tag usage
- Linter detects hardcoded passwords
- Linter detects secrets in ENV
- Linter passes secure Dockerfile

---

### Task 2: Runtime Security Validator [x]

**Goal:** Create runtime security configuration validator for docker-compose.

**Files:**
- `lib/security/container-runtime.js`
- `lib/security/container-runtime.test.js`

**Acceptance Criteria:**
- [x] Validates cap_drop: ALL present
- [x] Validates no privileged: true
- [x] Validates read_only: true where possible
- [x] Validates no host network mode
- [x] Validates user namespace configuration
- [x] Validates seccomp/apparmor profiles
- [x] Generates security recommendations

**Test Cases (~30 tests):**
- Detects privileged containers
- Detects missing cap_drop
- Detects host network usage
- Validates secure compose file
- Generates correct recommendations

---

### Task 3: Network Security Policies [x]

**Goal:** Network segmentation and isolation policies.

**Files:**
- `lib/security/network-policy.js`
- `lib/security/network-policy.test.js`

**Acceptance Criteria:**
- [x] Validates custom networks (no default bridge)
- [x] Enforces network isolation between services
- [x] Validates internal-only networks for databases
- [x] Detects exposed ports that should be internal
- [x] Generates network topology report

**Test Cases (~20 tests):**
- Detects default bridge network
- Validates custom network config
- Detects over-exposed ports
- Validates database isolation

---

### Task 4: Secrets Management Validator [x]

**Goal:** Ensure secrets are handled securely, never in images or env vars.

**Files:**
- `lib/security/secrets-validator.js`
- `lib/security/secrets-validator.test.js`

**Acceptance Criteria:**
- [x] Detects secrets in environment variables
- [x] Validates Docker secrets usage
- [x] Detects secrets in Dockerfile COPY
- [x] Integrates with secret-detector from Phase 48
- [x] Recommends Vault/SOPS integration

**Test Cases (~15 tests):**
- Detects passwords in env vars
- Detects API keys in compose
- Validates Docker secrets usage
- Detects secrets in build args

---

### Task 5: Vulnerability Scanner Integration [x]

**Goal:** Trivy integration for image vulnerability scanning.

**Files:**
- `lib/security/image-scanner.js`
- `lib/security/image-scanner.test.js`

**Acceptance Criteria:**
- [x] Wraps Trivy CLI for scanning
- [x] Parses Trivy JSON output
- [x] Filters by severity (CRITICAL, HIGH, MEDIUM, LOW)
- [x] Generates compliance reports
- [x] CI/CD gate function (block on critical)

**Test Cases (~15 tests):**
- Parses Trivy output correctly
- Filters by severity
- Blocks on critical CVEs
- Passes clean images

---

### Task 6: CIS Docker Benchmark Checker [x]

**Goal:** Automated CIS Docker Benchmark Level 1 checks.

**Files:**
- `lib/security/cis-benchmark.js`
- `lib/security/cis-benchmark.test.js`

**Acceptance Criteria:**
- [x] Host configuration checks
- [x] Docker daemon configuration
- [x] Container runtime checks
- [x] Security operations checks
- [x] Generates compliance report

**Test Cases (~20 tests):**
- Checks daemon config
- Checks container isolation
- Generates compliance report
- Calculates benchmark score

---

### Task 7: Hardened Dockerfile Templates [x]

**Goal:** Create secure Dockerfile templates for TLC services.

**Files:**
- `docker/server.Dockerfile`
- `docker/dashboard.Dockerfile`
- `docker/.dockerignore`

**Acceptance Criteria:**
- [x] Multi-stage builds
- [x] Alpine/Distroless base images
- [x] Non-root USER directive
- [x] Health checks defined
- [x] No secrets in image
- [x] SBOM labels

**Test Cases:** Validated by Task 1 linter

---

### Task 8: Hardened Docker Compose [x]

**Goal:** Create production-secure docker-compose configuration.

**Files:**
- `docker-compose.prod.yml`
- `docker-compose.security.yml` (overlay)

**Acceptance Criteria:**
- [x] cap_drop: ALL on all services
- [x] read_only: true where possible
- [x] Custom networks with isolation
- [x] Docker secrets for credentials
- [x] Resource limits defined
- [x] Security-opt configurations

**Test Cases:** Validated by Tasks 2, 3, 4

---

### Task 9: Container Security Command [x]

**Goal:** CLI command to audit container security.

**Files:**
- `commands/container-security.js`

**Acceptance Criteria:**
- [x] `tlc security:docker` - audit all Docker configs
- [x] Runs all validators (Tasks 1-6)
- [x] Generates consolidated report
- [x] Exit codes for CI integration
- [x] Fix suggestions included

**Test Cases:**
- Command runs all checks
- Generates correct report
- Returns proper exit codes

---

### Task 10: Dashboard Container Security Pane [x]

**Goal:** Dashboard view for container security status.

**Files:**
- `dashboard-web/src/components/ContainerSecurityPane.tsx`

**Acceptance Criteria:**
- [x] Shows Dockerfile lint results
- [x] Shows runtime security status
- [x] Shows vulnerability scan results
- [x] Shows CIS benchmark score
- [x] One-click re-scan button

**Test Cases:**
- Renders security status
- Displays recommendations
- Re-scan functionality works

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 5 | - | Trivy integration independent |
| 6 | - | CIS checks independent |
| 7 | 1 | Templates validated by linter |
| 8 | 2, 3, 4 | Compose validated by runtime checks |
| 9 | 1-6 | Command runs all validators |
| 10 | 9 | Dashboard shows command results |

## Estimated Scope

- Tasks: 10
- New Files: ~15
- Tests: ~90
- Coverage: Dockerfile, Compose, Runtime, Network, Secrets, Scanning

## Success Criteria

- [x] All containers run as non-root
- [x] No critical CVEs in production images
- [x] Pass CIS Docker Benchmark Level 1
- [x] Secrets never visible in logs/env
- [x] ~90 tests passing
