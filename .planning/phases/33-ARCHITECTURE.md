# TLC Multi-Model Router Architecture

## Context

TLC currently uses Claude Code as its primary AI engine. We want to extend this to support multiple AI models — OpenAI (via Codex CLI), Google (via Gemini CLI), and API-only providers like DeepSeek — for capabilities like multi-model code review consensus, design mockup generation, and CI/CD automation.

The guiding principle: **CLI where available (free, richer features), API where there's no CLI (cheap, always available)**. Non-developers on the team should never need to install anything — it should just work.

---

## Architecture Overview

Two routers. That's it.

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

### Why This Works

- All three major CLI tools (claude, codex, gemini) have headless/non-interactive modes with JSON output
- All three are free when run locally via subscription/account
- All three support API key auth for headless CI/CD on the devserver
- API-only providers (DeepSeek etc.) use the OpenAI-compatible REST format — no SDK needed
- No LiteLLM, no OpenRouter, no proxy layers, no Docker dependencies for the model layer

---

## Provider Types

Only two provider types exist in the entire system:

### 1. CLI Provider

Wraps any AI coding CLI tool. Runs locally (interactive, free) or on devserver (headless, paid).

```bash
# Claude Code
claude -p "review this code" --output-format json

# Codex CLI
codex exec "review this code" --json --sandbox read-only

# Gemini CLI
gemini -p "review this code" --output-format json
```

Same pattern, same output shape. TLC wraps them uniformly.

### 2. API Provider

Direct REST call to any OpenAI-compatible endpoint. Always runs on devserver (keys live there).

```bash
# DeepSeek, Mistral, Groq, etc. — all same format
curl -s https://api.deepseek.com/v1/chat/completions \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  -d '{"model":"deepseek-coder","messages":[...]}'
```

---

## Unified Interface

Every provider — whether CLI or API — should conform to the same interface:

```typescript
interface Provider {
  name: string;              // "claude" | "codex" | "gemini" | "deepseek"
  type: "cli" | "api";
  detected: boolean;         // local CLI available?
  capabilities: string[];    // ["review", "code-gen", "design", "image-gen"]

  run(prompt: string, opts: RunOpts): Promise<ProviderResult>;
}

interface RunOpts {
  outputFormat: "json" | "text";
  sandbox?: "read-only" | "workspace-write" | "full-auto";
  outputSchema?: object;     // enforce structured output
  cwd?: string;
}

interface ProviderResult {
  raw: string;               // raw output
  parsed: any;               // parsed JSON
  exitCode: number;
  tokenUsage?: {
    input: number;
    output: number;
  };
  cost?: number;
}
```

### CLI Provider Implementation

```typescript
class CLIProvider implements Provider {
  type = "cli" as const;

  async run(prompt: string, opts: RunOpts): Promise<ProviderResult> {
    // Determine if running locally or on devserver
    if (this.detected) {
      return this.runLocal(prompt, opts);
    }
    return this.runViaDevserver(prompt, opts);
  }

  private async runLocal(prompt: string, opts: RunOpts): Promise<ProviderResult> {
    // Spawn CLI process locally
    // claude -p "..." --output-format json
    // codex exec "..." --json
    // gemini -p "..." --output-format json
  }

  private async runViaDevserver(prompt: string, opts: RunOpts): Promise<ProviderResult> {
    // POST to devserver HTTP API, which spawns the CLI in headless mode
  }
}
```

### API Provider Implementation

```typescript
class APIProvider implements Provider {
  type = "api" as const;
  detected = false; // always devserver-only

  async run(prompt: string, opts: RunOpts): Promise<ProviderResult> {
    // Always routes through devserver
    // Direct REST call to OpenAI-compatible endpoint
    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        response_format: opts.outputSchema
          ? { type: "json_schema", json_schema: opts.outputSchema }
          : undefined
      })
    });
    // Parse and return in standard ProviderResult shape
  }
}
```

---

## Routing Logic

### Detection

On startup (or during `/tlc:setup`), detect what's installed locally:

```bash
which claude && claude --version   # Claude Code
which codex && codex --version     # Codex CLI
which gemini && gemini --version   # Gemini CLI
```

### Resolution

```typescript
function resolveProvider(name: string): { provider: Provider; via: "local" | "devserver" } {
  const config = providers[name];

  if (config.type === "cli") {
    if (localCLIDetected(config.command)) {
      return { provider: config, via: "local" };    // free
    }
    return { provider: config, via: "devserver" };   // headless, paid
  }

  if (config.type === "api") {
    return { provider: config, via: "devserver" };   // always devserver
  }
}

function resolveCapability(capability: string): Provider[] {
  const capConfig = config.router.capabilities[capability];
  return capConfig.providers.map(name => resolveProvider(name));
}
```

### Cascade

The priority is always: **local CLI (free) → devserver CLI headless (paid) → devserver API (paid)**.

```
Developer with all CLIs:
  /tlc:review → local claude + local codex + devserver deepseek
  Cost: $0.003 (just the deepseek tiebreaker)

PM with nothing installed:
  /tlc:review → devserver claude + devserver codex + devserver deepseek
  Cost: ~$0.10 (all three on devserver)

CI/CD automation:
  PR webhook → devserver claude + devserver codex + devserver deepseek
  Cost: ~$0.10 per PR
```

---

## Configuration

### `.tlc.json` (in repo, shared by team)

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
  },
  "review": {
    "outputSchema": ".tlc/schemas/review-result.json"
  },
  "design": {
    "outputSchema": ".tlc/schemas/design-result.json"
  }
}
```

### Devserver `.env`

```bash
# CLI headless mode API keys
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
GOOGLE_API_KEY=AIzaSy-xxxxx

# API-only providers
DEEPSEEK_API_KEY=sk-xxxxx
# MISTRAL_API_KEY=xxxxx       # uncomment when needed
# GROQ_API_KEY=xxxxx          # uncomment when needed
```

---

## Devserver Service

The devserver needs a thin HTTP service that accepts requests from TLC clients (PMs, QA, CI triggers) and executes them via CLI or API.

### Endpoints

```
POST /api/run
  Body: { provider, prompt, opts, trigger }
  → Queues task, returns taskId

GET /api/task/:taskId
  → Returns status + result when complete

POST /api/review
  Body: { branch, files?, providers? }
  → Runs multi-model review, returns consensus

POST /api/design
  Body: { prompt, references?, variants? }
  → Runs Gemini design generation

GET /api/health
  → Provider availability + queue status

GET /api/costs
  → Cost tracking per trigger, per provider, per user
```

### Execution

```typescript
// Devserver task executor
async function executeTask(task: Task): Promise<ProviderResult> {
  const provider = providers[task.provider];

  if (provider.type === "cli") {
    // Spawn CLI in headless mode
    const args = buildHeadlessArgs(provider, task);
    const result = await spawn(provider.command, args, {
      env: { ...process.env },  // picks up API keys from .env
      cwd: task.cwd,
      timeout: config.queue.timeout
    });
    return parseOutput(result);
  }

  if (provider.type === "api") {
    // Direct REST call
    return callOpenAICompatible(provider, task);
  }
}
```

### Queue

Simple job queue to prevent hammering APIs when multiple triggers fire:

```
Queue: maxConcurrent = 3
  Slot 1: claude -p (PR #47 review)
  Slot 2: codex exec (PR #47 review)
  Slot 3: deepseek API (PR #47 review)
  Waiting: gemini -p (scheduled design task)
```

---

## How Each TLC Command Uses This

### `/tlc:review`

```
1. Resolve providers for "review" capability → [claude, codex, deepseek]
2. For each provider:
   - If local CLI detected → run locally
   - If not → send to devserver
3. All three get the same prompt + outputSchema (.tlc/schemas/review-result.json)
4. Collect results, all conforming to same JSON shape
5. Run consensus engine (majority agreement)
6. Present unified result
```

### `/tlc:design`

```
1. Resolve provider for "design" capability → [gemini]
2. If local gemini CLI detected → run locally (free, Pro model access)
3. If not → send to devserver (API key, Flash model)
4. Return design output
```

### CI/CD (automated PR review)

```
1. GitHub webhook fires on PR open/update
2. Devserver receives webhook
3. Runs all review providers in headless mode (parallel, queued)
4. Posts consensus result as PR comment
5. Logs cost
```

---

## Structured Output Schema

All providers — CLI and API — are prompted to return the same JSON shape. TLC ships standard schemas.

### `.tlc/schemas/review-result.json`

```json
{
  "type": "object",
  "properties": {
    "summary": { "type": "string" },
    "issues": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "severity": { "enum": ["critical", "moderate", "suggestion"] },
          "file": { "type": "string" },
          "line": { "type": "integer" },
          "title": { "type": "string" },
          "description": { "type": "string" },
          "suggestion": { "type": "string" }
        },
        "required": ["severity", "file", "title", "description"]
      }
    },
    "score": { "type": "integer", "minimum": 0, "maximum": 100 },
    "approved": { "type": "boolean" }
  },
  "required": ["summary", "issues", "score", "approved"]
}
```

This schema is passed to:
- `claude -p` via prompt instruction (or `--output-format json` with schema in prompt)
- `codex exec` via `--output-schema review-result.json`
- `gemini -p` via prompt instruction
- API providers via `response_format.json_schema`

The consensus engine can then reliably compare structured results across all providers.

---

## Setup Experience

### Developer (has all CLIs)

```
/tlc:setup

  TLC Setup
  ─────────
  Detecting local AI tools...
  ✓ claude (v4.2.1) — Claude Code
  ✓ codex (v1.3.0) — Codex CLI
  ✓ gemini (v0.9.2) — Gemini CLI

  Devserver: https://tlc.devserver.yourdomain.com
  ✓ Connected — all providers available

  Routing:
    review  → local claude + local codex + devserver deepseek
    design  → local gemini
    code    → local claude

  All local. Your cost: $0 (except deepseek tiebreaker at ~$0.003/review)
  Ready!
```

### QA / PM (nothing installed)

```
/tlc:setup

  TLC Setup
  ─────────
  Detecting local AI tools...
  ✗ claude not found
  ✗ codex not found
  ✗ gemini not found

  Devserver: https://tlc.devserver.yourdomain.com
  ✓ Connected — all providers available via devserver

  Routing:
    review  → devserver (claude + codex + deepseek)
    design  → devserver (gemini)

  All tasks will run on devserver. No local setup needed.
  Ready!
```

### CI/CD (devserver only)

```bash
# GitHub Actions or devserver webhook handler
# Uses API keys from devserver .env — no personal accounts involved

claude -p "Review PR diff" --output-format json           # ANTHROPIC_API_KEY
codex exec "Review PR diff" --json --sandbox read-only    # OPENAI_API_KEY
gemini -p "Review PR diff" --output-format json           # GOOGLE_API_KEY
curl deepseek API                                          # DEEPSEEK_API_KEY
```

---

## Team Breakdown (8 people)

| Role | Local CLIs | Routing | Cost |
|------|-----------|---------|------|
| 4 Devs | claude + codex + gemini | Mostly local | ~$0/day |
| 2 QA | Maybe claude only | Mix local + devserver | ~$0.50/day |
| 2 PMs | None | All devserver | ~$1/day |
| CI/CD | N/A | All devserver | ~$0.10/PR |

**Estimated monthly devserver API cost: $20-50** (depending on PR volume and design usage).

Subscriptions the devs already have cover the local usage for free.

---

## Cost Tracking

The devserver logs every invocation:

```json
{
  "timestamp": "2026-02-02T10:30:00Z",
  "trigger": "pr-webhook",
  "pr": "#47",
  "provider": "claude",
  "mode": "headless",
  "tokens": { "input": 3200, "output": 890 },
  "cost": 0.035,
  "duration_ms": 4200
}
```

Dashboard shows:
- Cost per PR
- Cost per provider
- Cost per trigger type (CI, manual, scheduled)
- Daily/monthly totals
- Provider availability/latency

---

## Adding a New Model

One config block + one env var. No code changes.

```json
// Add to .tlc.json providers
"mistral": {
  "type": "api",
  "baseUrl": "https://api.mistral.ai",
  "model": "mistral-large-latest",
  "capabilities": ["review"],
  "devserverOnly": true
}
```

```bash
# Add to devserver .env
MISTRAL_API_KEY=xxxxx
```

If the model has a CLI tool in the future, change `type` to `"cli"` and it automatically gets local routing for free.

---

## Open Questions for This Session

These need resolving against the actual TLC codebase:

### 1. Current Provider/Adapter Architecture
How does TLC currently detect and interface with Claude Code? Is there an adapter pattern already? We need to understand what exists before extending it to support the two provider types (`cli` and `api`).

### 2. CLI Detection
Is there already a mechanism that checks for `claude` CLI availability on startup? We need to extend this to also detect `codex` and `gemini`. Where does this detection live?

### 3. Devserver HTTP Service
Does the devserver already have an HTTP API that TLC clients can call? If so, we add the `/api/run`, `/api/review`, `/api/design` endpoints to it. If not, we need a lightweight service (Express/Fastify) that accepts tasks and spawns CLI processes.

### 4. Task Queue
When multiple providers run in parallel (3 concurrent reviews), and multiple triggers fire simultaneously (2 PRs + a manual review), we need queueing. Is there an existing queue mechanism on the devserver, or do we need to add one (e.g. BullMQ, or even a simple in-memory queue)?

### 5. Config Schema
What does `.tlc.json` look like currently? The proposed `router` section needs to coexist with existing config. Are there any conflicts?

### 6. Command Interface
Do `/tlc:review` and other commands currently assume Claude-only, or is there already abstraction for multiple providers? How much refactoring is needed to support `resolveCapability("review") → [claude, codex, deepseek]`?

### 7. Structured Output Enforcement
When Claude Code runs a review today, what format does the result come in? We need all providers to return the same JSON shape (see the `review-result.json` schema above). Does the current review output already conform to something structured, or is it freeform?

### 8. Devserver Auth for Gemini
Gemini CLI's free tier locally gives 60 req/min, 1000 req/day with Pro/Flash blend. On the devserver with `GOOGLE_API_KEY`, it's Flash-only. For Design Studio, do we need Gemini Pro on the devserver? If so, we should use Vertex AI auth instead of a plain API key. For review tasks, Flash is fine.

### 9. The PM/QA Flow
When a PM runs `/tlc:review` and has no local CLIs, TLC needs to transparently route to the devserver. Is the current command execution model synchronous (wait for result) or async (fire and poll)? The devserver might take 30-60 seconds for a 3-model review — the UX needs to handle this.

### 10. Cost Reporting
Where does cost/usage data currently live? The devserver needs to log every headless invocation with token counts and cost. This feeds into the dashboard. Is there an existing logging/metrics infrastructure we can hook into?

---

## What This Replaces

Previously discussed approaches that are no longer needed:

| Removed | Replaced By |
|---------|------------|
| LiteLLM Docker + Postgres | CLI headless modes + direct API calls |
| OpenRouter | CLI headless modes + direct API calls |
| Virtual keys per team member | Devserver handles auth centrally |
| Complex adapter interface | Two types: `cli` and `api` |
| Codex App Server protocol | `codex exec` (simpler for CI/CD) |
| Codex MCP Server | `codex exec` (simpler for CI/CD) |
| Provider cascading logic | local CLI → devserver, that's it |
| Multiple SDK dependencies | Zero SDKs — just CLI spawning and REST calls |

---

## Summary

The multi-model router is two provider types (`cli` + `api`), two routers (local + devserver), three CLI tools, and a config file. No proxy layers, no Docker dependencies for the model layer, no SDKs. Adding a model is a config change. The non-dev experience is seamless — they run TLC commands and the routing is invisible.

**Priority order for implementation:**
1. Provider interface + CLI detection
2. Local router (run detected CLIs with JSON output)
3. Devserver HTTP service + headless execution
4. Structured output schema + consensus engine
5. Config schema for `.tlc.json`
6. Cost tracking + dashboard integration
7. API provider support (DeepSeek etc.)
