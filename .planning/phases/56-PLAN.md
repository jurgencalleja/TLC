# Phase 56: Trust Centre & Multi-Framework Compliance - Plan

## Overview

Public-facing security transparency and enterprise compliance frameworks. Builds on Phase 31 evidence collector.

## Tasks

### Task 1: Trust Centre Generator
**Goal:** Generate public trust centre page

**Files:**
- server/lib/compliance/trust-centre.js
- server/lib/compliance/trust-centre.test.js

**Test Cases:**
- Generates security overview section
- Displays certification badges
- Lists subprocessors with DPA links
- Shows data residency info
- Displays incident history (summary only)
- Generates contact/disclosure info
- Outputs HTML and Markdown
- Validates required sections

---

### Task 2: PCI DSS Checklist
**Goal:** PCI DSS v4.0 compliance checklist

**Files:**
- server/lib/compliance/pci-dss-checklist.js
- server/lib/compliance/pci-dss-checklist.test.js

**Test Cases:**
- Covers all 12 requirements
- Tracks control implementation status
- Links evidence to controls
- Generates compliance report
- Calculates compliance percentage
- Identifies gaps
- Supports self-assessment questionnaire
- Exports for QSA review

---

### Task 3: HIPAA Checklist
**Goal:** HIPAA compliance checklist

**Files:**
- server/lib/compliance/hipaa-checklist.js
- server/lib/compliance/hipaa-checklist.test.js

**Test Cases:**
- Covers Administrative safeguards
- Covers Physical safeguards
- Covers Technical safeguards
- Tracks BAA requirements
- Links evidence to controls
- Generates compliance report
- Identifies PHI touchpoints
- Exports audit package

---

### Task 4: ISO 27001 Checklist
**Goal:** ISO 27001:2022 compliance checklist

**Files:**
- server/lib/compliance/iso27001-checklist.js
- server/lib/compliance/iso27001-checklist.test.js

**Test Cases:**
- Covers all Annex A controls
- Tracks Statement of Applicability
- Links evidence to controls
- Generates compliance report
- Supports control objectives
- Tracks implementation status
- Identifies mandatory controls
- Exports for auditor review

---

### Task 5: GDPR Checklist
**Goal:** GDPR compliance checklist

**Files:**
- server/lib/compliance/gdpr-checklist.js
- server/lib/compliance/gdpr-checklist.test.js

**Test Cases:**
- Covers data processing principles (Art 5)
- Covers lawful basis (Art 6)
- Covers consent requirements (Art 7)
- Covers data subject rights (Art 12-22)
- Covers privacy by design (Art 25)
- Covers security measures (Art 32)
- Covers breach notification (Art 33-34)
- Generates DPIA template

---

### Task 6: Control Mapper
**Goal:** Map controls across frameworks

**Files:**
- server/lib/compliance/control-mapper.js
- server/lib/compliance/control-mapper.test.js

**Test Cases:**
- Maps SOC 2 to ISO 27001
- Maps SOC 2 to PCI DSS
- Maps ISO 27001 to HIPAA
- Maps GDPR to SOC 2
- Identifies overlapping controls
- Generates cross-reference matrix
- Reduces duplicate evidence
- Validates mapping accuracy

---

### Task 7: Evidence Linker
**Goal:** Auto-link evidence to controls

**Files:**
- server/lib/compliance/evidence-linker.js
- server/lib/compliance/evidence-linker.test.js

**Test Cases:**
- Links security scan results to controls
- Links deployment logs to controls
- Links access reviews to controls
- Links pentest reports to controls
- Suggests missing evidence
- Validates evidence freshness
- Generates evidence inventory
- Supports evidence tagging

---

### Task 8: Multi-Framework Reporter
**Goal:** Generate cross-framework reports

**Files:**
- server/lib/compliance/multi-framework-reporter.js
- server/lib/compliance/multi-framework-reporter.test.js

**Test Cases:**
- Generates readiness report
- Shows coverage across frameworks
- Identifies shared gaps
- Calculates overall compliance score
- Generates gap analysis
- Exports auditor package
- Supports incremental updates
- Generates executive summary

---

### Task 9: Trust Centre Command
**Goal:** CLI for trust centre operations

**Files:**
- server/commands/trust-centre.js
- server/commands/trust-centre.test.js

**Test Cases:**
- `tlc trust-centre generate` creates pages
- `tlc trust-centre status` shows compliance
- `tlc trust-centre export` creates packages
- `tlc trust-centre map` shows control mapping
- Supports framework selection
- Outputs multiple formats

---

### Task 10: TrustCentrePane Dashboard
**Goal:** Dashboard component for compliance

**Files:**
- dashboard-web/src/components/compliance/TrustCentrePane.tsx
- dashboard-web/src/components/compliance/TrustCentrePane.test.tsx

**Test Cases:**
- Shows framework selector
- Displays compliance status per framework
- Shows control coverage chart
- Displays evidence inventory
- Shows gap list
- Supports drill-down to controls
- Filters by framework
- Exports compliance data

---

## Estimated Scope
- Tasks: 10
- Tests: ~175
