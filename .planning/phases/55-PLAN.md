# Phase 55: Continuous Security Testing - Plan

## Overview

Security testing integrated into every PR and deployment with SAST, DAST, SCA, and penetration testing.

## Tasks

### Task 1: SAST Runner
**Goal:** Static analysis with Semgrep integration

**Files:**
- server/lib/security-testing/sast-runner.js
- server/lib/security-testing/sast-runner.test.js

**Test Cases:**
- Runs Semgrep scan
- Parses Semgrep JSON output
- Filters by severity
- Generates PR comments
- Supports custom rules
- Caches scan results

---

### Task 2: DAST Runner
**Goal:** Dynamic analysis with OWASP ZAP

**Files:**
- server/lib/security-testing/dast-runner.js
- server/lib/security-testing/dast-runner.test.js

**Test Cases:**
- Runs ZAP baseline scan
- Runs ZAP full scan
- Parses ZAP JSON report
- Supports authenticated scanning
- Configures scan policy
- Generates HTML report

---

### Task 3: Dependency Scanner
**Goal:** SCA with vulnerability detection

**Files:**
- server/lib/security-testing/dependency-scanner.js
- server/lib/security-testing/dependency-scanner.test.js

**Test Cases:**
- Runs npm audit
- Runs Trivy scan
- Parses vulnerability results
- Checks license compliance
- Generates SBOM
- Filters by severity threshold

---

### Task 4: Secret Scanner
**Goal:** GitLeaks integration for secret detection

**Files:**
- server/lib/security-testing/secret-scanner.js
- server/lib/security-testing/secret-scanner.test.js

**Test Cases:**
- Runs GitLeaks scan
- Scans commit history
- Detects common secret patterns
- Supports custom patterns
- Generates findings report
- Excludes allowlisted patterns

---

### Task 5: Pentest Runner
**Goal:** Nuclei scanner for penetration testing

**Files:**
- server/lib/security-testing/pentest-runner.js
- server/lib/security-testing/pentest-runner.test.js

**Test Cases:**
- Runs Nuclei scan
- Uses OWASP templates
- Tests SQL injection
- Tests XSS vulnerabilities
- Tests auth bypass
- Generates pentest report

---

### Task 6: Security Reporter
**Goal:** Aggregate security findings

**Files:**
- server/lib/security-testing/security-reporter.js
- server/lib/security-testing/security-reporter.test.js

**Test Cases:**
- Aggregates all scan results
- Deduplicates findings
- Calculates risk score
- Generates HTML report
- Generates JSON report
- Generates SARIF format

---

### Task 7: Security Gate
**Goal:** Block deployments on security findings

**Files:**
- server/lib/security-testing/security-gate.js
- server/lib/security-testing/security-gate.test.js

**Test Cases:**
- Blocks on critical findings
- Blocks on high findings (configurable)
- Allows with warnings only
- Supports override with approval
- Logs gate decisions
- Generates gate report

---

### Task 8: Security Scan Command
**Goal:** CLI for security scanning

**Files:**
- server/commands/security-scan.js
- server/commands/security-scan.test.js

**Test Cases:**
- `tlc security scan` runs all scans
- `tlc security scan --sast` runs SAST only
- `tlc security scan --dast` runs DAST only
- `tlc security scan --secrets` runs secret scan
- Outputs in multiple formats
- Supports CI mode

---

### Task 9: Security Dashboard Pane
**Goal:** Dashboard component for security status

**Files:**
- dashboard-web/src/components/security/SecurityScanPane.tsx
- dashboard-web/src/components/security/SecurityScanPane.test.tsx

**Test Cases:**
- Displays scan results by type
- Shows severity breakdown
- Displays findings list
- Filters by severity
- Shows trend over time
- Links to detailed reports

---

## Estimated Scope
- Tasks: 9
- Tests: ~90
