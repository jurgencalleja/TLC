# Phase 37: Orchestration Command - Plan

## Overview

CLI for agent management and AI operations control. Full agent control from command line.

## Prerequisites

- [x] Phase 32 complete (Agent Registry)
- [x] Phase 33 complete (Multi-Model Router)
- [x] Phase 34 complete (Cost Controller)
- [x] Phase 35 complete (Quality Gate)
- [x] Phase 36 complete (Orchestration Dashboard)

## Tasks

### Task 1: Agents List Command [ ]

**Goal:** List all agents with filtering

**Files:**
- server/lib/agents-list-command.js
- server/lib/agents-list-command.test.js

**Acceptance Criteria:**
- [ ] `tlc agents` - list all agents
- [ ] `tlc agents --status running` - filter by status
- [ ] `tlc agents --model claude` - filter by model
- [ ] `tlc agents --since 1h` - filter by time
- [ ] Table format output
- [ ] JSON output option

**Test Cases:**
- execute lists all agents
- execute filters by status
- execute filters by model
- execute filters by time
- formatTable creates readable output
- formatJSON creates valid JSON
- handles empty list
- shows helpful headers
- truncates long values
- respects terminal width

---

### Task 2: Agents Get Command [ ]

**Goal:** Get detailed agent information

**Files:**
- server/lib/agents-get-command.js
- server/lib/agents-get-command.test.js

**Acceptance Criteria:**
- [ ] `tlc agents get <id>` - show agent details
- [ ] Show full metadata
- [ ] Show state history
- [ ] Show token breakdown
- [ ] Show cost breakdown
- [ ] Show quality scores

**Test Cases:**
- execute shows agent details
- shows metadata section
- shows state history
- shows token breakdown
- shows cost breakdown
- shows quality scores
- handles unknown agent ID
- formatDetails creates sections
- JSON output option works
- includes timestamps

---

### Task 3: Agents Cancel Command [ ]

**Goal:** Cancel running agent

**Files:**
- server/lib/agents-cancel-command.js
- server/lib/agents-cancel-command.test.js

**Acceptance Criteria:**
- [ ] `tlc agents cancel <id>` - cancel agent
- [ ] `tlc agents cancel --all` - cancel all running
- [ ] Confirm prompt for destructive action
- [ ] `--force` skips confirmation
- [ ] Show cancellation result
- [ ] Handle already cancelled

**Test Cases:**
- execute cancels agent
- execute shows confirmation prompt
- execute with --force skips prompt
- execute --all cancels all running
- handles unknown agent ID
- handles already cancelled
- handles already completed
- shows result message
- updates agent state
- triggers cleanup

---

### Task 4: Agents Retry Command [ ]

**Goal:** Retry failed agent

**Files:**
- server/lib/agents-retry-command.js
- server/lib/agents-retry-command.test.js

**Acceptance Criteria:**
- [ ] `tlc agents retry <id>` - retry failed agent
- [ ] `tlc agents retry <id> --model claude` - retry with different model
- [ ] Include failure context
- [ ] Show new agent ID
- [ ] Track retry lineage

**Test Cases:**
- execute retries failed agent
- execute creates new agent
- execute includes failure context
- execute with --model overrides
- handles not failed agent
- handles unknown agent ID
- shows new agent ID
- tracks retry parent
- inherits original prompt
- respects budget limits

---

### Task 5: Agents Logs Command [ ]

**Goal:** View agent output and logs

**Files:**
- server/lib/agents-logs-command.js
- server/lib/agents-logs-command.test.js

**Acceptance Criteria:**
- [ ] `tlc agents logs <id>` - show agent output
- [ ] `--follow` for streaming
- [ ] `--tail <n>` for last n lines
- [ ] Show both stdout and stderr
- [ ] Timestamp prefixes
- [ ] Color coding

**Test Cases:**
- execute shows agent output
- execute with --follow streams
- execute with --tail limits lines
- shows stdout content
- shows stderr content
- timestamps are prefixed
- errors are colored red
- handles completed agent
- handles no output yet
- handles unknown agent ID

---

### Task 6: Optimize Command [ ]

**Goal:** Suggest optimizations

**Files:**
- server/lib/optimize-command.js
- server/lib/optimize-command.test.js

**Acceptance Criteria:**
- [ ] `tlc optimize` - show all suggestions
- [ ] `tlc optimize --cost` - cost optimizations
- [ ] `tlc optimize --quality` - quality improvements
- [ ] `tlc optimize --apply` - apply suggestions
- [ ] Explain each suggestion
- [ ] Show projected savings

**Test Cases:**
- execute shows all suggestions
- execute with --cost filters to cost
- execute with --quality filters to quality
- suggestions have explanations
- suggestions have savings estimates
- execute with --apply applies
- apply requires confirmation
- formats suggestions readably
- handles no suggestions
- prioritizes by impact

---

### Task 7: Models Command [ ]

**Goal:** List and configure models

**Files:**
- server/lib/models-command.js
- server/lib/models-command.test.js

**Acceptance Criteria:**
- [ ] `tlc models` - list available models
- [ ] `tlc models test <name>` - test connectivity
- [ ] `tlc models pricing` - show pricing
- [ ] `tlc models capabilities` - show capabilities
- [ ] Show local vs devserver
- [ ] Show health status

**Test Cases:**
- execute lists all models
- execute shows local/devserver
- execute test checks connectivity
- execute pricing shows costs
- execute capabilities shows features
- health status color coded
- handles offline models
- formatModels creates table
- detects local CLI availability
- shows devserver fallback

---

### Task 8: Orchestration Integration [ ]

**Goal:** Integrate with existing TLC commands

**Files:**
- server/lib/orchestration-integration.js
- server/lib/orchestration-integration.test.js

**Acceptance Criteria:**
- [ ] /tlc:build uses orchestration
- [ ] /tlc:review uses orchestration
- [ ] /tlc:refactor uses orchestration
- [ ] Agent tracking automatic
- [ ] Cost tracking automatic
- [ ] Quality gates applied

**Test Cases:**
- build command creates agents
- build command tracks cost
- review command uses multi-model
- review command applies consensus
- refactor command uses quality gate
- agents appear in registry
- costs appear in tracker
- quality scores recorded
- existing behavior preserved
- graceful fallback on error

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | Get is detail view of list |
| 3 | 1 | Cancel operates on listed agents |
| 4 | 1, 2 | Retry needs agent details |
| 5 | 1 | Logs for listed agents |
| 6 | - | Independent optimization |
| 7 | - | Independent models listing |
| 8 | 1-7 | Integration after commands |

**Parallel groups:**
- Group A: Tasks 1, 6, 7 (independent)
- Group B: Tasks 2, 3, 5 (after 1)
- Group C: Task 4 (after 1, 2)
- Group D: Task 8 (after all)

## Estimated Scope

- Tasks: 8
- Files: 16 (8 modules + 8 test files)
- Tests: ~85 (estimated)

---

## v1.5 Summary

| Phase | Name | Tasks | Tests (est) |
|-------|------|-------|-------------|
| 32 | Agent Registry & Lifecycle | 8 | ~100 |
| 33 | Multi-Model Router | 11 | ~120 |
| 34 | Cost Controller | 8 | ~95 |
| 35 | Quality Gate | 8 | ~90 |
| 36 | Orchestration Dashboard | 8 | ~85 |
| 37 | Orchestration Command | 8 | ~85 |
| **Total** | | **51** | **~575** |

## Key Deliverables

1. **Multi-Model Routing** - Claude, Codex, Gemini CLIs + API providers
2. **Local-First** - Free for developers with subscriptions
3. **Devserver Fallback** - Works for PMs/QA without CLI installs
4. **Cost Control** - Budget limits, projections, optimization
5. **Quality Gates** - Automatic retry with better models
6. **Full Visibility** - Dashboard and CLI for monitoring
