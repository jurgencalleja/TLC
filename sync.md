# /tlc:sync - One Command to Rule Them All

The unified entry point for TLC adoption and codebase synchronization.

## What This Does

**First-time adoption:** Complete onboarding with all configuration in one flow.

**Post-rebase:** Detect changes and reconcile incoming code with TLC standards.

## Usage

```
/tlc:sync
```

No arguments. TLC auto-detects the scenario.

## CRITICAL: Execution Flow

**You MUST detect the scenario FIRST, then execute ONLY that scenario.**

```
Step 1: Check for .tlc.json
        │
        ├── NOT FOUND → Execute "Scenario 1: First-Time Adoption" ONLY
        │               (Skip Scenario 2 entirely)
        │
        └── FOUND → Step 2: Compare HEAD with lastSync
                    │
                    ├── HEAD == lastSync → Print "✓ Already synced" and STOP
                    │
                    └── HEAD != lastSync → Execute "Scenario 2: Post-Rebase" ONLY
                                           (Skip Scenario 1 entirely)
```

**DO NOT run both scenarios. Pick ONE based on detection.**

---

## Scenario 1: First-Time Adoption

**ONLY run this if .tlc.json does NOT exist.**

Complete onboarding questionnaire. All settings in one flow so nothing gets forgotten.

### Step 1.1: Welcome

```
  ████████╗██╗     ██████╗
  ╚══██╔══╝██║    ██╔════╝
     ██║   ██║    ██║
     ██║   ██║    ██║
     ██║   ███████╗╚██████╗
     ╚═╝   ╚══════╝ ╚═════╝

Welcome to TLC - Test Led Coding

Let's configure your project. This takes about 2 minutes.
All settings can be changed later in .tlc.json
```

### Step 1.2: Detect Existing Setup

Scan the codebase:

```bash
# Detect language/framework
if [ -f "package.json" ]; then
  stack="node"
  if grep -q "react\|next" package.json; then
    stack="react"
  fi
elif [ -f "pyproject.toml" ] || [ -f "requirements.txt" ]; then
  stack="python"
elif [ -f "go.mod" ]; then
  stack="go"
elif [ -f "Cargo.toml" ]; then
  stack="rust"
fi

# Detect existing tests
tests_exist=$(find . -name "*.test.*" -o -name "test_*.py" -o -name "*_test.go" | head -1)

# Detect git branch
main_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
```

### Step 1.3: Configuration Questionnaire

Present all options with smart defaults based on detection:

```
─────────────────────────────────────────────────────
 1. TEST FRAMEWORK
─────────────────────────────────────────────────────

Detected: Node.js project

Choose test framework:
  [1] Mocha + Chai + Sinon (TLC default, recommended)
  [2] Vitest
  [3] Jest
  [4] Keep existing: jest (47 test files found)

Choice [1/2/3/4]: _

─────────────────────────────────────────────────────
 2. GIT CONFIGURATION
─────────────────────────────────────────────────────

Detected main branch: main

Is this your trunk branch? (Y/n): _

─────────────────────────────────────────────────────
 3. TEAM MODE
─────────────────────────────────────────────────────

How many people work on this codebase?
  [1] Solo - just me
  [2] Team - multiple developers

Choice [1/2]: _

(If team selected)
Require task claiming before work? (Y/n): _
Slack webhook for notifications (optional): _

─────────────────────────────────────────────────────
 4. QUALITY STANDARDS
─────────────────────────────────────────────────────

Set your quality gates:

  Minimum test coverage [80]: ___%
  Minimum quality score [75]: ___/100
  Require tests before code (TDD) [Y/n]: _

─────────────────────────────────────────────────────
 5. CI/CD INTEGRATION
─────────────────────────────────────────────────────

Set up continuous integration?
  [1] GitHub Actions (recommended)
  [2] GitLab CI
  [3] Azure Pipelines
  [4] Skip for now

Choice [1/2/3/4]: _

(If CI selected)
Block PRs on test failure? (Y/n): _
Block PRs on coverage drop? (Y/n): _

─────────────────────────────────────────────────────
 6. EXISTING CODE
─────────────────────────────────────────────────────

Found 34 source files without tests.

How should TLC handle existing code?
  [1] Create test backlog - I'll add tests gradually
  [2] Generate tests now - for critical paths first
  [3] Ignore existing - only enforce TLC on new code

Choice [1/2/3]: _

─────────────────────────────────────────────────────
 7. ADVANCED OPTIONS
─────────────────────────────────────────────────────

Configure advanced settings? (y/N): _

(If yes)
  Auto-fix failing tests [Y/n]: _
  Edge case generation [Y/n]: _
  PR auto-review [Y/n]: _
  Max parallel agents [10]: _
```

### Step 1.4: Generate Configuration

Create `.tlc.json` with all settings:

```json
{
  "version": "1.0",
  "lastSync": "abc123def456",
  "git": {
    "mainBranch": "main"
  },
  "testFrameworks": {
    "primary": "mocha",
    "installed": ["mocha", "chai", "sinon", "proxyquire"],
    "run": ["mocha"]
  },
  "team": {
    "mode": "team",
    "requireClaim": true,
    "slackWebhook": null
  },
  "quality": {
    "coverageThreshold": 80,
    "qualityScoreThreshold": 75,
    "enforceTDD": true
  },
  "ci": {
    "provider": "github",
    "blockOnTestFailure": true,
    "blockOnCoverageDrop": true
  },
  "existingCode": {
    "strategy": "backlog"
  },
  "advanced": {
    "autofix": true,
    "edgeCases": true,
    "prAutoReview": true,
    "maxAgents": 10
  }
}
```

### Step 1.5: Apply Configuration

Based on choices, set up the project:

```
Applying configuration...

✓ Test framework: mocha
  → Installed: mocha, chai, sinon, proxyquire
  → Created: .mocharc.json
  → Added test scripts to package.json

✓ Git: main branch set to "main"
  → Installed: post-rebase hook

✓ Team mode: enabled
  → Task claiming required

✓ Quality gates: 80% coverage, 75 quality score

✓ CI: GitHub Actions
  → Created: .github/workflows/tlc.yml

✓ Existing code: backlog created
  → Created: .planning/BACKLOG.md (34 files to test)

✓ Planning structure
  → Created: PROJECT.md
  → Created: .planning/ROADMAP.md
  → Created: .planning/STATE.md
```

### Step 1.6: Install Git Hook

Create `.git/hooks/post-rebase`:

```bash
#!/bin/bash
# TLC post-rebase hook

echo ""
echo "⚠️  Rebase detected. Run /tlc:sync to reconcile changes."
echo ""

# Update marker file so TLC knows rebase happened
touch .tlc-rebase-marker
```

Make executable:
```bash
chmod +x .git/hooks/post-rebase
```

### Step 1.7: Summary

```
─────────────────────────────────────────────────────
 TLC SETUP COMPLETE
─────────────────────────────────────────────────────

Configuration saved to .tlc.json

Your setup:
  • Test framework: Mocha + Chai + Sinon
  • Main branch: main
  • Team mode: Enabled (claiming required)
  • Coverage target: 80%
  • CI: GitHub Actions

Next steps:
  /tlc              → See what to do next
  /tlc:plan         → Plan your first phase
  /tlc:build        → Start building (test-first)

Run /tlc:sync anytime after rebasing to reconcile changes.

Happy testing! 🧪
```

---

## Scenario 2: Post-Rebase Reconciliation

**ONLY run this if .tlc.json EXISTS and HEAD differs from lastSync.**

Detect and handle code changes from rebase.

### Step 2.1: Detect Changes

```bash
# Get stored commit
lastSync=$(jq -r '.lastSync // ""' .tlc.json)

# Get current HEAD
currentHead=$(git rev-parse HEAD)

# Check for rebase marker
rebaseMarker=".tlc-rebase-marker"
```

If `lastSync` equals `currentHead` and no rebase marker:
```
✓ Already synced. Nothing to do.
```

Otherwise, continue to analysis.

### Step 2.2: Analyze Incoming Changes

```bash
# Get changed files since last sync
changedFiles=$(git diff --name-only $lastSync $currentHead 2>/dev/null)

# Categorize changes
newFiles=$(git diff --name-only --diff-filter=A $lastSync $currentHead)
modifiedFiles=$(git diff --name-only --diff-filter=M $lastSync $currentHead)
deletedFiles=$(git diff --name-only --diff-filter=D $lastSync $currentHead)
```

Present analysis:

```
─────────────────────────────────────────────────────
 REBASE DETECTED
─────────────────────────────────────────────────────

Last sync: abc123 (2 hours ago)
Current:   def456 (just now)

Changes detected:

  New files (4):
    + src/api/payments.ts
    + src/api/webhooks.ts
    + src/services/stripe.ts
    + src/utils/currency.ts

  Modified files (7):
    ~ src/api/users.ts
    ~ src/db/schema.ts
    ~ src/middleware/auth.ts
    ~ tests/api/users.test.ts
    ~ ...

  Deleted files (1):
    - src/old-payment.ts

  Tests for new code: 0 found ⚠️
```

### Step 2.3: Auto-Sync (Default Behavior)

**DO NOT ask about individual files. Just sync automatically.**

```
Syncing...

✓ Updated lastSync to ${currentHead:0:7}
✓ Removed rebase marker (if present)

Sync complete.
```

That's it. The sync just updates the tracking. Tests are written when you run `/tlc:build`.

**Why no file-by-file questions?**
- Incoming code was already reviewed in the PR
- Tests will be written during the build phase
- Asking about every file is annoying and slow

### Step 2.4: Optional - Add Tests for Untested Code

If `.tlc.json` has `existingCode.strategy: "backlog"`, silently note any new untested files:

```bash
# Find new source files without tests
newUntested=$(for f in $newFiles; do
  if [[ $f == src/* ]] && ! [ -f "tests/${f#src/}" ]; then
    echo "$f"
  fi
done)

if [ -n "$newUntested" ]; then
  echo "Note: $(echo "$newUntested" | wc -l) new files added to test backlog"
fi
```

DO NOT ask about them. Just note and continue.

### Step 2.6: Update Sync State

After sync completes:

```bash
# Update lastSync in .tlc.json
currentHead=$(git rev-parse HEAD)
jq ".lastSync = \"$currentHead\"" .tlc.json > .tlc.json.tmp
mv .tlc.json.tmp .tlc.json

# Remove rebase marker if exists
rm -f .tlc-rebase-marker

# Commit the sync
git add .
git commit -m "sync: reconcile changes from rebase"
```

---

## Auto-Detection in /tlc

The main `/tlc` command should check sync status first:

```
/tlc

Checking sync status...
⚠️ Rebase detected since last sync.

Run /tlc:sync to reconcile changes before continuing.
```

This ensures users don't accidentally work on out-of-sync code.

---

## Configuration Reference

Settings managed by `/tlc:sync`:

| Setting | First-Time | Post-Rebase |
|---------|------------|-------------|
| `lastSync` | Set to current HEAD | Updated after reconciliation |
| `git.mainBranch` | Asked | Unchanged |
| `testFrameworks` | Asked | Unchanged |
| `team` | Asked | Unchanged |
| `quality` | Asked | Unchanged |
| `ci` | Asked | Unchanged |
| `advanced` | Asked | Unchanged |

---

## Error Handling

**No git repository:**
```
Error: Not a git repository.
TLC requires git for sync tracking.
Run: git init
```

**Uncommitted changes:**
```
⚠️ You have uncommitted changes.
Commit or stash them before syncing.
```

Then stop. Don't offer choices.
