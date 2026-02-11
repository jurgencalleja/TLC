# Phase 71: Semantic Memory & Rich Capture - Discussion

## The Problem

Claude Code's context window compacts mid-session, losing detailed decisions and reasoning. The current TLC memory system captures one-liner decisions ("Use Postgres — JSONB support") but loses the 45-minute conversation that led there. Moving between machines (MacBook ↔ Mac Studio ↔ homelab) loses everything not in git.

## Architecture Decisions

| Decision | Choice | Notes |
|----------|--------|-------|
| Vector DB scope | Global with metadata | Single `~/.tlc/memory/vectors.db`, vectors tagged with project/workspace/branch |
| Vector DB is... | Derived data, .gitignored | Rebuilt from text files on each machine. Text is the source of truth |
| Sync strategy | Git infra repo | Workspace = git repo. `git pull` on new machine, rebuild vectors |
| Capture richness | Full conversation substance | Not one-liners. Full context, alternatives, reasoning chains, code refs |
| Capture trigger | Continuous (every N turns) | No "session end" event exists. Autosave pattern — capture when substance accumulates |
| Embedding location | Local per-machine | Ollama/local LLM on each machine. Different machines can use different models |
| Memory hierarchy | Workspace → Project | Workspace decisions cascade to child projects. Query searches both |
| Storage backend | sqlite-vec | Zero infrastructure, single file, ships with TLC |

## Infra Repo Pattern

The workspace IS a git repo. New machine setup = clone + rebuild.

```
~/GitHub/my-workspace/              ← GIT REPO (the infra repo)
├── CLAUDE.md                       ← workspace-level instructions
├── .tlc.json                       ← workspace config
├── .planning/                      ← workspace-level roadmap
├── memory/
│   ├── decisions/                  ← cross-project decisions (detailed)
│   ├── gotchas/                    ← cross-project gotchas
│   └── conversations/              ← rich conversation chunks (NEW)
│       ├── 2026-02-09-vector-db-architecture.md
│       ├── 2026-02-09-workspace-dashboard-design.md
│       └── 2026-02-10-auth-strategy.md
├── projects.json                   ← repo URLs + config for rebuild
└── vectors.db                      ← .gitignored, rebuilt from memory/
```

New Mac workflow:
1. `git clone my-workspace`
2. Claude reads projects.json, clones all sub-repos
3. Each sub-repo has its own .tlc.json, .planning/
4. Vectors rebuilt from memory/ in seconds
5. Full context restored

## Rich Capture Format

What gets written to `memory/conversations/`:

```markdown
# Vector DB Architecture Discussion

**Date:** 2026-02-09
**Session context:** TLC Phase 70-71 planning
**Projects involved:** TLC

## Context
Discussing how to add semantic memory to survive context compaction.
User has multi-machine setup (MacBook, Mac Studio, GB10 homelab).

## Options Discussed
1. Per-repo vector DB — rejected, no cross-project recall
2. Per-workspace DB — rejected, tied to one machine
3. Global DB with metadata — selected

## Decision
Global sqlite-vec DB, .gitignored. Vectors are derived data.
Text lives in git-tracked infra repo. Rebuild per machine.

## Key Reasoning
- Vectors computed from text, not source data
- Git handles sync (proven, works offline)
- Each machine uses its own embedding model
- Rebuild takes seconds

## Also Decided
- Infra repo pattern for workspace portability
- Memory inheritance: workspace → project cascade
- Continuous capture (no session-end event exists)

## Related
- Phase 70: Workspace Dashboard
- Phase 71: This phase
```

## Continuous Capture Design

No "session end" event exists in Claude Code:
- Terminal close → process killed, no hook
- Context compacts → mid-session, no signal
- User walks away → no timeout event
- /exit → unreliable

Therefore: **autosave pattern, capture continuously.**

Trigger: every 3-5 exchanges, or when substance accumulates:
- A decision was made
- A design was discussed
- A problem was solved
- An architecture choice was debated

Write immediately. Don't wait. Like autosave — because the crash is always coming.

## Memory Hierarchy (Query Time)

When working in `kasha-api/`:
```sql
-- 1. Own project memory
WHERE workspace = ? AND project = 'kasha-api'
-- 2. Inherited workspace memory
   OR (workspace = ? AND project IS NULL)
-- 3. Optional: sibling project memory
   OR (workspace = ? AND project != 'kasha-api')
ORDER BY similarity DESC
```

## Multi-Machine Setup

User's actual hardware:
- MacBook (travel, offline)
- Mac Studio (primary dev)
- GB10 / Strix Halo (local LLM inference, homelab)
- VMs on home server

Each machine:
- Runs its own embedding model (Ollama, local LLM)
- Has its own vectors.db (rebuilt from text)
- Syncs via git (push from Studio, pull on MacBook before travel)

## Edge Cases

- [ ] What if conversation capture fails mid-session → lost turns, retry on next cycle
- [ ] What if vectors.db corrupts → delete and rebuild from text (seconds)
- [ ] What if embedding model changes between machines → vectors differ but similarity still works within each machine's index
- [ ] What if infra repo has merge conflicts in conversation files → append-only design minimizes this
- [ ] What if memory/ grows very large → pruning strategy needed (archive old conversations)
- [ ] What if user has no Ollama installed → degrade gracefully, text-only search (current behavior)

## Resolved Questions

### Embedding Model
Default: `mxbai-embed-large` via Ollama (1024 dims, 670MB). Best quality out of the box.
Users with limited hardware can downgrade to `nomic-embed-text` (384 dims, 274MB) or
`all-minilm` (46MB) in `.tlc.json` config. Default to the best, degrade gracefully.

### Auto-Capture Triggers (Guaranteed Recording)
TLC MUST auto-capture during these events:
- `/tlc:discuss` — full discussion, all decisions
- `/tlc:plan` — plan rationale, task breakdown reasoning
- `/tlc:build` — what was built and why
- `AskUserQuestion` — the question AND the user's answer (explicit preferences)
- DevOps decisions, code quality rules, infrastructure choices — always recorded

### `/tlc:remember` — Explicit Permanent Capture
Yes, exists. When user says `/tlc:remember` — that content is flagged as **permanent**.
Never pruned, never archived. Highest priority in recall. "Never forget this."

### Always-Record Categories (Never Pruned)
- Architecture decisions
- DevOps / infrastructure decisions
- Code quality rules and conventions
- Security decisions
- `/tlc:remember` items
- User preferences and corrections

### Pruning Strategy
- **Never prune** decisions, gotchas, or `/tlc:remember` items — permanent
- **Archive** old conversation chunks — don't delete, compress to `memory/archive/`
- Archived items still searchable, just lower priority in recall ranking
- Think email: archive, never delete

### Chunk Sizing
Adaptive, not fixed turn count. "Be sensible":
- Group by topic coherence, not arbitrary turn boundaries
- Roughly 3-8 exchanges per chunk depending on substance
- Short rapid-fire Q&A can be one chunk; deep design discussion may be one chunk too

### Topic Boundary Detection
Natural signals:
- TLC command invocations (`/tlc:build`, `/tlc:plan`, `/tlc:discuss`) — hard boundaries
- User signals: "ok", "let's build this", "next", "moving on"
- Subject matter shift (detectable via embedding similarity between consecutive turns)
- Long pauses between exchanges (if detectable via timestamps)
