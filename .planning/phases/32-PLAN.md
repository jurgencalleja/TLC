# Phase 32: Agent Registry & Lifecycle - Plan

## Overview

Central registry for managing agent instances, their state, and lifecycle. Foundation for all orchestration features.

## Prerequisites

- [x] Phase 20 complete (Multi-LLM Infrastructure)
- [x] Existing agent adapters (Claude, OpenAI, DeepSeek)

## Tasks

### Task 1: Agent Registry [x]

**Goal:** Central store for tracking all agent instances

**Files:**
- server/lib/agent-registry.js
- server/lib/agent-registry.test.js

**Acceptance Criteria:**
- [ ] Register new agent with metadata
- [ ] List all agents (with filters)
- [ ] Get agent by ID
- [ ] Remove agent from registry
- [ ] Query by status, model, type
- [ ] Singleton pattern for global access

**Test Cases:**
- registerAgent adds agent to registry
- registerAgent generates unique ID
- listAgents returns all agents
- listAgents filters by status
- listAgents filters by model
- getAgent returns agent by ID
- getAgent returns null for unknown ID
- removeAgent deletes from registry
- removeAgent returns false for unknown ID
- registry is singleton across imports

---

### Task 2: Agent State Machine [x]

**Goal:** Manage agent lifecycle states with transitions

**Files:**
- server/lib/agent-state.js
- server/lib/agent-state.test.js

**Acceptance Criteria:**
- [ ] States: pending, running, completed, failed, cancelled
- [ ] Valid transitions only
- [ ] State change events
- [ ] Transition timestamps
- [ ] Transition reason/metadata

**Test Cases:**
- createAgentState starts in pending
- transition from pending to running succeeds
- transition from running to completed succeeds
- transition from running to failed succeeds
- transition from running to cancelled succeeds
- transition from pending to completed fails (invalid)
- transition from completed to running fails (invalid)
- onTransition callback fires on state change
- getHistory returns all transitions
- getElapsedTime calculates duration

---

### Task 3: Agent Metadata [x]

**Goal:** Track agent execution details

**Files:**
- server/lib/agent-metadata.js
- server/lib/agent-metadata.test.js

**Acceptance Criteria:**
- [ ] Track model used
- [ ] Track token counts (input/output)
- [ ] Track cost (calculated from tokens)
- [ ] Track duration
- [ ] Track task type and parameters
- [ ] Immutable after completion

**Test Cases:**
- createMetadata initializes with model and task
- updateTokens adds input/output tokens
- updateTokens calculates total
- calculateCost uses model pricing
- calculateCost handles unknown models
- setDuration records elapsed time
- freeze prevents further updates
- toJSON serializes all fields
- fromJSON deserializes correctly
- validates required fields

---

### Task 4: Lifecycle Hooks [x]

**Goal:** Extension points for agent lifecycle events

**Files:**
- server/lib/agent-hooks.js
- server/lib/agent-hooks.test.js

**Acceptance Criteria:**
- [ ] onStart hook (before execution)
- [ ] onComplete hook (after success)
- [ ] onError hook (after failure)
- [ ] onCancel hook (after cancellation)
- [ ] Multiple handlers per hook
- [ ] Async handler support

**Test Cases:**
- registerHook adds handler
- registerHook validates hook type
- triggerHook calls all handlers
- triggerHook passes agent context
- triggerHook awaits async handlers
- triggerHook continues on handler error
- removeHook removes specific handler
- clearHooks removes all handlers
- hooks execute in registration order
- onStart receives task config

---

### Task 5: Agent Persistence [x]

**Goal:** Save/restore agent state across sessions

**Files:**
- server/lib/agent-persistence.js
- server/lib/agent-persistence.test.js

**Acceptance Criteria:**
- [ ] Save agent state to disk
- [ ] Restore agents on startup
- [ ] Handle incomplete agents (mark stale)
- [ ] Cleanup old agent records
- [ ] Configurable storage path

**Test Cases:**
- saveAgent writes to storage directory
- saveAgent creates directory if missing
- loadAgent restores from disk
- loadAgent returns null for missing
- loadAllAgents restores all
- loadAllAgents marks stale agents
- cleanupOldAgents removes by age
- cleanupOldAgents respects retention
- handles corrupt files gracefully
- concurrent save/load works correctly

---

### Task 6: Agent Cleanup [x]

**Goal:** Handle timeouts and orphaned agents

**Files:**
- server/lib/agent-cleanup.js
- server/lib/agent-cleanup.test.js

**Acceptance Criteria:**
- [ ] Detect timed-out agents
- [ ] Detect orphaned agents (no heartbeat)
- [ ] Cancel stale agents
- [ ] Cleanup resources on cancel
- [ ] Configurable timeouts
- [ ] Periodic cleanup task

**Test Cases:**
- detectTimedOut finds agents past timeout
- detectTimedOut respects per-agent timeout
- detectOrphaned finds agents without heartbeat
- cancelAgent transitions to cancelled state
- cancelAgent triggers onCancel hooks
- cleanupResources frees memory
- startCleanupTask runs periodically
- stopCleanupTask halts periodic runs
- cleanup handles missing agents gracefully
- getCleanupStats returns metrics

---

### Task 7: Registry Command [x]

**Goal:** CLI for agent registry operations

**Files:**
- server/lib/agent-registry-command.js
- server/lib/agent-registry-command.test.js

**Acceptance Criteria:**
- [ ] `tlc agents list` - show all agents
- [ ] `tlc agents list --status running` - filter by status
- [ ] `tlc agents get <id>` - show agent details
- [ ] `tlc agents cancel <id>` - cancel agent
- [ ] `tlc agents cleanup` - run cleanup
- [ ] Formatted table output

**Test Cases:**
- execute list shows all agents
- execute list filters by status
- execute list filters by model
- execute get shows agent details
- execute get shows error for missing
- execute cancel cancels agent
- execute cancel shows error for missing
- execute cleanup runs cleanup
- execute cleanup shows stats
- formatOutput creates readable table

---

### Task 8: Dashboard AgentRegistryPane [x]

**Goal:** Dashboard component for agent monitoring

**Files:**
- dashboard/src/components/AgentRegistryPane.tsx
- dashboard/src/components/AgentRegistryPane.test.tsx

**Acceptance Criteria:**
- [ ] List all agents with status badges
- [ ] Filter by status/model
- [ ] Show agent details on click
- [ ] Cancel button for running agents
- [ ] Auto-refresh every 2 seconds
- [ ] Show aggregate stats

**Test Cases:**
- renders agent list correctly
- shows status badges with colors
- filters by status
- filters by model
- shows agent details panel
- cancel button visible for running agents
- cancel button triggers action
- auto-refreshes agent list
- shows aggregate stats header
- handles empty state
- handles loading state
- handles error state

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | State machine attached to registered agents |
| 3 | 1 | Metadata stored with agents |
| 4 | 2 | Hooks trigger on state transitions |
| 5 | 1, 2, 3 | Persistence saves all agent data |
| 6 | 1, 2, 4 | Cleanup uses registry, state, hooks |
| 7 | 1-6 | Command uses all modules |
| 8 | 1-6 | Dashboard uses all modules |

**Parallel groups:**
- Group A: Task 1 (foundation)
- Group B: Tasks 2, 3 (after 1, independent)
- Group C: Task 4 (after 2)
- Group D: Tasks 5, 6 (after 1, 2, 3)
- Group E: Tasks 7, 8 (after all, can parallelize)

## Estimated Scope

- Tasks: 8
- Files: 16 (8 modules + 8 test files)
- Tests: ~100 (estimated)
