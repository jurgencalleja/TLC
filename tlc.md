# /tlc - Smart Entry Point

**TLC v{{VERSION}}**

One command. Context-aware. Shows exactly where you are and what's next.

## First Response

Always start by showing the version and phase checklist:

```
TLC v{{VERSION}}
```

Then show the Phase Checklist (Step 1) before anything else.

## Process

### Step 0: Auto-Sync Check (ALWAYS FIRST)

Before anything else, check if sync is needed:

```bash
# Check if .tlc.json exists
if [ ! -f ".tlc.json" ]; then
  echo "Welcome to TLC!"
  echo ""
  echo "No configuration found. Let's set up your project."
  echo ""
  echo "Run setup now? (Y/n)"
  # If yes → Run sync.md "Scenario 1: First-Time Adoption"
  exit
fi

# Check sync state
lastSync=$(jq -r '.lastSync // ""' .tlc.json)
currentHead=$(git rev-parse HEAD 2>/dev/null)

# Initialize lastSync if missing
if [ -z "$lastSync" ]; then
  jq ".lastSync = \"$currentHead\"" .tlc.json > .tlc.json.tmp && mv .tlc.json.tmp .tlc.json
  echo "✓ Synced (initialized)"
fi

# Check for rebase/changes
if [ -f ".tlc-rebase-marker" ] || [ "$lastSync" != "$currentHead" ]; then
  echo "⚠️ Codebase changed since last sync."
  echo "Run sync now? (Y/n)"
  # If yes → Run sync.md "Scenario 2: Post-Rebase"
  exit
fi

# Check if main is ahead
mainBranch=$(jq -r '.git.mainBranch // "main"' .tlc.json)
git fetch origin $mainBranch 2>/dev/null
behindCount=$(git rev-list HEAD..origin/$mainBranch --count 2>/dev/null)

if [ "$behindCount" -gt 0 ]; then
  echo "⚠️ Main is $behindCount commits ahead."
  echo "[1] Integrate  [2] Skip"
  # If 1 → Run sync.md "Scenario 3: Integrate Main"
fi

echo "✓ Synced"
```

### Step 1: Show Phase Checklist (ALWAYS SHOW THIS)

**This is the core of `/tlc` - always show the current phase status:**

```
TLC v{{VERSION}}                                    ✓ Synced
═══════════════════════════════════════════════════════════════

Phase 2: User Dashboard
───────────────────────────────────────────────────────────────

  Workflow Status:
  ────────────────
  [x] 1. Discussed     .planning/phases/2-DISCUSSION.md
  [x] 2. Planned       .planning/phases/2-PLAN.md (4 tasks)
  [ ] 3. Unit tests    not written
  [ ] 4. E2E tests     not written
  [ ] 5. Implemented   0/4 tasks
  [ ] 6. Verified      pending

  ⚠️  Skipped Steps:
  ──────────────────
  • E2E scenarios not defined in plan (recommended)

  Quality Gates:
  ──────────────
  [ ] Coverage: --% (target: 80%)
  [ ] Quality score: --/100 (target: 75)

───────────────────────────────────────────────────────────────

  → Next: /tlc:build 2 (writes tests, then implements)

  Quick Actions:
  [1] Continue with recommended action
  [2] Go back and fix skipped steps
  [3] Show all commands (/tlc:help)
  [4] Full project checklist (/tlc:checklist)

Choice [1/2/3/4]: _
```

### Step 2: Detect Current Phase

Parse `.planning/ROADMAP.md` to find current phase:

```bash
# Find current phase marker
currentPhase=$(grep -n '\[>\]\|\[current\]\|\[in.progress\]' .planning/ROADMAP.md | head -1)

# If no current, find first incomplete
if [ -z "$currentPhase" ]; then
  currentPhase=$(grep -n '^\s*-\s*\[ \]' .planning/ROADMAP.md | head -1)
fi
```

### Step 3: Check Phase Artifacts

For the current phase N, check what exists:

| Artifact | Check | Status |
|----------|-------|--------|
| Discussion | `.planning/phases/{N}-DISCUSSION.md` exists | [x] or [ ] |
| Plan | `.planning/phases/{N}-PLAN.md` exists | [x] or [ ] |
| Unit Tests | `.planning/phases/{N}-TESTS.md` exists OR test files created | [x] or [ ] |
| E2E Tests | `tests/e2e/phase-{N}.spec.ts` exists | [x] or [ ] |
| Implementation | All tasks marked `[x@user]` in PLAN.md | [x] or [ ] |
| Verification | `.planning/phases/{N}-VERIFIED.md` exists | [x] or [ ] |

### Step 4: Identify Skipped Steps

Check for common skipped steps and warn:

```
Skipped Steps Detection:
─────────────────────────

1. Discussion skipped?
   - PLAN.md exists but no DISCUSSION.md
   → "Phase planned without discussion - approach may not be optimal"

2. E2E not defined?
   - PLAN.md has no E2E scenarios section
   → "No E2E scenarios in plan - user flows won't be tested"

3. Tests skipped?
   - Implementation started but TESTS.md missing
   → "Code written before tests - not TDD!"

4. Verification skipped?
   - Next phase started but current not verified
   → "Phase 2 not verified - bugs may slip through"

5. Coverage not checked?
   - Phase complete but no coverage report
   → "Test coverage not measured"
```

### Step 5: Show Quality Gates

If `.tlc.json` has quality thresholds, show them:

```bash
coverageTarget=$(jq -r '.quality.coverageThreshold // 80' .tlc.json)
qualityTarget=$(jq -r '.quality.qualityScoreThreshold // 75' .tlc.json)

# Get current values (from last test run)
currentCoverage=$(jq -r '.lastCoverage // "--"' .tlc.json)
currentQuality=$(jq -r '.lastQualityScore // "--"' .tlc.json)
```

Display:
```
Quality Gates:
  [ ] Coverage: 72% (target: 80%) ⚠️ BELOW TARGET
  [x] Quality score: 78/100 (target: 75) ✓
```

### Step 6: Recommend Next Action

Based on phase state, recommend ONE action:

| State | Recommendation |
|-------|----------------|
| No discussion | `/tlc:discuss {N}` |
| Discussed, no plan | `/tlc:plan {N}` |
| Planned, no tests | `/tlc:build {N}` |
| Tests written, not passing | `/tlc:build {N}` (continue) |
| Tests passing, not verified | `/tlc:verify {N}` |
| Verified | Move to next phase |
| All phases done | `/tlc:complete` |

### Step 7: Handle User Choice

```
[1] Continue with recommended action
    → Run the recommended command

[2] Go back and fix skipped steps
    → Show list of skipped steps with fix commands:

    Skipped steps to fix:
    1. Add E2E scenarios → Edit .planning/phases/2-PLAN.md
    2. Run coverage check → /tlc:coverage

    Which to fix? [1/2]: _

[3] Show all commands
    → Run /tlc:help

[4] Full project checklist
    → Run /tlc:checklist
```

### Step 8: Validation Gates

**Before allowing certain actions, validate prerequisites:**

```
Validation Rules:
─────────────────

/tlc:build without /tlc:plan:
  → "⚠️ No plan found. Run /tlc:plan first? (Y/n)"

/tlc:verify without tests passing:
  → "⚠️ Tests not passing. Cannot verify. Run /tlc:build first."

/tlc:complete without all phases verified:
  → "⚠️ Phase 3 not verified. Complete verification first."

Moving to next phase without E2E:
  → "⚠️ No E2E tests for Phase 2. Add them? (Y/n)"
```

## No Project Detected

If no `.tlc.json` and no `PROJECT.md`:

```
TLC v{{VERSION}}
═══════════════════════════════════════════════════════════════

No TLC project detected.

Options:
  [1] Start new project     → /tlc:new-project
  [2] Add TLC to existing   → /tlc:init

Choice [1/2]: _
```

## All Phases Complete

```
TLC v{{VERSION}}                                    ✓ Synced
═══════════════════════════════════════════════════════════════

🎉 All Phases Complete!
───────────────────────────────────────────────────────────────

  Phase 1: Authentication     [x] Verified
  Phase 2: User Dashboard     [x] Verified
  Phase 3: Reports            [x] Verified

  Quality Summary:
  ────────────────
  [x] Coverage: 87% (target: 80%)
  [x] Quality score: 82/100 (target: 75)
  [x] All E2E tests passing

───────────────────────────────────────────────────────────────

  Next Steps:
  [1] Tag release        → /tlc:complete
  [2] Start next version → /tlc:new-milestone
  [3] Review coverage    → /tlc:coverage

Choice [1/2/3]: _
```

## Usage

```
/tlc
```

No arguments. Shows exactly where you are, what's done, what's skipped, and what's next.
