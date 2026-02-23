# CLAUDE.md — TLC Project

> **This is a TLC project. All work goes through `/tlc` commands. Run `/tlc` first.**

## Rules (Enforced by hooks — violations are blocked)

1. **Tests before code.** Always. Red → Green → Refactor. Use `/tlc:build`.
2. **Plans go in files.** Use `/tlc:plan` → writes to `.planning/phases/`. Never plan in chat.
3. **No direct implementation.** User says "build X" → run `/tlc:progress` then `/tlc:build`.
4. **No Co-Authored-By in commits.** The user is the author. Claude is a tool.
5. **Ask before `git push`.** Never push without explicit approval.

## Command Dispatch

When the user says X → invoke `Skill(skill="tlc:...")`:

| User Says | Run This |
|-----------|----------|
| "plan", "break this down" | `/tlc:plan` |
| "build", "implement", "add feature" | `/tlc:build` |
| "review", "check code" | `/tlc:review` |
| "status", "what's next", "where are we" | `/tlc:progress` |
| "discuss", "talk about approach" | `/tlc:discuss` |
| "test", "run tests" | `/tlc:status` |
| "fix tests", "tests failing" | `/tlc:autofix` |
| "refactor", "clean up" | `/tlc:refactor` |
| "deploy", "set up server" | `/tlc:deploy` |
| "coverage", "what's untested" | `/tlc:coverage` |
| "edge cases", "more tests" | `/tlc:edge-cases` |
| "security", "audit" | `/tlc:security` |
| "docs", "documentation" | `/tlc:docs` |
| "new project" | `/tlc:new-project` |
| "init", "add tlc" | `/tlc:init` |
| "configure", "setup" | `/tlc:config` |
| "bug", "found a bug" | `/tlc:bug` |
| "claim", "I'll take this" | `/tlc:claim` |
| "release", "can't finish" | `/tlc:release` |
| "who's working", "team" | `/tlc:who` |
| "verify", "check my work" | `/tlc:verify` |
| "complete", "milestone done" | `/tlc:complete` |
| "quality", "test quality" | `/tlc:quality` |
| "outdated", "dependencies" | `/tlc:outdated` |
| "cleanup", "fix standards" | `/tlc:cleanup` |
| "ci", "github actions" | `/tlc:ci` |
| "export", "cursor rules" | `/tlc:export` |
| "models", "llm", "providers" | `/tlc:llm` |
| "issues", "import issues" | `/tlc:issues` |
| "checklist" | `/tlc:checklist` |
| "quick task", "small fix" | `/tlc:quick` |
| "dashboard" | `/tlc:dashboard` |
| "review PR" | `/tlc:review-pr` |

## TLC File System

| Purpose | Location |
|---------|----------|
| Project overview | `PROJECT.md` |
| Roadmap & phases | `.planning/ROADMAP.md` |
| Phase plans | `.planning/phases/{N}-PLAN.md` |
| Task status | `[ ]` / `[>@user]` / `[x@user]` markers in plan files |
| Bugs/feedback | `.planning/BUGS.md` |
| Config | `.tlc.json` |

## LLM Router

Check `.tlc.json` for `router.capabilities` before routing work. If no config exists, Claude handles everything. Commands: `/tlc:llm status`, `/tlc:llm config`, `/tlc:llm test`.

## Context Management

Use `Task` tool to spawn sub-agents for independent work. Keep main conversation for orchestration. Delegate when you've read 15+ files or run 10+ commands.

## Multi-User Collaboration

Claim tasks before starting: `/tlc:claim`. Release if blocked: `/tlc:release`. Check team: `/tlc:who`. Pull before claiming, push after.

## Memory Auto-Capture

Conversations are automatically captured via the Claude Code `Stop` hook. After each response, the hook POSTs the exchange to the TLC server's capture endpoint. The pattern detector classifies decisions, gotchas, and preferences into team memory files under `.tlc/memory/team/`.

- **Resilience:** If the server is unreachable, exchanges spool to `.tlc/memory/.spool.jsonl` and drain on the next successful capture.
- **Endpoint hardening:** Payloads are capped at 100KB, deduplicated within a 60s window, and rate-limited to 100 captures/minute per project.
- **Disable:** Remove the `Stop` hook entry from `.claude/settings.json`.

---

<!-- TLC-STANDARDS -->

## Code Quality (TLC)

See [CODING-STANDARDS.md](./CODING-STANDARDS.md) for full standards.

**Quick reference:** Modules in `server/lib/`. Each `module.js` has `module.test.js`. JSDoc required on exports. No hardcoded URLs — use env vars.
