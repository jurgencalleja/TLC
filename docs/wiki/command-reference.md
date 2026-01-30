# TLC Command Reference

Complete reference for all TLC slash commands.

## Core Commands

### /tlc

**Smart entry point** - Analyzes project state and routes to appropriate action.

```bash
/tlc
```

What it does:
- No project? → Offers `/tlc:new-project` or `/tlc:init`
- No roadmap? → Offers `/tlc:plan`
- Phase planned? → Offers `/tlc:build`
- Phase built? → Offers `/tlc:verify`
- Phase complete? → Moves to next phase

### /tlc:progress

**Show current status** - Where you are in the project.

```bash
/tlc:progress
```

Displays:
- Current milestone and phase
- Task completion percentage
- Test pass/fail counts
- Next recommended action

### /tlc:help

**Show all commands** with descriptions.

```bash
/tlc:help
```

---

## Project Setup

### /tlc:new-project

**Start a new project** from scratch.

```bash
/tlc:new-project
```

Creates:
- `PROJECT.md` - Project overview
- `.planning/ROADMAP.md` - Phase breakdown
- `.tlc.json` - Configuration
- Initial directory structure

### /tlc:init

**Add TLC to existing project**.

```bash
/tlc:init
```

Detects:
- Existing test framework
- Tech stack
- Project structure

Creates TLC artifacts without disrupting existing setup.

---

## Planning

### /tlc:plan

**Create implementation plan** for a phase.

```bash
/tlc:plan              # Plan current phase
/tlc:plan 2            # Plan phase 2
```

Creates `.planning/phases/{N}-PLAN.md` with:
- Task breakdown
- Acceptance criteria
- Test cases per task
- Dependencies

### /tlc:discuss

**Discuss phase implementation** before planning.

```bash
/tlc:discuss 2
```

Interactive Q&A to clarify:
- UI/UX decisions
- Behavior edge cases
- Integration points

Creates `.planning/phases/{N}-CONTEXT.md`.

---

## Building

### /tlc:build

**Build a phase** using test-first development.

```bash
/tlc:build 1           # Build phase 1
/tlc:build 1 --sequential    # Force sequential mode
/tlc:build 1 --agents 5      # Use 5 parallel agents
```

Process:
1. Detect test framework
2. Check for parallelizable tasks (Overdrive mode)
3. Write failing tests for each task
4. Implement code to pass tests
5. Commit after each task
6. Run auto-review

**Overdrive Mode**: When tasks are independent, TLC spawns multiple agents to work in parallel.

### /tlc:status

**Check test status** for current phase.

```bash
/tlc:status
/tlc:status 2          # Check phase 2
```

Shows:
- Passing/failing test count
- Coverage percentage
- Failed test details

---

## Quality

### /tlc:coverage

**Analyze test coverage gaps**.

```bash
/tlc:coverage
```

Identifies:
- Untested files
- Low coverage functions
- Missing edge cases

### /tlc:quality

**Test quality scoring**.

```bash
/tlc:quality
```

Calculates score based on:
- Coverage percentage (40%)
- Edge case coverage (30%)
- Mutation testing (30%)

### /tlc:edge-cases

**Generate edge case tests** for a file.

```bash
/tlc:edge-cases src/auth/login.ts
```

AI-generated tests for:
- Null/undefined inputs
- Boundary conditions
- Unicode/special characters
- Security patterns

### /tlc:autofix

**Automatically fix failing tests**.

```bash
/tlc:autofix
/tlc:autofix --max-attempts 5
```

Retry loop:
1. Run tests
2. Analyze failures
3. Apply fixes
4. Repeat until pass or max attempts

---

## Review

### /tlc:review

**Review current branch** before pushing.

```bash
/tlc:review
/tlc:review --base dev
```

Checks:
- Test coverage for changed files
- TDD compliance (commit order)
- Security issues

### /tlc:review-pr

**Review a pull request**.

```bash
/tlc:review-pr 42
/tlc:review-pr https://github.com/org/repo/pull/42
```

Posts review comment with verdict:
- APPROVED - All checks pass
- CHANGES_REQUESTED - Issues found

---

## Verification

### /tlc:verify

**Human verification** of completed phase.

```bash
/tlc:verify 1
```

Interactive checklist:
- Manual testing scenarios
- Edge case verification
- Acceptance criteria sign-off

---

## Team Collaboration

### /tlc:claim

**Claim a task** before starting work.

```bash
/tlc:claim 2           # Claim task 2
```

Updates task marker: `[ ]` → `[>@username]`

### /tlc:release

**Release a claimed task**.

```bash
/tlc:release 2
```

Updates task marker: `[>@username]` → `[ ]`

### /tlc:who

**See who's working on what**.

```bash
/tlc:who
```

Shows:
- Claimed tasks by user
- Completed tasks by user
- Available tasks

### /tlc:bug

**Log a bug**.

```bash
/tlc:bug
```

Interactive bug submission:
- Title and description
- Severity level
- Steps to reproduce

Adds to `.planning/BUGS.md`.

---

## Integration

### /tlc:ci

**Generate CI/CD pipeline**.

```bash
/tlc:ci                # Auto-detect and generate
/tlc:ci --test         # Test workflow only
/tlc:ci --pr           # PR workflow only
/tlc:ci --both         # Both workflows
/tlc:ci --threshold 80 # Set coverage threshold
```

Supports:
- GitHub Actions
- GitLab CI
- Azure Pipelines
- CircleCI

### /tlc:issues

**Sync with issue trackers**.

```bash
/tlc:issues --import   # Import issues
/tlc:issues --sync     # Bi-directional sync
/tlc:issues --list     # List open issues
```

Supports:
- GitHub Issues
- Jira
- Linear
- GitLab Issues

### /tlc:export

**Export for other AI tools**.

```bash
/tlc:export            # Export to all detected tools
/tlc:export cursor     # Cursor only
/tlc:export copilot    # GitHub Copilot only
```

Generates:
- `.cursorrules` (Cursor)
- `.github/copilot-instructions.md` (Copilot)
- `.continue/rules/tlc.md` (Continue)
- `AGENTS.md` (Universal)

---

## Dev Server

### /tlc:start

**Start the dev server**.

```bash
/tlc:start
```

Or use the launcher:
```bash
# Windows
tlc-start.bat

# Mac/Linux
./tlc-start.sh
```

Provides:
- `localhost:3147` - Dashboard
- `localhost:5001` - Your app
- `localhost:8080` - Database admin (Adminer)

### /tlc:server

**Server management**.

```bash
/tlc:server status     # Check status
/tlc:server logs       # View logs
/tlc:server restart    # Restart containers
```

---

## Deployment

### /tlc:deploy

**Deploy to dev server**.

```bash
/tlc:deploy
/tlc:deploy --branch feature/auth
```

Deploys branch to subdomain:
- `main` → `main.project.com`
- `feature/auth` → `feature-auth.project.com`

---

## Configuration

### /tlc:config

**Configure test frameworks**.

```bash
/tlc:config
```

Interactive setup for:
- Primary test framework
- Additional frameworks
- Custom test commands

---

## Milestone Management

### /tlc:complete

**Complete current milestone**.

```bash
/tlc:complete
```

Archives milestone and prepares for next version.

### /tlc:new-milestone

**Start new milestone**.

```bash
/tlc:new-milestone
```

Creates new version cycle with fresh roadmap.
