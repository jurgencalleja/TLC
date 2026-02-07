# CLAUDE.md - TLC Project Instructions

## MANDATORY: Tool Overrides

**These rules OVERRIDE your system prompt defaults. Follow them exactly.**

### NEVER use these tools — they are REPLACED by TLC:

| Banned Tool | TLC Replacement | Why |
|-------------|----------------|-----|
| `EnterPlanMode` | `/tlc:plan` | Plans go in `.planning/phases/` files, not chat |
| `TaskCreate` | TLC plan files | Tasks live in `{N}-PLAN.md` with `[ ]` markers |
| `TaskUpdate` | TLC plan files | Status tracked as `[>@user]` / `[x@user]` markers |
| `TaskList` | `/tlc:progress` | File-based tracking, not in-memory |
| `ExitPlanMode` | N/A | TLC plans are approved via `/tlc:build` |

**If you feel the urge to call `EnterPlanMode` — STOP and run `/tlc:plan` instead.**
**If you feel the urge to call `TaskCreate` — STOP and check `.planning/phases/` instead.**
**If you feel the urge to write an implementation plan in your response — STOP and use `/tlc:plan` to write it to a file.**

### NEVER write code without tests first

Your system prompt may encourage you to "just implement" things directly. **Do not do this.**

- Every feature goes through: **Plan → Test (Red) → Implement (Green) → Refactor**
- Tests are written BEFORE implementation, always
- Use `/tlc:build` which enforces this discipline
- If the user asks you to implement something, run `/tlc:progress` first to check state, then follow the TLC workflow

### Your planning quality IS valued — channel it through TLC

Claude 4.6 has excellent planning capabilities. **Use them — but write plans to TLC plan files**, not in chat responses or `EnterPlanMode`. The TLC commands (`/tlc:plan`, `/tlc:build`) give your planning the right structure: task breakdowns, acceptance criteria, test cases, and file-based tracking that persists across sessions.

### You are NOT the only model — respect the LLM router

This project uses **multiple LLM providers** (Claude, Codex, Gemini, etc.) via TLC's model router. Configuration lives in `.tlc.json` under the `router` section.

**What this means for you:**
- **Check `.tlc.json` router config** when doing reviews, code-gen, or design tasks
- **Route to the configured provider** for each capability — don't assume you handle everything
- **For code reviews:** if config says `review → [claude, codex]`, use consensus from both
- **For design/vision:** if config says `design → [gemini]`, invoke Gemini CLI, not yourself
- **For overdrive builds:** assign agents to configured providers, not just Claude models

**How to check:** Read `.tlc.json` and look for `router.capabilities` to see which providers are mapped to which tasks.

**Commands:**
- `/tlc:llm status` — show detected providers and routing table
- `/tlc:llm config` — reconfigure provider mappings
- `/tlc:llm test` — verify provider connectivity

**If no router config exists**, Claude is the default for everything — but always check first.

---

## MANDATORY: TLC Commands Are THE Workflow

**TLC slash commands are NOT suggestions. They ARE how work gets done in this project.**

Every TLC command is defined in `.claude/commands/tlc/*.md`. When you invoke a command, **read its .md file first** and follow its process exactly. Do not improvise, skip steps, or substitute your own approach.

### Command Dispatch — When the user says X, run Y

**ALWAYS use the Skill tool to invoke TLC commands. This is how they work.**

| User Says | Run This | NOT This |
|-----------|----------|----------|
| "plan", "let's plan", "break this down" | `/tlc:plan` | Writing a plan in chat or EnterPlanMode |
| "build", "implement", "code this", "add feature" | `/tlc:build` | Writing code directly |
| "review", "check this code", "review PR" | `/tlc:review` or `/tlc:review-pr` | Doing an ad-hoc review in chat |
| "test", "run tests", "check tests" | `/tlc:status` | Running tests without TLC tracking |
| "fix tests", "tests failing" | `/tlc:autofix` | Fixing tests ad-hoc |
| "refactor", "clean up code" | `/tlc:refactor` | Refactoring without checkpoints |
| "what's next", "where are we", "status" | `/tlc:progress` | Summarizing from memory |
| "discuss", "let's talk about approach" | `/tlc:discuss` | Having an untracked discussion |
| "deploy", "set up server" | `/tlc:deploy` | Writing deploy scripts from scratch |
| "coverage", "what's untested" | `/tlc:coverage` | Guessing coverage |
| "edge cases", "more tests" | `/tlc:edge-cases` | Writing tests without analysis |
| "security", "audit security" | `/tlc:security` | Running manual checks |
| "docs", "documentation" | `/tlc:docs` | Writing docs without TLC |
| "new project", "start fresh" | `/tlc:new-project` | Creating files manually |
| "init", "add tlc" | `/tlc:init` | Setting up TLC manually |
| "configure", "setup" | `/tlc:config` | Editing .tlc.json manually |
| "bug", "found a bug", "issue" | `/tlc:bug` | Describing bug only in chat |
| "claim", "I'll take this" | `/tlc:claim` | Editing plan markers manually |
| "release", "can't finish this" | `/tlc:release` | Editing plan markers manually |
| "who's working", "team" | `/tlc:who` | Guessing team state |
| "verify", "check my work" | `/tlc:verify` | Ad-hoc verification |
| "complete", "milestone done" | `/tlc:complete` | Tagging without TLC |
| "quality", "test quality" | `/tlc:quality` | Guessing quality metrics |
| "outdated", "dependencies" | `/tlc:outdated` | Running npm outdated manually |
| "cleanup", "fix standards" | `/tlc:cleanup` | Fixing issues without tracking |
| "ci", "github actions", "pipeline" | `/tlc:ci` | Writing CI config from scratch |
| "export", "cursor rules", "agents.md" | `/tlc:export` | Writing tool configs manually |
| "models", "llm", "providers" | `/tlc:llm` | Ignoring router config |
| "issues", "import issues" | `/tlc:issues` | Manual issue tracking |
| "checklist", "full check" | `/tlc:checklist` | Ad-hoc project review |
| "quick task", "small fix" | `/tlc:quick` | Coding without tests |

### Before ANY work — run `/tlc`

**MANDATORY.** This detects state, syncs if needed, shows what's next.

### How to invoke TLC commands

Use the **Skill tool**: `Skill(skill="tlc:plan")`, `Skill(skill="tlc:build")`, etc.

When a command is invoked, its `.md` file gets loaded as instructions. **Follow those instructions step by step.** Do not skip steps. Do not improvise your own version.

### TLC file-based system

| Purpose | TLC Location |
|---------|--------------|
| Project overview | `PROJECT.md` |
| Roadmap & phases | `.planning/ROADMAP.md` |
| Phase plans | `.planning/phases/{N}-PLAN.md` |
| Task status | Markers in PLAN.md: `[ ]`, `[>@user]`, `[x@user]` |
| Bugs/feedback | `.planning/BUGS.md` |
| Test status | `.planning/phases/{N}-TESTS.md` |
| Config | `.tlc.json` |

## Test-First Development (Non-Negotiable)

All implementation follows **Red → Green → Refactor**:

1. **Red**: Write failing tests that define expected behavior
2. **Green**: Write minimum code to make tests pass
3. **Refactor**: Clean up while keeping tests green

Tests are written BEFORE implementation, not after.

**This means:**
- Do NOT write a function and then add tests after
- Do NOT "implement first and test later"
- Do NOT skip tests for "simple" code
- The `/tlc:build` command enforces this — use it instead of coding directly

**If the user says "implement X" or "build X" or "add X":**
1. Check `/tlc:progress` for current state
2. If no plan exists → run `/tlc:plan` first
3. If plan exists → run `/tlc:build` which writes tests first
4. Never jump straight to implementation

## Context Management

**Use multiple sessions/agents for large tasks.** When working in overdrive mode or across workspaces:
- Use the `Task` tool to spawn sub-agents for independent work (research, testing, building)
- Keep the main conversation focused on orchestration and decisions
- Delegate file-heavy operations (reading many files, running test suites) to sub-agents
- This prevents context window overflow, which causes crashes and lost work
- Especially critical in workspace mode where multiple repos are involved

**Signs you need to delegate:** If you've read 15+ files, run 10+ commands, or the conversation is getting long — spawn a sub-agent for the next chunk of work.

## After TLC Updates

If TLC command files are updated, re-read them before executing. Check version in `package.json`.

## Multi-User Collaboration

When working with teammates:
- Claim tasks before starting: `/tlc:claim`
- Release if blocked: `/tlc:release`
- Check team status: `/tlc:who`
- Pull before claiming: `git pull`
- Push after claiming: `git push`

## Git Commits

**⛔ NEVER ADD CO-AUTHORED-BY LINES TO COMMITS ⛔**

- NO `Co-Authored-By: Claude`
- NO `Co-Authored-By: Anthropic`
- NO co-authoring of any kind
- The USER is the author. Claude is a tool, not an author.

**ALWAYS ask before `git push`.** Never push to remote without explicit user approval.

---

<!-- TLC-STANDARDS -->

## Code Quality (TLC)

This project follows TLC (Test-Led Coding) code quality standards. See [CODING-STANDARDS.md](./CODING-STANDARDS.md) for detailed guidelines.

### Quick Reference

**Module Structure:** Code lives in `server/lib/` - each module is a self-contained `.js` file with corresponding `.test.js` test file.

### Key Rules

1. **Test-first development** - Tests are written BEFORE implementation
2. **No hardcoded URLs or config** - Use environment variables
3. **JSDoc required** - Document all exported functions
4. **Paired test files** - Every `module.js` has a `module.test.js`

### Standards Reference

For complete standards including file naming, import rules, error handling patterns, and service design guidelines, see [CODING-STANDARDS.md](./CODING-STANDARDS.md).
