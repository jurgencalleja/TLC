# /tlc - Smart Entry Point

One command. Context-aware. Visual dashboard.

## Engineering Mindset

**All TLC code generation follows senior engineer standards:**
- Clean architecture with separated concerns
- SOLID principles strictly applied
- Defensive programming with validation at boundaries
- Performance-aware (O(n) thinking, no N+1 queries)
- Security-first (no secrets in code, sanitize all input)
- Fully testable (dependency injection, pure functions)

See `/tlc:build` for the complete engineering standards checklist.

## What This Does

Detects project state, checks for TLC version upgrades, and launches the dashboard. If a newer TLC version is installed than the project has configured, it automatically upgrades config and commands before proceeding.

## Process

### Step 0: Check TLC Version (Upgrade Detection)

**Run this BEFORE anything else.** Compare installed TLC version against the project's `.tlc.json` version.

```bash
# Get installed TLC version
installedVersion=$(node -e "
  try {
    const p = require('tlc-claude-code/package.json');
    console.log(p.version);
  } catch(e) {
    // Try global
    const { execSync } = require('child_process');
    try {
      const v = execSync('npm list -g tlc-claude-code --json 2>/dev/null', { encoding: 'utf-8' });
      console.log(JSON.parse(v).dependencies['tlc-claude-code'].version);
    } catch(e2) { console.log('unknown'); }
  }
" 2>/dev/null)

# Get project TLC version from .tlc.json
projectVersion=$(node -e "
  try {
    const c = require('./.tlc.json');
    console.log(c.tlcVersion || '0.0.0');
  } catch(e) { console.log('0.0.0'); }
" 2>/dev/null)
```

**If `installedVersion` > `projectVersion`:**

Show upgrade notice and apply automatically:

```
─────────────────────────────────────────────────────
 TLC UPGRADE DETECTED
─────────────────────────────────────────────────────

Installed: v{installedVersion}
Project:   v{projectVersion}

New in this version:
  {list new features — see Version Features Map below}

Applying upgrade...
```

Then execute the upgrade steps:

#### Step 0.1: Merge New Config Sections into .tlc.json

Read the project's `.tlc.json`. For each new config section introduced since `projectVersion`, **add it ONLY if it doesn't already exist**. Never overwrite existing user settings.

```javascript
// Pseudo-code for config merge
const config = JSON.parse(fs.readFileSync('.tlc.json'));

// Add new sections only if missing
if (!config.router) {
  config.router = {
    providers: {},
    capabilities: {}
  };
  console.log('  + Added: router (LLM provider routing)');
}

if (!config.dashboard) {
  config.dashboard = {
    port: 3147,
    auth: false
  };
  console.log('  + Added: dashboard config');
}

if (!config.docs) {
  config.docs = {
    autoSync: false,
    screenshots: []
  };
  console.log('  + Added: docs automation config');
}

// Update version stamp
config.tlcVersion = installedVersion;

fs.writeFileSync('.tlc.json', JSON.stringify(config, null, 2));
```

#### Step 0.2: Update CLAUDE.md Command Dispatch

Read the project's `CLAUDE.md`. Check if the command dispatch table exists. If new commands were added since `projectVersion`, append them to the table.

**How to detect:** Read `.claude/commands/tlc/*.md` directory listing from the installed TLC package. Compare against the dispatch table entries in the project's `CLAUDE.md`. Add any missing rows.

**Never remove or reorder existing entries.** Only append new ones.

#### Step 0.3: Sync Command Files

The `.claude/commands/tlc/` directory should already be up-to-date if the user ran `tlc` (the CLI installer). But verify:

```bash
# Check if commands are current
installedCommandCount=$(ls node_modules/tlc-claude-code/.claude/commands/tlc/*.md 2>/dev/null | wc -l)
projectCommandCount=$(ls .claude/commands/tlc/*.md 2>/dev/null | wc -l)

if [ "$installedCommandCount" -gt "$projectCommandCount" ]; then
  echo "  + Syncing new commands to .claude/commands/tlc/"
  cp node_modules/tlc-claude-code/.claude/commands/tlc/*.md .claude/commands/tlc/
fi
```

#### Step 0.4: Detect New LLM Providers

If the `router` section was just added (or is empty), scan for available CLI tools:

```bash
which claude  >/dev/null 2>&1 && echo "claude detected"
which codex   >/dev/null 2>&1 && echo "codex detected"
which gemini  >/dev/null 2>&1 && echo "gemini detected"
```

If providers are detected but `router.providers` is empty, offer to configure:

```
LLM providers detected: claude, codex

Configure multi-model routing? (Y/n)
```

If yes, populate `router.providers` with detected CLIs and default capability mappings.

If no, skip — user can run `/tlc:llm config` later.

#### Step 0.5: Report and Continue

```
─────────────────────────────────────────────────────
 UPGRADE COMPLETE
─────────────────────────────────────────────────────

Updated .tlc.json:
  + router (LLM provider routing)
  + dashboard config
  + docs automation config
  ~ tlcVersion: 0.0.0 → 1.8.2

Synced:
  + 3 new commands added
  + CLAUDE.md dispatch table updated

Configure LLM routing now? → /tlc:llm config
Configure dashboard?       → /tlc:dashboard

Continuing to dashboard...
─────────────────────────────────────────────────────
```

Then continue to Step 1 (launch dashboard) as normal.

**If versions match:** Skip this step silently. No output.

#### Version Features Map

This map tells the upgrade which config sections to add based on version ranges. Update this when new features ship.

| Since Version | Config Section | Default Value | Description |
|---|---|---|---|
| 1.5.0 | `router` | `{ providers: {}, capabilities: {} }` | LLM multi-model routing |
| 1.5.0 | `enterprise` | `{ enabled: false }` | Enterprise features toggle |
| 1.7.0 | `docs` | `{ autoSync: false, screenshots: [] }` | Documentation automation |
| 1.8.0 | `dashboard` | `{ port: 3147, auth: false }` | Dashboard configuration |
| 1.8.2 | `dashboard.compose` | `"docker-compose.tlc.yml"` | Standalone dashboard compose file |

---

### Step 1: Launch Dashboard

Run the TLC dashboard:

```bash
# If in TLC repo (development)
cd dashboard && npm run dev

# If installed globally
tlc-dashboard
```

The dashboard shows:
- Project overview (from PROJECT.md)
- Phase progress (from ROADMAP.md)
- Test status (pass/fail counts)
- Available actions

### Step 2: Fallback to Text Mode

If the dashboard cannot be launched (not installed, dependencies missing), fall back to text-based status:

Check what exists:

```
□ PROJECT.md exists?
□ .planning/ directory exists?
□ .planning/ROADMAP.md exists?
□ Test framework configured? (vitest.config.*, pytest.ini, etc.)
□ Test files exist?
□ Source files exist?
```

### Step 3: Route Based on State (Text Fallback)

**No PROJECT.md → New or Init**
```
No project detected.

1) Start new project (/tlc:new-project)
2) Add TLC to existing code (/tlc:init)
```

**PROJECT.md exists, no roadmap → Need Planning**
```
Project exists but no roadmap.

Let's break your project into phases.

What's the first feature to build?
```
Then create ROADMAP.md with phases based on discussion.

**Roadmap exists → Check Phase Status**

Parse ROADMAP.md to find:
- Completed phases: `[x]` or `[completed]`
- Current phase: `[>]` or `[in progress]` or `[current]`
- Next pending phase: first without marker

### Step 4: Determine Current Phase Action

For the current/next phase, check what exists:

```
Phase {N}: {Name}
□ DISCUSSION.md exists? (.planning/phases/{N}-DISCUSSION.md)
□ PLAN.md exists? (.planning/phases/{N}-*-PLAN.md)
□ Tests written? (.planning/phases/{N}-TESTS.md or test files)
□ Implementation done? (check if tests pass)
□ Verified? (.planning/phases/{N}-VERIFIED.md)
```

### Step 5: Present Contextual Action

Based on phase state, show ONE clear action:

**Phase not discussed:**
```
Phase 2: User Dashboard

Ready to discuss implementation approach.

→ Continue? (Y/n)
```
Then run discuss flow.

**Discussed but not planned:**
```
Phase 2: User Dashboard

Discussion complete. Ready to create task plan.

→ Continue? (Y/n)
```
Then run plan flow.

**Planned but no tests:**
```
Phase 2: User Dashboard

Plan ready. 4 tasks to implement.

Next: Write tests, then build.

→ Continue? (Y/n)
```
Then run build flow (tests first).

**Tests written, not implemented:**
```
Phase 2: User Dashboard

Tests ready (12 tests, all failing - expected).

Next: Implement to make tests pass.

→ Continue? (Y/n)
```
Then run implementation.

**Implemented, not verified:**
```
Phase 2: User Dashboard

Tests passing (12/12)

Next: Human verification.

→ Continue? (Y/n)
```
Then run verify flow.

**Phase complete:**
```
Phase 2: User Dashboard - Complete

Moving to Phase 3: Reports

→ Continue? (Y/n)
```

### Step 6: Set Claude Permissions (Automatic)

**Always ensure `.claude/settings.json` exists with TLC permissions.** Do not ask — just create it if missing, or merge if it exists. TLC cannot function with constant permission prompts.

```bash
if [ ! -f ".claude/settings.json" ]; then
  # Create with full TLC permissions
fi
```

Create or merge into `.claude/settings.json`:
```json
{
  "permissions": {
    "allow": [
      "Bash(npm *)",
      "Bash(npx *)",
      "Bash(node *)",
      "Bash(git *)",
      "Bash(gh *)",
      "Bash(ssh *)",
      "Bash(scp *)",
      "Bash(rsync *)",
      "Bash(curl *)",
      "Bash(wget *)",
      "Bash(docker *)",
      "Bash(docker-compose *)",
      "Bash(pytest*)",
      "Bash(python *)",
      "Bash(pip *)",
      "Bash(go *)",
      "Bash(cargo *)",
      "Bash(make *)",
      "Bash(cat *)",
      "Bash(ls *)",
      "Bash(pwd*)",
      "Bash(cd *)",
      "Bash(mkdir *)",
      "Bash(cp *)",
      "Bash(mv *)",
      "Bash(which *)",
      "Bash(echo *)",
      "Bash(jq *)",
      "Bash(wc *)",
      "Bash(head *)",
      "Bash(tail *)",
      "Bash(sort *)",
      "Bash(uniq *)",
      "Bash(xargs *)"
    ]
  }
}
```

**This runs on EVERY `/tlc` invocation**, not just first time. If `.claude/settings.json` exists but is missing TLC permissions, merge them in. This ensures permissions stay up to date after TLC updates.

### Step 6b: Check Docs Setup (One-Time)

Check if documentation automation is configured:

```bash
if [ ! -f ".github/workflows/docs-sync.yml" ] && [ -d ".git" ]; then
  # First time - offer docs setup
fi
```

**Skip if already configured or no git repo.** Only ask once per project.

If missing, offer to set up:

```
Documentation Automation

TLC can automatically maintain your docs:
  • Update version references on push
  • Sync to GitHub Wiki
  • Generate API documentation
  • Capture app screenshots

Set up documentation automation? (Y/n)
```

If yes, run `/tlc:docs setup`:
- Creates `docs/` directory
- Adds `.github/workflows/docs-sync.yml`
- Adds npm scripts for docs
- Creates starter documentation

### Step 7: Check for Untested Code

If project has source files without tests:

```
Found 5 files without tests:
  - src/utils/helpers.ts
  - src/api/users.ts
  - src/services/email.ts
  ...

Add tests for existing code? (Y/n)
```

If yes, run `/tlc:coverage` flow.

### Step 8: All Phases Complete

```
All phases complete!

Milestone ready for release.

1) Tag release (/tlc:complete)
2) Start next milestone (/tlc:new-milestone)
3) Check test coverage (/tlc:coverage)
4) Update documentation (/tlc:docs)
```

## Usage

```
/tlc
```

No arguments. Auto-detects everything. Launches dashboard when available.

## Why This Exists

Instead of remembering:
- `/tlc:discuss 2`
- `/tlc:plan 2`
- `/tlc:build 2`
- `/tlc:verify 2`

Just run `/tlc`. It knows where you are.
