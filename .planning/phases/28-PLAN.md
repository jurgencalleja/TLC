# Phase 28: Audit Logging - Plan

## Overview

Complete audit trail of all agent actions for enterprise compliance. Provides tamper-evident logging, action classification, user attribution, and export to SIEM formats.

## Prerequisites

- [ ] Phase 27 complete (Workspace Documentation)

## Tasks

### Task 1: Audit Log Storage [ ]

**Goal:** Append-only audit log storage with tamper-evident checksums

**Files:**
- server/lib/audit-storage.js
- server/lib/audit-storage.test.js

**Acceptance Criteria:**
- [ ] Writes logs in append-only mode (no overwrites)
- [ ] Each entry has SHA-256 checksum
- [ ] Checksum chains to previous entry (blockchain-style)
- [ ] Rotates logs daily with configurable retention
- [ ] Stores in `.tlc/audit/` directory

**Test Cases:**
- appendEntry adds entry with checksum
- appendEntry chains checksum to previous entry
- verifyIntegrity detects tampered entries
- verifyIntegrity passes for valid chain
- rotateLog creates new log file daily
- getEntries returns entries in time order
- storage creates directory if missing

---

### Task 2: Action Classifier [ ]

**Goal:** Classify agent actions into categories for filtering and compliance

**Files:**
- server/lib/audit-classifier.js
- server/lib/audit-classifier.test.js

**Acceptance Criteria:**
- [ ] Classifies file operations (read, write, delete)
- [ ] Classifies command execution (shell, npm, git)
- [ ] Classifies network operations (fetch, API calls)
- [ ] Detects sensitive operations (secrets, credentials)
- [ ] Returns severity level (info, warning, critical)

**Test Cases:**
- classifyAction returns 'file:read' for Read tool
- classifyAction returns 'file:write' for Write tool
- classifyAction returns 'file:edit' for Edit tool
- classifyAction returns 'shell:execute' for Bash tool
- classifyAction returns 'shell:git' for git commands
- classifyAction returns 'network:fetch' for WebFetch
- detectSensitive flags .env file access
- detectSensitive flags credential patterns
- getSeverity returns 'critical' for sensitive ops
- getSeverity returns 'info' for read operations

---

### Task 3: User Attribution [ ]

**Goal:** Track who triggered each action (user, agent, hook)

**Files:**
- server/lib/audit-attribution.js
- server/lib/audit-attribution.test.js

**Acceptance Criteria:**
- [ ] Captures git user.name and user.email
- [ ] Tracks TLC_USER environment variable
- [ ] Identifies agent vs human-initiated actions
- [ ] Records session ID for correlation
- [ ] Captures parent process context

**Test Cases:**
- getAttribution returns git user info
- getAttribution uses TLC_USER if set
- getAttribution falls back to system user
- identifySource returns 'agent' for Task tool calls
- identifySource returns 'human' for direct commands
- identifySource returns 'hook' for hook-triggered
- createSessionId generates unique ID
- correlateSession groups related actions

---

### Task 4: Audit Logger [ ]

**Goal:** Main logger that combines storage, classification, and attribution

**Files:**
- server/lib/audit-logger.js
- server/lib/audit-logger.test.js

**Acceptance Criteria:**
- [ ] logAction accepts tool name, parameters, result
- [ ] Automatically classifies and attributes
- [ ] Adds timestamp in ISO 8601 format
- [ ] Stores complete context for replay
- [ ] Supports async batch writing for performance

**Test Cases:**
- logAction creates complete audit entry
- logAction includes classification
- logAction includes attribution
- logAction includes timestamp
- logAction stores tool parameters (sanitized)
- logAction handles async batch mode
- sanitizeParams removes sensitive values
- sanitizeParams preserves structure
- flushBatch writes pending entries

---

### Task 5: Audit Query Engine [ ]

**Goal:** Search and filter audit logs

**Files:**
- server/lib/audit-query.js
- server/lib/audit-query.test.js

**Acceptance Criteria:**
- [ ] Filter by date range
- [ ] Filter by action type
- [ ] Filter by user
- [ ] Filter by severity
- [ ] Full-text search in parameters
- [ ] Pagination support

**Test Cases:**
- query filters by date range
- query filters by action type
- query filters by user
- query filters by severity
- query supports multiple filters combined
- query returns paginated results
- query searches parameter content
- query returns count without results
- query handles empty results

---

### Task 6: SIEM Exporter [ ]

**Goal:** Export audit logs to SIEM formats

**Files:**
- server/lib/audit-exporter.js
- server/lib/audit-exporter.test.js

**Acceptance Criteria:**
- [ ] Export to JSON (default)
- [ ] Export to CSV
- [ ] Export to Splunk HEC format
- [ ] Export to CEF (Common Event Format)
- [ ] Support incremental export (since last export)

**Test Cases:**
- exportJSON returns valid JSON array
- exportCSV returns valid CSV with headers
- exportSplunk returns HEC-compatible events
- exportCEF returns CEF-formatted lines
- export filters by date range
- export supports incremental mode
- exportIncremental tracks last export position
- formatForSplunk includes required fields
- formatForCEF follows CEF spec

---

### Task 7: Audit Command [ ]

**Goal:** CLI command to view and export audit logs

**Files:**
- server/lib/audit-command.js
- server/lib/audit-command.test.js

**Acceptance Criteria:**
- [ ] `tlc audit` shows recent actions
- [ ] `tlc audit --user <name>` filters by user
- [ ] `tlc audit --type <type>` filters by type
- [ ] `tlc audit --export <format>` exports logs
- [ ] `tlc audit --verify` checks integrity

**Test Cases:**
- execute shows recent audit entries
- execute with --user filters by user
- execute with --type filters by action type
- execute with --since filters by date
- execute with --export json exports JSON
- execute with --export csv exports CSV
- execute with --export splunk exports Splunk format
- execute with --verify validates checksums
- execute with --verify reports tampering

---

### Task 8: Dashboard AuditPane [ ]

**Goal:** Dashboard component to view audit logs

**Files:**
- dashboard/src/components/AuditPane.tsx
- dashboard/src/components/AuditPane.test.tsx

**Acceptance Criteria:**
- [ ] Shows scrollable list of audit entries
- [ ] Color-coded by severity
- [ ] Expandable entry details
- [ ] Filter controls (user, type, date)
- [ ] Integrity status indicator

**Test Cases:**
- renders audit entries list
- renders entry with timestamp and action
- renders severity badge with correct color
- expands entry to show details
- filters by user selection
- filters by action type
- filters by date range
- shows integrity status
- handles empty audit log

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 4 | 1, 2, 3 | Logger uses storage, classifier, attribution |
| 5 | 1 | Query reads from storage |
| 6 | 5 | Exporter uses query engine |
| 7 | 4, 5, 6 | Command uses all components |
| 8 | 5 | Dashboard uses query engine |

**Parallel groups:**
- Group A: Tasks 1, 2, 3 (independent foundations)
- Group B: Task 4 (after Group A)
- Group C: Tasks 5, 6, 8 (after Task 4, can parallelize)
- Group D: Task 7 (after all)

## Estimated Scope

- Tasks: 8
- Files: 16 (8 modules + 8 test files)
- Tests: ~75 (estimated)
