# Phase 69: Standalone LLM Service - Plan

## Overview

Redesign the LLM router from a CLI-detection config tool into a real execution service. When you configure `codex` as your provider, it should actually run Codex. No Claude dependency. The router should route, not just detect.

**The Problem:**
- `model-router.js` detects CLIs but never executes them
- `multi-model-reviewer.js` accepts a `reviewFn` but nothing provides one
- `llm-reviewer.js` builds prompts but has no execution engine
- `litellm-client.js` exists in isolation
- Result: 5 disconnected modules pretending to be a system

**The Fix:** One coherent service that actually works:

```
User configures provider → Router resolves it → Executor runs it → Parser returns structured result
```

## Prerequisites

- [x] Phase 33 (Model Router — detection/config)
- [x] Phase 58 (LiteLLM Gateway — API proxy)
- [x] Phase 65 (LLM Reviewer — prompt/parse)
- [x] Phase 68 (Multi-Model Reviewer — aggregation)

## Tasks

### Task 1: Provider Executor [ ]

**Goal:** Actually execute LLM requests through any provider. This is the missing piece — the bridge between "provider detected" and "review completed."

**Files:**
- `server/lib/llm/provider-executor.js`
- `server/lib/llm/provider-executor.test.js`

**Acceptance Criteria:**
- [ ] Execute via CLI providers (spawn `codex`, `gemini`, pipe prompt, capture output)
- [ ] Execute via API providers (HTTP to LiteLLM proxy or direct API)
- [ ] Execute via stdin/stdout for CLI tools that support it
- [ ] Configurable timeout per provider
- [ ] Return standardized response format regardless of provider
- [ ] Handle provider-specific response formats (Codex JSON, Gemini markdown, etc.)
- [ ] No Claude-specific code — provider-agnostic execution

**Test Cases (~12 tests):**
- Executes CLI provider via spawn
- Passes prompt as stdin to CLI
- Captures stdout as response
- Executes API provider via HTTP POST
- Handles CLI timeout (kills process)
- Handles API timeout
- Returns standardized { response, model, latency } format
- Handles provider exit code != 0
- Handles empty response
- Respects provider-specific args from config
- Works with injectable spawn/fetch for testing
- Strips ANSI codes from CLI output

---

### Task 2: Unified Review Service [ ]

**Goal:** One service that connects router → executor → prompt builder → response parser. Replace the current disconnected pieces with a single coherent flow.

**Files:**
- `server/lib/llm/review-service.js`
- `server/lib/llm/review-service.test.js`

**Acceptance Criteria:**
- [ ] Accept diff + config, return structured findings
- [ ] Resolve provider from router config (not hardcoded)
- [ ] Build review prompt using llm-reviewer's `buildReviewPrompt`
- [ ] Execute via provider-executor
- [ ] Parse response using llm-reviewer's `parseReviewResponse`
- [ ] Single-model mode: use first available provider
- [ ] Multi-model mode: fan out to all configured review providers
- [ ] Aggregate multi-model results using multi-model-reviewer's `aggregateFindings`
- [ ] Fall back to next provider if primary fails
- [ ] Return `{ findings, summary, provider, latency }`

**Test Cases (~14 tests):**
- Routes to configured provider
- Falls back to next provider on failure
- Single-model returns findings from one provider
- Multi-model fans out to all review providers
- Aggregates multi-model findings with deduplication
- Includes provider name in result
- Includes latency in result
- Skips docs-only changes
- Handles all providers failing (static-only fallback)
- Reads coding standards for prompt context
- Respects timeout from config
- Works with no config (sensible defaults)
- Provider order from config determines priority
- Stores review result for audit trail

---

### Task 3: Provider Registry [ ]

**Goal:** Runtime registry of available providers with health status. Replaces static CLI detection with live provider management.

**Files:**
- `server/lib/llm/provider-registry.js`
- `server/lib/llm/provider-registry.test.js`

**Acceptance Criteria:**
- [ ] Register providers with name, type (cli/api), and config
- [ ] Health check each provider (CLI: `which` + version, API: ping endpoint)
- [ ] Track provider status (available, unavailable, degraded)
- [ ] List providers by capability (review, code-gen, etc.)
- [ ] Get best available provider for a capability
- [ ] Cache health status with configurable TTL
- [ ] Emit events on provider status change
- [ ] Load initial providers from `.tlc.json`

**Test Cases (~12 tests):**
- Registers CLI provider
- Registers API provider
- Health check passes for available CLI
- Health check fails for missing CLI
- Health check passes for reachable API
- Health check fails for unreachable API
- Lists providers by capability
- Returns best available provider (first healthy in priority order)
- Caches health status within TTL
- Refreshes status after TTL expires
- Loads providers from config
- Handles empty config gracefully

---

### Task 4: CLI Provider Adapters [ ]

**Goal:** Specific adapters for each CLI tool (Codex, Gemini, Claude CLI) that handle their unique input/output formats.

**Files:**
- `server/lib/llm/adapters/codex-adapter.js`
- `server/lib/llm/adapters/codex-adapter.test.js`
- `server/lib/llm/adapters/gemini-adapter.js`
- `server/lib/llm/adapters/gemini-adapter.test.js`
- `server/lib/llm/adapters/api-adapter.js`
- `server/lib/llm/adapters/api-adapter.test.js`

**Acceptance Criteria:**
- [ ] Codex adapter: format prompt for Codex CLI, parse its JSON output
- [ ] Gemini adapter: format prompt for Gemini CLI, parse its markdown output
- [ ] API adapter: format HTTP request for OpenAI-compatible API (LiteLLM/direct)
- [ ] Each adapter implements `{ execute(prompt, options) → { response, metadata } }`
- [ ] Each adapter handles its provider's specific flags/args
- [ ] Each adapter normalizes output to common format
- [ ] Adapters are registerable (no hardcoded list)

**Test Cases (~15 tests):**
- Codex: builds correct CLI command
- Codex: parses JSON response
- Codex: handles non-JSON output gracefully
- Codex: passes model flag from config
- Codex: respects timeout
- Gemini: builds correct CLI command
- Gemini: parses markdown response
- Gemini: handles structured output mode
- Gemini: passes model flag from config
- Gemini: respects timeout
- API: sends correct HTTP request body
- API: parses OpenAI-format response
- API: includes auth header from config
- API: handles rate limiting (429)
- API: respects timeout

---

### Task 5: Integration Wiring [ ]

**Goal:** Wire the new service into the existing gate engine and commands. Replace stubs with real execution.

**Files:**
- `server/lib/llm/index.js`
- `server/lib/llm/index.test.js`

**Acceptance Criteria:**
- [ ] Export unified API: `createLLMService(config)` → `{ review(diff), execute(prompt), health() }`
- [ ] `review(diff)` uses review-service internally
- [ ] `execute(prompt)` is generic prompt execution (for /tlc:build, /tlc:plan)
- [ ] `health()` returns provider registry status
- [ ] Configurable via `.tlc.json` llm section
- [ ] Zero-config mode: auto-detect available providers
- [ ] Backward compatible with existing gate-engine integration points
- [ ] No breaking changes to existing tests

**Test Cases (~10 tests):**
- Creates service with config
- Creates service with zero config (auto-detect)
- review() returns structured findings
- execute() returns raw response
- health() returns provider statuses
- Falls back through providers on failure
- Respects multi-model config
- Works with single provider
- Exports clean public API
- Config validation catches bad provider references

## Dependencies

- Task 1 (executor) is independent
- Task 3 (registry) is independent
- Task 4 (adapters) depends on Task 1 (uses executor interface)
- Task 2 (review service) depends on Task 1 + Task 3
- Task 5 (wiring) depends on Tasks 1-4

**Parallel groups:**
- Group A: Tasks 1, 3 (independent)
- Group B: Task 4 (after Task 1)
- Group C: Task 2 (after Tasks 1, 3)
- Group D: Task 5 (after all)

## Estimated Scope

- Tasks: 5
- New Files: 12 (6 modules + 6 test files)
- Tests: ~63
- Replaces/supersedes: model-router.js detection logic, review-service gap

## Architecture

```
.tlc.json (llm config)
     ↓
provider-registry.js ←── adapters/ (codex, gemini, api)
     ↓                         ↓
review-service.js ←── provider-executor.js
     ↓
{ findings, summary, provider, latency }
```

Key principle: **configure a provider, it works.** No stubs, no "detection only", no Claude dependency.
