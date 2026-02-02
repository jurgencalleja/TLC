# Phase 33: Multi-Model Router - Plan

## Overview

Two-tier routing system: CLI providers (free locally, paid on devserver) and API providers (devserver only). Supports Claude Code, Codex CLI, Gemini CLI, and API-only providers like DeepSeek.

**Guiding Principle:** CLI where available (free, richer features), API where there's no CLI (cheap, always available).

## Architecture

```
LOCAL ROUTER (runs on each person's machine — all free)
├── claude       → Claude Code (Max/Pro subscription)
├── codex        → Codex CLI (ChatGPT Plus/Pro subscription)
└── gemini       → Gemini CLI (Google account, no subscription needed)

DEVSERVER ROUTER (one machine, API keys, headless — pay per token)
├── claude -p    → CLI headless (ANTHROPIC_API_KEY)
├── codex exec   → CLI headless (OPENAI_API_KEY)
├── gemini -p    → CLI headless (GOOGLE_API_KEY)
└── api          → direct REST calls for everything else
    ├── deepseek   (OpenAI-compatible endpoint)
    ├── mistral    (OpenAI-compatible endpoint)
    └── [any future model]
```

## Prerequisites

- [x] Phase 20 complete (Multi-LLM Infrastructure)
- [x] Existing adapters (Claude, OpenAI, DeepSeek)
- [x] Phase 32 complete (Agent Registry)

## Tasks

### Task 1: Provider Interface [x]

**Goal:** Unified interface for CLI and API providers

**Files:**
- server/lib/provider-interface.js
- server/lib/provider-interface.test.js

**Acceptance Criteria:**
- [ ] Provider interface with name, type, capabilities
- [ ] RunOpts: outputFormat, sandbox, outputSchema, cwd
- [ ] ProviderResult: raw, parsed, exitCode, tokenUsage, cost
- [ ] Factory function for creating providers
- [ ] Validate provider configuration

**Test Cases:**
- createProvider creates CLI provider
- createProvider creates API provider
- createProvider throws on invalid type
- provider.run returns ProviderResult shape
- ProviderResult includes token usage
- ProviderResult calculates cost
- provider.capabilities returns array
- validateConfig rejects missing fields
- validateConfig accepts valid config
- provider.type distinguishes cli from api

---

### Task 2: CLI Detection [x]

**Goal:** Detect locally installed CLI tools

**Files:**
- server/lib/cli-detector.js
- server/lib/cli-detector.test.js

**Acceptance Criteria:**
- [ ] Detect claude CLI (which + version)
- [ ] Detect codex CLI (which + version)
- [ ] Detect gemini CLI (which + version)
- [ ] Cache detection results
- [ ] Handle Windows/Mac/Linux paths
- [ ] Return capabilities per detected CLI

**Test Cases:**
- detectCLI finds claude when installed
- detectCLI returns null when not installed
- detectCLI gets version string
- detectAllCLIs returns map of detected
- detectAllCLIs caches results
- clearCache forces re-detection
- getCapabilities returns CLI capabilities
- handles Windows command extensions
- handles PATH variations
- timeout on slow detection

---

### Task 3: CLI Provider [x]

**Goal:** Provider implementation for CLI tools

**Files:**
- server/lib/cli-provider.js
- server/lib/cli-provider.test.js

**Acceptance Criteria:**
- [ ] runLocal: spawn CLI with JSON output
- [ ] runViaDevserver: POST to devserver API
- [ ] Build headless args per CLI type
- [ ] Parse JSON output from CLI
- [ ] Handle CLI errors gracefully
- [ ] Timeout handling

**Test Cases:**
- runLocal spawns claude -p with args
- runLocal spawns codex exec with args
- runLocal spawns gemini -p with args
- runLocal parses JSON output
- runLocal handles non-JSON output
- runLocal respects timeout
- runViaDevserver posts to devserver
- runViaDevserver polls for result
- buildArgs includes output-format json
- buildArgs includes sandbox for codex

---

### Task 4: API Provider [x]

**Goal:** Provider implementation for REST API endpoints

**Files:**
- server/lib/api-provider.js
- server/lib/api-provider.test.js

**Acceptance Criteria:**
- [ ] Call OpenAI-compatible endpoints
- [ ] Support response_format.json_schema
- [ ] Parse token usage from response
- [ ] Calculate cost from token counts
- [ ] Handle rate limits with retry
- [ ] Support multiple API providers

**Test Cases:**
- run calls baseUrl/v1/chat/completions
- run sets Authorization header
- run sends model in body
- run includes response_format when schema provided
- parseResponse extracts content
- parseResponse extracts token usage
- calculateCost uses provider pricing
- retryOnRateLimit waits and retries
- handles network errors gracefully
- supports DeepSeek endpoint

---

### Task 5: Router Core [x]

**Goal:** Route requests to appropriate provider

**Files:**
- server/lib/model-router.js
- server/lib/model-router.test.js

**Acceptance Criteria:**
- [ ] resolveProvider: find provider by name
- [ ] resolveCapability: find providers for capability
- [ ] Cascade: local CLI → devserver CLI → devserver API
- [ ] Load config from .tlc.json
- [ ] Handle unavailable providers gracefully

**Test Cases:**
- resolveProvider returns local when CLI detected
- resolveProvider returns devserver when CLI not detected
- resolveProvider returns devserver for API type
- resolveCapability returns ordered providers
- resolveCapability filters by capability
- cascade tries local first
- cascade falls back to devserver
- loadConfig reads from .tlc.json
- loadConfig uses defaults when missing
- handleUnavailable skips to next

---

### Task 6: Structured Output Schemas [x]

**Goal:** Standard JSON schemas for provider outputs

**Files:**
- server/lib/output-schemas.js
- server/lib/output-schemas.test.js
- .tlc/schemas/review-result.json
- .tlc/schemas/design-result.json

**Acceptance Criteria:**
- [ ] review-result schema (summary, issues, score, approved)
- [ ] design-result schema (mockups, rationale, alternatives)
- [ ] code-result schema (files, explanation, tests)
- [ ] Load schemas from .tlc/schemas/
- [ ] Validate output against schema
- [ ] Prompt injection for schema enforcement

**Test Cases:**
- loadSchema reads from file
- loadSchema returns parsed JSON
- validateOutput passes valid data
- validateOutput rejects invalid data
- reviewResultSchema has required fields
- designResultSchema has required fields
- codeResultSchema has required fields
- buildPromptWithSchema injects schema
- schemaToPromptInstructions creates text
- handles missing schema file

---

### Task 7: Devserver Service Endpoints [ ]

**Goal:** HTTP API for devserver task execution

**Files:**
- server/lib/devserver-router-api.js
- server/lib/devserver-router-api.test.js

**Acceptance Criteria:**
- [ ] POST /api/run - queue task, return taskId
- [ ] GET /api/task/:taskId - get status/result
- [ ] POST /api/review - multi-model review
- [ ] POST /api/design - design generation
- [ ] GET /api/health - provider availability
- [ ] Authentication for devserver requests

**Test Cases:**
- POST /api/run queues task
- POST /api/run returns taskId
- GET /api/task returns pending status
- GET /api/task returns completed result
- POST /api/review runs multiple providers
- POST /api/review returns consensus
- POST /api/design routes to gemini
- GET /api/health shows provider status
- rejects unauthenticated requests
- validates request body

---

### Task 8: Task Queue [x]

**Goal:** Queue concurrent provider tasks

**Files:**
- server/lib/provider-queue.js
- server/lib/provider-queue.test.js

**Acceptance Criteria:**
- [ ] maxConcurrent limit (default 3)
- [ ] FIFO ordering
- [ ] Task timeout handling
- [ ] Queue status reporting
- [ ] Priority levels (urgent, normal, low)

**Test Cases:**
- enqueue adds task to queue
- dequeue respects maxConcurrent
- dequeue processes FIFO
- timeout cancels slow tasks
- getStatus returns queue length
- getStatus returns running count
- priority urgent goes first
- priority affects ordering
- clearQueue removes all pending
- drainQueue waits for completion

---

### Task 9: Router Config Schema [x]

**Goal:** Configuration schema for .tlc.json router section

**Files:**
- server/lib/router-config.js
- server/lib/router-config.test.js

**Acceptance Criteria:**
- [ ] capabilities section (providers per capability)
- [ ] providers section (type, command, capabilities)
- [ ] devserver section (url, queue settings)
- [ ] Validate config on load
- [ ] Merge with defaults
- [ ] Migration from old config format

**Test Cases:**
- loadRouterConfig reads from .tlc.json
- loadRouterConfig validates schema
- loadRouterConfig merges defaults
- validateCapabilities checks provider refs
- validateProviders checks required fields
- getProviderConfig returns provider
- getCapabilityConfig returns providers array
- migrateConfig handles old format
- defaultConfig has sensible defaults
- saveRouterConfig writes to file

---

### Task 10: Router Setup Command [ ]

**Goal:** Interactive setup for multi-model routing

**Files:**
- server/lib/router-setup-command.js
- server/lib/router-setup-command.test.js

**Acceptance Criteria:**
- [ ] Detect installed CLIs
- [ ] Test devserver connection
- [ ] Configure providers
- [ ] Configure capabilities
- [ ] Show routing summary
- [ ] Estimate costs

**Test Cases:**
- execute detects local CLIs
- execute tests devserver connection
- execute shows routing table
- execute shows cost estimate
- configureProvider adds to config
- configureCapability sets providers
- testProvider validates connectivity
- formatRoutingSummary shows local/devserver
- estimateCosts calculates per capability
- saveConfig writes .tlc.json

---

### Task 11: Router Dashboard Pane [ ]

**Goal:** Dashboard component for model routing

**Files:**
- dashboard/src/components/RouterPane.tsx
- dashboard/src/components/RouterPane.test.tsx

**Acceptance Criteria:**
- [ ] Show detected CLIs with versions
- [ ] Show devserver status
- [ ] Show routing table (capability → providers)
- [ ] Show cost estimates
- [ ] Provider health indicators
- [ ] Configure routing from UI

**Test Cases:**
- renders detected CLIs
- shows CLI versions
- shows devserver connected/disconnected
- renders routing table
- shows local vs devserver badges
- shows cost estimates
- health indicators show status
- configure button opens modal
- handles loading state
- handles error state

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 3 | 1, 2 | CLI provider uses interface and detection |
| 4 | 1 | API provider uses interface |
| 5 | 2, 3, 4 | Router uses detection and providers |
| 6 | 1 | Schemas used by provider interface |
| 7 | 5, 8 | API uses router and queue |
| 8 | - | Independent queue implementation |
| 9 | 5 | Config defines router behavior |
| 10 | 2, 5, 9 | Setup uses detection, router, config |
| 11 | 5, 9 | Dashboard shows router state |

**Parallel groups:**
- Group A: Tasks 1, 2, 8 (independent foundations)
- Group B: Tasks 3, 4, 6 (after 1, can parallelize)
- Group C: Task 5 (after 2, 3, 4)
- Group D: Tasks 7, 9 (after 5, can parallelize)
- Group E: Tasks 10, 11 (after dependencies, can parallelize)

## Configuration Example

```json
{
  "router": {
    "capabilities": {
      "review": {
        "providers": ["claude", "codex", "deepseek"],
        "consensus": "majority"
      },
      "design": {
        "providers": ["gemini"]
      },
      "code-gen": {
        "providers": ["claude"]
      }
    },
    "providers": {
      "claude": {
        "type": "cli",
        "command": "claude",
        "headlessArgs": ["-p", "--output-format", "json"],
        "capabilities": ["review", "code-gen", "refactor"]
      },
      "codex": {
        "type": "cli",
        "command": "codex",
        "headlessArgs": ["exec", "--json", "--sandbox", "read-only"],
        "capabilities": ["review", "code-gen", "refactor"]
      },
      "gemini": {
        "type": "cli",
        "command": "gemini",
        "headlessArgs": ["-p", "--output-format", "json"],
        "capabilities": ["design", "image-gen", "vision", "review"]
      },
      "deepseek": {
        "type": "api",
        "baseUrl": "https://api.deepseek.com",
        "model": "deepseek-coder",
        "capabilities": ["review"],
        "devserverOnly": true
      }
    },
    "devserver": {
      "url": "https://tlc.devserver.yourdomain.com",
      "queue": {
        "maxConcurrent": 3,
        "timeout": 120000
      }
    }
  }
}
```

## Estimated Scope

- Tasks: 11
- Files: 24 (11 modules + 11 test files + 2 schemas)
- Tests: ~120 (estimated)
