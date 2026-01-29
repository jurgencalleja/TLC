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

## Scenario Detection

```
Check for .tlc.json:
  ├── Not found → First-time adoption
  └── Found → Check for changes
                 ├── HEAD matches lastSync → Already synced
                 └── HEAD differs → Post-rebase reconciliation
```

---

## Scenario 1: First-Time Adoption

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

### Step 2.3: Choose Reconciliation Strategy

```
─────────────────────────────────────────────────────
 RECONCILIATION STRATEGY
─────────────────────────────────────────────────────

How should TLC handle the incoming code?

[1] CONFORM TO TLC (Recommended)
    → Analyze incoming code
    → Generate tests for new files
    → Apply TLC patterns (if needed)
    → May modify incoming files

    Best when: You want all code to follow TLC standards

[2] PRESERVE INCOMING
    → Keep incoming code exactly as-is
    → Update YOUR existing code to work with it
    → Incoming files are untouched

    Best when: Incoming code is reviewed/approved,
    you just need to integrate

[3] MANUAL REVIEW
    → Show detailed diff
    → Let me decide file-by-file

    Best when: Mixed situation, some files need
    conforming, others should be preserved

Choice [1/2/3]: _
```

### Step 2.4a: Strategy - Conform to TLC

```
─────────────────────────────────────────────────────
 CONFORMING INCOMING CODE TO TLC
─────────────────────────────────────────────────────

Analyzing 4 new files...

src/api/payments.ts
  → No tests found
  → Generating: tests/api/payments.test.ts
  → 6 test cases identified

src/api/webhooks.ts
  → No tests found
  → Generating: tests/api/webhooks.test.ts
  → 4 test cases identified

src/services/stripe.ts
  → No tests found
  → Generating: tests/services/stripe.test.ts
  → 8 test cases identified (mocking Stripe API)

src/utils/currency.ts
  → No tests found
  → Generating: tests/utils/currency.test.ts
  → 5 test cases identified

Analyzing 7 modified files...

src/api/users.ts
  → Existing tests: tests/api/users.test.ts
  → 2 new functions added, need 3 new test cases
  → Updating test file

src/db/schema.ts
  → Existing tests cover changes ✓

...

─────────────────────────────────────────────────────
 PROPOSED CHANGES
─────────────────────────────────────────────────────

Will create:
  + tests/api/payments.test.ts (6 tests)
  + tests/api/webhooks.test.ts (4 tests)
  + tests/services/stripe.test.ts (8 tests)
  + tests/utils/currency.test.ts (5 tests)

Will update:
  ~ tests/api/users.test.ts (+3 tests)

Total: 26 new tests

Apply changes? (Y/n): _
```

If confirmed, write tests and run them:

```
Creating tests...

✓ tests/api/payments.test.ts
  Running... 6 passing

✓ tests/api/webhooks.test.ts
  Running... 4 passing

✓ tests/services/stripe.test.ts
  Running... 7 passing, 1 failing

  ⚠️ stripe.test.ts:45 - handleRefund expects different response

  Options:
    [1] Fix the test (incoming code is correct)
    [2] Fix the code (test expectation is correct)
    [3] Skip for now (add to backlog)

  Choice: _

✓ tests/utils/currency.test.ts
  Running... 5 passing

✓ tests/api/users.test.ts (updated)
  Running... 12 passing

─────────────────────────────────────────────────────

Sync complete!
  → 25 tests passing
  → 1 issue added to backlog
  → Committed: "sync: add tests for rebased code"

Updated .tlc.json lastSync to def456
```

### Step 2.4b: Strategy - Preserve Incoming

```
─────────────────────────────────────────────────────
 PRESERVING INCOMING CODE
─────────────────────────────────────────────────────

Incoming files will NOT be modified.
Checking integration points...

Analyzing impact on existing TLC code...

src/api/users.ts (incoming) affects:
  → tests/api/users.test.ts (yours)
    3 tests now failing due to API changes

src/db/schema.ts (incoming) affects:
  → tests/db/schema.test.ts (yours)
    1 test failing - new required field
  → src/api/auth.ts (yours)
    Type error - User type changed

─────────────────────────────────────────────────────
 REQUIRED UPDATES TO YOUR CODE
─────────────────────────────────────────────────────

To integrate incoming changes, TLC needs to update:

  tests/api/users.test.ts
    → Update 3 test expectations to match new API

  tests/db/schema.test.ts
    → Add required field to test fixtures

  src/api/auth.ts
    → Update User type usage (line 45, 67)

Apply updates? (Y/n): _
```

If confirmed:

```
Updating your code to integrate...

✓ tests/api/users.test.ts - 3 expectations updated
✓ tests/db/schema.test.ts - fixture updated
✓ src/api/auth.ts - type usage fixed

Running all tests...
✓ 47 passing

Sync complete!
  → Incoming code preserved
  → Your code updated to integrate
  → Committed: "sync: integrate rebased changes"

Updated .tlc.json lastSync to def456
```

### Step 2.4c: Strategy - Manual Review

```
─────────────────────────────────────────────────────
 MANUAL FILE-BY-FILE REVIEW
─────────────────────────────────────────────────────

Review each changed file:

[1/4] src/api/payments.ts (NEW)

      No tests. 142 lines. Payment processing logic.

      Action:
        [C] Conform - generate tests
        [P] Preserve - add to backlog for later
        [S] Skip - ignore this file

      Choice: _

[2/4] src/api/webhooks.ts (NEW)
      ...

[3/4] src/api/users.ts (MODIFIED)

      Changes: +45 lines, -12 lines
      2 new functions: updateProfile, deleteAccount

      Existing tests: tests/api/users.test.ts
      Tests affected: 3 failing

      Action:
        [C] Conform - update tests for new behavior
        [P] Preserve - update your code to match
        [V] View diff

      Choice: _
```

### Step 2.5: Update Sync State

After any strategy completes:

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

TLC sync works best with a clean working tree.
Options:
  [1] Stash changes, sync, then restore
  [2] Commit changes first
  [3] Continue anyway (not recommended)

Choice: _
```

**Merge conflicts during reconciliation:**
```
⚠️ Conflict in tests/api/users.test.ts

The incoming code and your tests have conflicting changes.

Options:
  [1] Keep yours (incoming tests discarded)
  [2] Keep theirs (your tests replaced)
  [3] Open in editor to resolve manually

Choice: _
```
