# Phase 29: Zero-Data-Retention Mode - Plan

## Overview

Privacy-first mode for enterprise environments where sensitive data must not persist. Enables ephemeral sessions, automatic purging, and configurable retention policies.

## Prerequisites

- [x] Phase 28 complete (Audit Logging with sensitive data detection)

## Tasks

### Task 1: Sensitive Data Detector [ ]

**Goal:** Detect and classify sensitive data types

**Files:**
- server/lib/sensitive-detector.js
- server/lib/sensitive-detector.test.js

**Acceptance Criteria:**
- [ ] Detects API keys (OpenAI, AWS, GitHub, etc.)
- [ ] Detects passwords and secrets
- [ ] Detects PII (emails, phone numbers, SSNs)
- [ ] Detects credit card numbers
- [ ] Detects private keys (RSA, SSH)
- [ ] Returns sensitivity level and type

**Test Cases:**
- detectSensitive identifies OpenAI API keys
- detectSensitive identifies AWS credentials
- detectSensitive identifies GitHub tokens
- detectSensitive identifies passwords in config
- detectSensitive identifies email addresses
- detectSensitive identifies phone numbers
- detectSensitive identifies SSN patterns
- detectSensitive identifies credit card numbers
- detectSensitive identifies private keys
- getSensitivityLevel returns 'critical' for secrets
- getSensitivityLevel returns 'high' for PII
- classifyType returns correct type for each pattern

---

### Task 2: Retention Policy Engine [ ]

**Goal:** Configurable retention policies per data type

**Files:**
- server/lib/retention-policy.js
- server/lib/retention-policy.test.js

**Acceptance Criteria:**
- [ ] Define policies per sensitivity level
- [ ] Define policies per data type
- [ ] Support time-based retention (hours, days)
- [ ] Support session-based retention
- [ ] Support immediate purge policy
- [ ] Load policies from .tlc.json

**Test Cases:**
- getPolicy returns policy for sensitivity level
- getPolicy returns policy for data type
- getPolicy returns default when no match
- evaluateRetention returns 'purge' for expired data
- evaluateRetention returns 'keep' for valid data
- evaluateRetention handles session-based policies
- loadPolicies reads from config file
- loadPolicies uses defaults when no config
- mergeWithDefaults combines user and default policies

---

### Task 3: Ephemeral Storage [ ]

**Goal:** In-memory storage that never touches disk

**Files:**
- server/lib/ephemeral-storage.js
- server/lib/ephemeral-storage.test.js

**Acceptance Criteria:**
- [ ] Stores data in memory only
- [ ] Auto-expires based on retention policy
- [ ] Provides same API as persistent storage
- [ ] Clears all data on process exit
- [ ] Supports encryption in memory

**Test Cases:**
- set stores value in memory
- get retrieves stored value
- get returns null for missing key
- set with TTL expires after time
- clear removes all data
- data not persisted to disk
- onExit clears all data
- encrypt option encrypts values in memory
- getStats returns memory usage

---

### Task 4: Session Purge Manager [ ]

**Goal:** Automatically purge data when sessions end

**Files:**
- server/lib/session-purge.js
- server/lib/session-purge.test.js

**Acceptance Criteria:**
- [ ] Detects session end (process exit, timeout)
- [ ] Purges all session-specific data
- [ ] Purges based on retention policies
- [ ] Logs purge actions (if audit enabled)
- [ ] Supports graceful and forced shutdown

**Test Cases:**
- onSessionEnd purges session data
- onSessionEnd respects retention policies
- onSessionEnd logs actions when audit enabled
- onProcessExit triggers purge
- onTimeout triggers purge after idle
- purgeByPolicy removes only matching data
- forcePurge removes all data immediately
- getPurgeReport returns what was purged

---

### Task 5: Memory Exclusion Patterns [ ]

**Goal:** Configure what data to exclude from persistence

**Files:**
- server/lib/memory-exclusion.js
- server/lib/memory-exclusion.test.js

**Acceptance Criteria:**
- [ ] Define file patterns to exclude
- [ ] Define content patterns to exclude
- [ ] Support whitelist and blacklist modes
- [ ] Apply to memory system writes
- [ ] Load patterns from config

**Test Cases:**
- shouldExclude returns true for .env files
- shouldExclude returns true for matching content
- shouldExclude returns false for safe content
- whitelist mode only allows listed patterns
- blacklist mode excludes listed patterns
- loadPatterns reads from config
- loadPatterns uses defaults when no config
- matchesPattern handles glob patterns
- matchesPattern handles regex patterns

---

### Task 6: Zero-Retention Mode [ ]

**Goal:** Master switch for zero-data-retention mode

**Files:**
- server/lib/zero-retention.js
- server/lib/zero-retention.test.js

**Acceptance Criteria:**
- [ ] Single toggle to enable mode
- [ ] Configures all subsystems appropriately
- [ ] Validates configuration on enable
- [ ] Reports mode status
- [ ] Integrates with existing memory system

**Test Cases:**
- enable activates zero-retention mode
- enable configures ephemeral storage
- enable configures session purge
- enable configures memory exclusions
- disable returns to normal mode
- isEnabled returns current state
- getConfig returns active configuration
- validate checks for conflicts
- validate warns about audit logging

---

### Task 7: Zero-Retention Command [ ]

**Goal:** CLI command to manage zero-retention mode

**Files:**
- server/lib/zero-retention-command.js
- server/lib/zero-retention-command.test.js

**Acceptance Criteria:**
- [ ] `tlc zero-retention enable` enables mode
- [ ] `tlc zero-retention disable` disables mode
- [ ] `tlc zero-retention status` shows current state
- [ ] `tlc zero-retention purge` forces immediate purge
- [ ] `tlc zero-retention config` shows configuration

**Test Cases:**
- execute enable activates mode
- execute disable deactivates mode
- execute status shows current state
- execute status shows policy summary
- execute purge forces immediate purge
- execute config shows configuration
- execute config --set updates settings
- formatStatus returns readable output
- formatConfig returns readable config

---

### Task 8: Dashboard ZeroRetentionPane [ ]

**Goal:** Dashboard component to manage zero-retention mode

**Files:**
- dashboard/src/components/ZeroRetentionPane.tsx
- dashboard/src/components/ZeroRetentionPane.test.tsx

**Acceptance Criteria:**
- [ ] Shows mode enabled/disabled status
- [ ] Toggle to enable/disable
- [ ] Shows retention policy summary
- [ ] Shows recent purge activity
- [ ] Warning when sensitive data detected

**Test Cases:**
- renders enabled state correctly
- renders disabled state correctly
- toggle calls onToggle callback
- shows retention policy summary
- shows purge activity list
- shows warning for sensitive data
- handles empty purge history
- formats policy for display

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 4 | 2, 3 | Purge manager uses policies and ephemeral storage |
| 6 | 1, 2, 3, 4, 5 | Master mode combines all components |
| 7 | 6 | Command uses zero-retention module |
| 8 | 6 | Dashboard uses zero-retention module |

**Parallel groups:**
- Group A: Tasks 1, 2, 3, 5 (independent foundations)
- Group B: Task 4 (after 2, 3)
- Group C: Task 6 (after all foundations)
- Group D: Tasks 7, 8 (after 6, can parallelize)

## Estimated Scope

- Tasks: 8
- Files: 16 (8 modules + 8 test files)
- Tests: ~80 (estimated)
