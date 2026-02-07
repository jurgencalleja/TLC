# Phase 64: TLC Standalone - Plan

## Overview

Terminal-based TLC that runs independently of Claude Code, using the LLM router to invoke locally available CLI tools (codex, gemini, etc.) and API providers. When Claude credits run out or Claude is unavailable, TLC continues working by routing through whatever LLM is available on the machine.

**Problem:** When Claude Code credits run out, all TLC commands stop working because they execute within the Claude Code session. The user is stuck — even though they have Codex CLI, Gemini CLI, or other models available.

**Solution:** A standalone `tlc` binary that:
1. Detects available LLM CLIs on the machine
2. Routes TLC operations through the best available provider
3. Runs entirely in the terminal — no Claude Code session required
4. Uses the existing router infrastructure (Phase 33) with real execution bridges

**Architecture:**
```
┌─────────────────────────────────────────────┐
│  Terminal                                    │
│                                              │
│  $ tlc plan 5                                │
│  $ tlc build 5                               │
│  $ tlc review                                │
│  $ tlc status                                │
│                                              │
│  ┌───────────────────────────────────────┐   │
│  │  TLC Standalone Runner                │   │
│  │  ┌──────────┐  ┌──────────────────┐   │   │
│  │  │ Command  │  │ LLM Router       │   │   │
│  │  │ Parser   │→ │ (capability →    │   │   │
│  │  │          │  │  best provider)  │   │   │
│  │  └──────────┘  └────────┬─────────┘   │   │
│  │                         │             │   │
│  │  ┌──────────────────────┼──────────┐  │   │
│  │  │      Provider Layer  │          │  │   │
│  │  │  ┌───────┐ ┌────────┐ ┌──────┐ │  │   │
│  │  │  │codex  │ │gemini  │ │claude│ │  │   │
│  │  │  │CLI    │ │CLI     │ │CLI   │ │  │   │
│  │  │  └───────┘ └────────┘ └──────┘ │  │   │
│  │  │  ┌───────┐ ┌────────┐          │  │   │
│  │  │  │litellm│ │API     │          │  │   │
│  │  │  │proxy  │ │direct  │          │  │   │
│  │  │  └───────┘ └────────┘          │  │   │
│  │  └────────────────────────────────┘  │   │
│  └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## Prerequisites

- [x] Phase 33 complete (Model Router infrastructure)
- [x] Phase 34 complete (Cost Controller)
- [x] Phase 58 complete (LiteLLM Gateway)

## Tasks

### Task 1: Provider Execution Bridge [ ]

**Goal:** Complete the stub `createProvider()` so providers actually execute CLI/API calls

**Files:**
- server/lib/provider-bridge.js
- server/lib/provider-bridge.test.js

**Context:** Currently `provider-interface.js:createProvider()` returns an object with a `run()` that returns an empty response. The `cli-provider.js` and `api-provider.js` exist but aren't wired into the factory. This task connects them.

**Acceptance Criteria:**
- [ ] `createCLIBridge(config)` wraps CLIProvider with standard interface
- [ ] `createAPIBridge(config)` wraps APIProvider with standard interface
- [ ] Bridge handles output parsing (JSON + plain text)
- [ ] Bridge captures token usage and cost from providers
- [ ] Fallback: if primary provider fails, try next in capability list
- [ ] Timeout per provider (configurable, default 120s)
- [ ] Streaming bridge: pipe CLI stdout to terminal in real-time

**Test Cases:**
- createCLIBridge wraps CLIProvider correctly
- createAPIBridge wraps APIProvider correctly
- bridge.run returns standardized ProviderResult
- bridge handles provider timeout
- bridge handles provider crash
- fallback tries next provider on failure
- fallback respects provider order
- streaming mode pipes output to callback
- cost accumulated across fallback attempts
- bridge validates output against schema when provided

---

### Task 2: Standalone CLI Entry Point [ ]

**Goal:** `bin/tlc-standalone.js` — the main executable that parses commands and dispatches

**Files:**
- bin/tlc-standalone.js
- server/lib/standalone-cli.js
- server/lib/standalone-cli.test.js

**Acceptance Criteria:**
- [ ] Shebang `#!/usr/bin/env node` for direct execution
- [ ] Parse commands: `tlc plan`, `tlc build`, `tlc status`, `tlc review`, `tlc test`
- [ ] `--provider` flag to force a specific provider
- [ ] `--model` flag to force a specific model
- [ ] `--dry-run` flag to show what would execute without running
- [ ] `--verbose` flag for debug output
- [ ] `--json` flag for machine-readable output
- [ ] Auto-detect available providers on startup
- [ ] Show provider selection: "Using codex (gemini also available)"
- [ ] Graceful error when no providers available
- [ ] Version from package.json

**Test Cases:**
- parses "plan 5" as command=plan, phase=5
- parses "build 3 --provider codex" correctly
- parses "--dry-run" flag
- parses "--json" flag
- detects available providers on startup
- selects best provider for command capability
- shows "no providers available" error
- --version shows package version
- --help shows usage
- unknown command shows help

---

### Task 3: Prompt Builder [ ]

**Goal:** Translate TLC commands into LLM prompts that any model can execute

**Files:**
- server/lib/prompt-builder.js
- server/lib/prompt-builder.test.js

**Context:** TLC commands today are Claude Code slash command `.md` files — they contain instructions *for Claude*. For standalone mode, we need to translate the *intent* of each command into a structured prompt that any LLM can understand and execute.

**Acceptance Criteria:**
- [ ] `buildPlanPrompt(phase, context)` — generates prompt for planning
- [ ] `buildBuildPrompt(phase, task, context)` — generates prompt for implementation
- [ ] `buildTestPrompt(phase, task, context)` — generates prompt for test writing
- [ ] `buildReviewPrompt(files, context)` — generates prompt for code review
- [ ] `buildStatusPrompt(context)` — generates prompt for status check
- [ ] Each prompt includes: project context (from PROJECT.md), phase context (from ROADMAP.md), relevant plan context (from PLAN.md), coding standards
- [ ] Prompts are provider-agnostic (no Claude-specific instructions)
- [ ] Output format instructions included (JSON schema for structured tasks)
- [ ] Token budget awareness (truncate context for smaller models)

**Test Cases:**
- buildPlanPrompt includes phase description from ROADMAP.md
- buildPlanPrompt includes project tech stack
- buildBuildPrompt includes task acceptance criteria
- buildBuildPrompt includes test-first instruction
- buildTestPrompt generates test-first prompt
- buildReviewPrompt includes file contents
- buildStatusPrompt includes phase progress
- prompts respect token budget (truncate when needed)
- prompts include output format instructions
- buildPlanPrompt works without optional context files

---

### Task 4: Response Parser [ ]

**Goal:** Parse LLM responses back into TLC artifacts (plan files, test files, code)

**Files:**
- server/lib/response-parser.js
- server/lib/response-parser.test.js

**Context:** Different LLMs return responses in different formats. Codex may return files directly, Gemini may return markdown with code blocks. We need a unified parser that extracts TLC artifacts regardless of provider.

**Acceptance Criteria:**
- [ ] `parsePlanResponse(response)` → structured plan object
- [ ] `parseBuildResponse(response)` → array of file changes
- [ ] `parseTestResponse(response)` → array of test files
- [ ] `parseReviewResponse(response)` → review report object
- [ ] Extract code blocks from markdown responses
- [ ] Extract file paths from response (```filename.js or file: path)
- [ ] Handle JSON responses (structured output from capable models)
- [ ] Handle plain text responses (fallback parsing)
- [ ] Validate extracted artifacts (files have content, plans have tasks)

**Test Cases:**
- parsePlanResponse extracts tasks from markdown
- parsePlanResponse extracts acceptance criteria
- parseBuildResponse extracts code blocks with filenames
- parseBuildResponse handles multiple files
- parseTestResponse extracts test code
- parseReviewResponse extracts issues and score
- handles JSON structured response
- handles plain text response
- handles mixed markdown with code blocks
- validates plan has at least one task
- handles malformed response gracefully

---

### Task 5: File Writer (Apply Changes) [ ]

**Goal:** Apply LLM-generated file changes to disk safely

**Files:**
- server/lib/file-writer.js
- server/lib/file-writer.test.js

**Context:** When the LLM generates code/tests/plans, we need to write them to disk. This must handle creating directories, avoiding overwrites without confirmation, and maintaining git-friendly diffs.

**Acceptance Criteria:**
- [ ] `writeFiles(changes, options)` — write array of file changes
- [ ] `writePlan(plan, phase)` — write plan to `.planning/phases/{N}-PLAN.md`
- [ ] `writeTests(tests, phase)` — write test files to correct locations
- [ ] `writeCode(code)` — write implementation files
- [ ] Create parent directories automatically
- [ ] Preview mode: show diff before writing
- [ ] Backup existing files before overwrite (`.bak`)
- [ ] Dry-run mode: show what would be written without writing
- [ ] Git-add option: stage written files automatically

**Test Cases:**
- writeFiles creates files on disk
- writeFiles creates parent directories
- writePlan writes to correct path
- writeTests writes to configured test directory
- preview mode shows diff without writing
- backup creates .bak before overwrite
- dry-run mode returns changes without writing
- handles empty changes array
- handles file permission errors gracefully
- git-add stages written files

---

### Task 6: Standalone Command Handlers [ ]

**Goal:** Implement each TLC command for standalone mode

**Files:**
- server/lib/standalone-commands.js
- server/lib/standalone-commands.test.js

**Context:** Map each TLC command to: read context → build prompt → send to provider → parse response → write artifacts → report results.

**Acceptance Criteria:**
- [ ] `handlePlan(phase, options)` — full plan workflow
- [ ] `handleBuild(phase, options)` — full build workflow (test-first)
- [ ] `handleStatus(options)` — check project state
- [ ] `handleReview(options)` — review current changes
- [ ] `handleTest(options)` — run tests and report
- [ ] Each handler follows: context → prompt → provider → parse → write → report
- [ ] Build enforces test-first: writes tests, verifies they fail, then implements
- [ ] Handlers read/write TLC artifacts (PLAN.md, TESTS.md, etc.)
- [ ] Progress output to terminal (spinner, step indicators)
- [ ] Error recovery: if provider fails mid-command, save partial progress

**Test Cases:**
- handlePlan reads ROADMAP.md for phase context
- handlePlan writes PLAN.md via file-writer
- handleBuild writes tests before implementation
- handleBuild runs test suite after implementation
- handleStatus reads phase files and reports progress
- handleReview collects changed files
- handleTest runs configured test command
- handler saves partial progress on provider failure
- handler reports cost after completion
- handler respects --dry-run flag

---

### Task 7: Terminal UI (Progress & Output) [ ]

**Goal:** Rich terminal output for standalone mode

**Files:**
- server/lib/terminal-ui.js
- server/lib/terminal-ui.test.js

**Context:** Standalone TLC needs visual feedback: provider selection, progress spinners, diffs, cost tracking. Must work in any terminal (no Ink dependency — pure ANSI).

**Acceptance Criteria:**
- [ ] `showProviderSelection(available, selected)` — which LLM is being used
- [ ] `showProgress(step, total, message)` — step progress
- [ ] `showDiff(before, after, filename)` — colorized diff
- [ ] `showCost(tokens, cost, provider)` — cost summary
- [ ] `showTestResults(results)` — pass/fail table
- [ ] `showError(error, suggestion)` — error with recovery hint
- [ ] `spinner(message)` — animated spinner
- [ ] Pure ANSI escape codes (no external dependencies)
- [ ] Detect color support (NO_COLOR env, dumb terminal)
- [ ] `--json` mode suppresses all UI, outputs JSON only

**Test Cases:**
- showProviderSelection formats provider list
- showProgress shows step N of M
- showDiff shows added/removed lines
- showCost formats token count and dollar amount
- showTestResults shows pass/fail counts
- showError includes suggestion
- spinner returns stop function
- respects NO_COLOR environment variable
- json mode returns structured output
- handles non-TTY gracefully (CI environments)

---

### Task 8: Provider Health & Selection [ ]

**Goal:** Smart provider selection based on availability, cost, and capability

**Files:**
- server/lib/provider-selector.js
- server/lib/provider-selector.test.js

**Context:** When multiple providers are available, pick the best one. Consider: is it running? does it have credits? how fast is it? what's the cost?

**Acceptance Criteria:**
- [ ] `selectProvider(capability, options)` — pick best provider
- [ ] Health check: verify provider responds before selecting
- [ ] Cost-aware: prefer cheaper provider when quality is equal
- [ ] Speed-aware: prefer faster provider for interactive commands
- [ ] Fallback chain: if selected provider fails, try next
- [ ] Provider preference from config (user can set preferred order)
- [ ] Cache health status (TTL: 60 seconds)
- [ ] Show why a provider was selected (for --verbose)

**Test Cases:**
- selectProvider returns available provider
- selectProvider prefers user-configured order
- selectProvider skips unhealthy provider
- selectProvider prefers cheaper for equal capability
- health check detects unavailable provider
- health check caches results
- fallback chain tries all providers
- respects --provider flag override
- handles all providers unavailable
- verbose mode explains selection reason

---

### Task 9: Configuration & Setup [ ]

**Goal:** First-run setup and configuration for standalone mode

**Files:**
- server/lib/standalone-config.js
- server/lib/standalone-config.test.js

**Context:** When user runs `tlc` for the first time in standalone mode, detect what's available and configure.

**Acceptance Criteria:**
- [ ] `detectEnvironment()` — scan for available CLIs, API keys, LiteLLM
- [ ] `runSetup()` — interactive first-run configuration
- [ ] `loadConfig()` — load from `.tlc.json` with standalone section
- [ ] Detect: claude CLI, codex CLI, gemini CLI, LiteLLM proxy, API keys in env
- [ ] Store provider preferences in `.tlc.json`
- [ ] Support environment variables: `TLC_PROVIDER`, `TLC_MODEL`
- [ ] `tlc config` command to reconfigure
- [ ] Show setup summary: "Found: codex (v1.2), gemini (v3.0). No claude."

**Test Cases:**
- detectEnvironment finds installed CLIs
- detectEnvironment checks env vars for API keys
- detectEnvironment checks LiteLLM availability
- runSetup writes config to .tlc.json
- loadConfig reads standalone section
- loadConfig merges with defaults
- TLC_PROVIDER env overrides config
- TLC_MODEL env overrides config
- setup shows available providers summary
- handles no providers found gracefully

---

### Task 10: npm Package Configuration [ ]

**Goal:** Package `tlc-standalone` as installable npm binary

**Files:**
- package.json (update)
- bin/tlc-standalone.js (from Task 2)

**Acceptance Criteria:**
- [ ] `npx tlc-standalone` works
- [ ] `npm install -g tlc-standalone` installs `tlc` binary
- [ ] Binary name: `tlc` (with `tlc-standalone` fallback if `tlc` conflicts)
- [ ] Minimal dependencies (no Ink, no React, no dashboard)
- [ ] Works on macOS, Linux, Windows
- [ ] package.json bin field configured
- [ ] ESM module with Node 18+ target

**Test Cases:**
- package.json has bin field
- bin/tlc-standalone.js has shebang
- no dashboard dependencies imported
- version matches package.json
- help text shows all commands
- works without .tlc.json (first-run flow)

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | CLI entry point uses provider bridge |
| 3 | - | Independent (prompt generation) |
| 4 | - | Independent (response parsing) |
| 5 | - | Independent (file I/O) |
| 6 | 1, 2, 3, 4, 5 | Commands combine all pieces |
| 7 | - | Independent (terminal output) |
| 8 | 1 | Selection uses provider bridge for health |
| 9 | 8 | Config includes provider selection |
| 10 | 2, 6 | Package wraps CLI entry + commands |

**Parallel groups:**
- Group A (independent foundations): Tasks 1, 3, 4, 5, 7
- Group B (needs bridge): Tasks 2, 8
- Group C (needs most pieces): Task 6
- Group D (needs setup): Task 9
- Group E (packaging): Task 10

## Key Design Decisions

### 1. No Claude Code Dependency
Standalone mode must work without Claude Code installed. It uses the same `.planning/` files and `.tlc.json` but doesn't require Claude's slash command system.

### 2. Provider-Agnostic Prompts
Prompts don't say "you are Claude" or use Claude-specific features. They describe the task in universal terms that any capable LLM can execute.

### 3. Test-First Still Enforced
Even in standalone mode, `tlc build` writes tests first, verifies they fail, then implements. The LLM is instructed to follow Red-Green-Refactor regardless of which model it is.

### 4. Pure ANSI Terminal UI
No Ink or React for standalone. Pure ANSI escape codes for progress, diffs, and output. Works in any terminal.

### 5. Graceful Degradation
If only a weak model is available (e.g., local Ollama), standalone still works — it just generates simpler output. Quality gates from Phase 35 can flag when output needs review.

## Estimated Scope

- Tasks: 10
- Files: 20 (10 modules + 10 test files)
- Tests: ~100 (estimated)
