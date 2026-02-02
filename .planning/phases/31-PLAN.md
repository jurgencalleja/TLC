# Phase 31: Compliance Documentation - Plan

## Overview

SOC 2 and security compliance tooling for enterprise environments. Generate security policies, document data flows, track access controls, and collect audit evidence.

## Prerequisites

- [x] Phase 30 complete (SSO Integration)
- [x] Audit logging (Phase 28)
- [x] Zero-data-retention (Phase 29)

## Tasks

### Task 1: Security Policy Generator [ ]

**Goal:** Generate security policy documents from configuration

**Files:**
- server/lib/security-policy-generator.js
- server/lib/security-policy-generator.test.js

**Acceptance Criteria:**
- [ ] Generate access control policy
- [ ] Generate data protection policy
- [ ] Generate incident response policy
- [ ] Generate password/auth policy
- [ ] Generate acceptable use policy
- [ ] Customize policies from .tlc.json
- [ ] Export as Markdown or PDF-ready HTML

**Test Cases:**
- generateAccessControlPolicy creates policy document
- generateDataProtectionPolicy creates policy document
- generateIncidentResponsePolicy creates policy document
- generateAuthPolicy includes MFA requirements
- generateAcceptableUsePolicy creates policy document
- customizes policy with organization name
- customizes policy with custom sections
- exports as Markdown format
- exports as HTML format
- loadPolicyConfig reads from .tlc.json
- merges custom policies with templates

---

### Task 2: Access Control Documenter [ ]

**Goal:** Document who has access to what

**Files:**
- server/lib/access-control-doc.js
- server/lib/access-control-doc.test.js

**Acceptance Criteria:**
- [ ] List all users and roles
- [ ] Document role permissions
- [ ] Document SSO role mappings
- [ ] Track permission changes over time
- [ ] Generate access matrix
- [ ] Export as compliance evidence

**Test Cases:**
- listUsers returns all users with roles
- listRoles returns all roles with permissions
- getRolePermissions returns permissions for role
- getSSOMapping returns IdP group mappings
- getAccessMatrix generates user/permission matrix
- trackPermissionChange logs permission changes
- getPermissionHistory returns change history
- exportAsEvidence generates compliance format
- formatAccessReport generates readable report
- detectOrphanedPermissions finds unused permissions

---

### Task 3: Data Flow Documenter [ ]

**Goal:** Document data flows through the system

**Files:**
- server/lib/data-flow-doc.js
- server/lib/data-flow-doc.test.js

**Acceptance Criteria:**
- [ ] Identify data sources (user input, APIs, databases)
- [ ] Track data transformations
- [ ] Document data destinations
- [ ] Classify data by sensitivity
- [ ] Generate data flow diagrams (Mermaid)
- [ ] Document retention policies

**Test Cases:**
- identifyDataSources finds input points
- identifyDataSources finds API endpoints
- identifyDataSources finds database connections
- trackDataFlow documents transformations
- classifyData assigns sensitivity levels
- generateFlowDiagram creates Mermaid diagram
- documentRetention includes retention policies
- getDataInventory returns all data types
- getDataLineage traces data through system
- exportDataFlowReport generates compliance format

---

### Task 4: Compliance Checklist [ ]

**Goal:** SOC 2 Type II compliance checklist

**Files:**
- server/lib/compliance-checklist.js
- server/lib/compliance-checklist.test.js

**Acceptance Criteria:**
- [ ] SOC 2 Trust Service Criteria checklist
- [ ] Track control implementation status
- [ ] Link controls to evidence
- [ ] Calculate compliance percentage
- [ ] Identify gaps
- [ ] Generate remediation tasks

**Test Cases:**
- getSOC2Checklist returns all criteria
- getControlStatus returns implemented/not implemented
- linkControlToEvidence associates evidence
- getCompliancePercentage calculates completion
- getComplianceGaps returns unimplemented controls
- generateRemediationPlan creates task list
- updateControlStatus marks control complete
- getControlsByCategory groups by TSC category
- exportChecklist generates audit-ready format
- importChecklist loads saved progress

---

### Task 5: Evidence Collector [ ]

**Goal:** Collect and organize compliance evidence

**Files:**
- server/lib/evidence-collector.js
- server/lib/evidence-collector.test.js

**Acceptance Criteria:**
- [ ] Collect audit logs as evidence
- [ ] Collect access control snapshots
- [ ] Collect policy documents
- [ ] Collect configuration snapshots
- [ ] Timestamp and hash all evidence
- [ ] Export evidence package

**Test Cases:**
- collectAuditLogs gathers audit entries
- collectAccessSnapshot captures current access
- collectPolicyDocuments gathers policies
- collectConfigSnapshot captures .tlc.json
- timestampEvidence adds collection time
- hashEvidence generates SHA-256 hash
- verifyEvidence validates hash integrity
- packageEvidence creates ZIP archive
- getEvidenceInventory lists collected evidence
- linkEvidenceToControl maps to SOC 2 controls

---

### Task 6: Compliance Reporter [ ]

**Goal:** Generate compliance reports

**Files:**
- server/lib/compliance-reporter.js
- server/lib/compliance-reporter.test.js

**Acceptance Criteria:**
- [ ] Generate SOC 2 readiness report
- [ ] Generate executive summary
- [ ] Generate detailed findings
- [ ] Include evidence references
- [ ] Calculate risk scores
- [ ] Export as PDF-ready HTML

**Test Cases:**
- generateReadinessReport creates full report
- generateExecutiveSummary creates overview
- generateDetailedFindings lists all controls
- includeEvidenceReferences links to evidence
- calculateRiskScore computes overall risk
- calculateCategoryScores computes per-category
- formatReportHTML generates styled HTML
- formatReportMarkdown generates Markdown
- getReportHistory returns past reports
- compareReports shows progress over time

---

### Task 7: Compliance Command [ ]

**Goal:** CLI command for compliance operations

**Files:**
- server/lib/compliance-command.js
- server/lib/compliance-command.test.js

**Acceptance Criteria:**
- [ ] `tlc compliance status` - show compliance status
- [ ] `tlc compliance checklist` - show SOC 2 checklist
- [ ] `tlc compliance evidence` - collect evidence
- [ ] `tlc compliance report` - generate report
- [ ] `tlc compliance policies` - generate policies
- [ ] `tlc compliance gaps` - show gaps

**Test Cases:**
- execute status shows compliance percentage
- execute status shows category breakdown
- execute checklist shows all controls
- execute checklist filters by category
- execute evidence collects all evidence
- execute evidence shows collection summary
- execute report generates full report
- execute report supports format flag
- execute policies generates all policies
- execute gaps shows unimplemented controls
- parseArgs handles all subcommands
- formatStatus returns readable output

---

### Task 8: Dashboard CompliancePane [ ]

**Goal:** Dashboard component for compliance overview

**Files:**
- dashboard/src/components/CompliancePane.tsx
- dashboard/src/components/CompliancePane.test.tsx

**Acceptance Criteria:**
- [ ] Show compliance score/percentage
- [ ] Show category breakdown (Security, Availability, etc.)
- [ ] Show recent evidence collections
- [ ] Show gap count and severity
- [ ] Link to full reports
- [ ] Show audit timeline

**Test Cases:**
- renders compliance score correctly
- renders category breakdown chart
- renders evidence collection list
- renders gap count with severity
- download report button works
- shows audit timeline
- handles loading state
- handles error state
- refresh button reloads data
- shows last report date

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 5 | 1, 2, 3 | Evidence collector gathers outputs from generators |
| 6 | 4, 5 | Reporter uses checklist and evidence |
| 7 | 1-6 | Command uses all compliance modules |
| 8 | 4, 6 | Dashboard shows checklist and reports |

**Parallel groups:**
- Group A: Tasks 1, 2, 3, 4 (independent foundations)
- Group B: Task 5 (after 1, 2, 3)
- Group C: Task 6 (after 4, 5)
- Group D: Tasks 7, 8 (after dependencies, can parallelize)

## Estimated Scope

- Tasks: 8
- Files: 16 (8 modules + 8 test files)
- Tests: ~100 (estimated)
