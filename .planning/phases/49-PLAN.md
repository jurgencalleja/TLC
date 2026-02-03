# Phase 49: Container Security Hardening - Plan

## Overview

Production-grade container security following CIS Docker Benchmark and OWASP Docker Security guidelines.

## Prerequisites

- [x] Phase 48 complete (security code modules)
- [x] Existing docker-compose.dev.yml as baseline

## Tasks

### Task 1: Dockerfile Security Linter [ ]

**Goal:** Create a Dockerfile linting module to enforce security best practices.

**Files:**
- `lib/security/dockerfile-linter.js`
- `lib/security/dockerfile-linter.test.js`

**Acceptance Criteria:**
- [ ] Detects missing USER directive (non-root)
- [ ] Detects use of `latest` tag
- [ ] Detects hardcoded secrets in ENV/ARG
- [ ] Detects COPY/ADD of sensitive files
- [ ] Detects unnecessary SUID/SGID binaries
- [ ] Validates multi-stage build usage
- [ ] Warns on full base images (prefer alpine/distroless)

**Test Cases (~25 tests):**
- Linter detects USER missing
- Linter detects latest tag usage
- Linter detects hardcoded passwords
- Linter detects secrets in ENV
- Linter passes secure Dockerfile

---

### Task 2: Runtime Security Validator [ ]

**Goal:** Create runtime security configuration validator for docker-compose.

**Files:**
- `lib/security/container-runtime.js`
- `lib/security/container-runtime.test.js`

**Acceptance Criteria:**
- [ ] Validates cap_drop: ALL present
- [ ] Validates no privileged: true
- [ ] Validates read_only: true where possible
- [ ] Validates no host network mode
- [ ] Validates user namespace configuration
- [ ] Validates seccomp/apparmor profiles
- [ ] Generates security recommendations

**Test Cases (~30 tests):**
- Detects privileged containers
- Detects missing cap_drop
- Detects host network usage
- Validates secure compose file
- Generates correct recommendations

---

### Task 3: Network Security Policies [ ]

**Goal:** Network segmentation and isolation policies.

**Files:**
- `lib/security/network-policy.js`
- `lib/security/network-policy.test.js`

**Acceptance Criteria:**
- [ ] Validates custom networks (no default bridge)
- [ ] Enforces network isolation between services
- [ ] Validates internal-only networks for databases
- [ ] Detects exposed ports that should be internal
- [ ] Generates network topology report

**Test Cases (~20 tests):**
- Detects default bridge network
- Validates custom network config
- Detects over-exposed ports
- Validates database isolation

---

### Task 4: Secrets Management Validator [ ]

**Goal:** Ensure secrets are handled securely, never in images or env vars.

**Files:**
- `lib/security/secrets-validator.js`
- `lib/security/secrets-validator.test.js`

**Acceptance Criteria:**
- [ ] Detects secrets in environment variables
- [ ] Validates Docker secrets usage
- [ ] Detects secrets in Dockerfile COPY
- [ ] Integrates with secret-detector from Phase 48
- [ ] Recommends Vault/SOPS integration

**Test Cases (~15 tests):**
- Detects passwords in env vars
- Detects API keys in compose
- Validates Docker secrets usage
- Detects secrets in build args

---

### Task 5: Vulnerability Scanner Integration [ ]

**Goal:** Trivy integration for image vulnerability scanning.

**Files:**
- `lib/security/image-scanner.js`
- `lib/security/image-scanner.test.js`

**Acceptance Criteria:**
- [ ] Wraps Trivy CLI for scanning
- [ ] Parses Trivy JSON output
- [ ] Filters by severity (CRITICAL, HIGH, MEDIUM, LOW)
- [ ] Generates compliance reports
- [ ] CI/CD gate function (block on critical)

**Test Cases (~15 tests):**
- Parses Trivy output correctly
- Filters by severity
- Blocks on critical CVEs
- Passes clean images

---

### Task 6: CIS Docker Benchmark Checker [ ]

**Goal:** Automated CIS Docker Benchmark Level 1 checks.

**Files:**
- `lib/security/cis-benchmark.js`
- `lib/security/cis-benchmark.test.js`

**Acceptance Criteria:**
- [ ] Host configuration checks
- [ ] Docker daemon configuration
- [ ] Container runtime checks
- [ ] Security operations checks
- [ ] Generates compliance report

**Test Cases (~20 tests):**
- Checks daemon config
- Checks container isolation
- Generates compliance report
- Calculates benchmark score

---

### Task 7: Hardened Dockerfile Templates [ ]

**Goal:** Create secure Dockerfile templates for TLC services.

**Files:**
- `docker/server.Dockerfile`
- `docker/dashboard.Dockerfile`
- `docker/.dockerignore`

**Acceptance Criteria:**
- [ ] Multi-stage builds
- [ ] Alpine/Distroless base images
- [ ] Non-root USER directive
- [ ] Health checks defined
- [ ] No secrets in image
- [ ] SBOM labels

**Test Cases:** Validated by Task 1 linter

---

### Task 8: Hardened Docker Compose [ ]

**Goal:** Create production-secure docker-compose configuration.

**Files:**
- `docker-compose.prod.yml`
- `docker-compose.security.yml` (overlay)

**Acceptance Criteria:**
- [ ] cap_drop: ALL on all services
- [ ] read_only: true where possible
- [ ] Custom networks with isolation
- [ ] Docker secrets for credentials
- [ ] Resource limits defined
- [ ] Security-opt configurations

**Test Cases:** Validated by Tasks 2, 3, 4

---

### Task 9: Container Security Command [ ]

**Goal:** CLI command to audit container security.

**Files:**
- `commands/container-security.js`

**Acceptance Criteria:**
- [ ] `tlc security:docker` - audit all Docker configs
- [ ] Runs all validators (Tasks 1-6)
- [ ] Generates consolidated report
- [ ] Exit codes for CI integration
- [ ] Fix suggestions included

**Test Cases:**
- Command runs all checks
- Generates correct report
- Returns proper exit codes

---

### Task 10: Dashboard Container Security Pane [ ]

**Goal:** Dashboard view for container security status.

**Files:**
- `dashboard-web/src/components/ContainerSecurityPane.tsx`

**Acceptance Criteria:**
- [ ] Shows Dockerfile lint results
- [ ] Shows runtime security status
- [ ] Shows vulnerability scan results
- [ ] Shows CIS benchmark score
- [ ] One-click re-scan button

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

- [ ] All containers run as non-root
- [ ] No critical CVEs in production images
- [ ] Pass CIS Docker Benchmark Level 1
- [ ] Secrets never visible in logs/env
- [ ] ~90 tests passing
