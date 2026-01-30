# /tlc:checklist - Full Project Checklist

**TLC v{{VERSION}}**

Shows the complete project status across all phases with best practices checklist.

## What This Does

Displays a comprehensive view of:
1. Project setup status
2. All phases with workflow completion
3. Skipped steps across the project
4. Quality metrics summary
5. Recommended actions

## Output Format

```
TLC v{{VERSION}}                                         Project Checklist
═══════════════════════════════════════════════════════════════════════════

PROJECT SETUP
─────────────────────────────────────────────────────────────────────────────
  [x] PROJECT.md exists
  [x] .tlc.json configured
  [x] Git repository initialized
  [x] Main branch: main

  Test Infrastructure:
  [x] Unit test framework: mocha
  [x] E2E framework: playwright
  [ ] CI/CD configured

  Quality Gates:
  [x] Coverage threshold: 80%
  [x] Quality score threshold: 75

═══════════════════════════════════════════════════════════════════════════

PHASE OVERVIEW
─────────────────────────────────────────────────────────────────────────────

  Phase 1: Authentication                              [COMPLETE] ✓
  ─────────────────────────────────────────────────────
  [x] Discussed    [x] Planned    [x] Unit Tests
  [x] E2E Tests    [x] Implemented [x] Verified

  Phase 2: User Dashboard                              [IN PROGRESS]
  ─────────────────────────────────────────────────────
  [x] Discussed    [x] Planned    [ ] Unit Tests
  [ ] E2E Tests    [ ] Implemented [ ] Verified

  ⚠️  Skipped: E2E scenarios not in plan

  Phase 3: Reports                                     [PENDING]
  ─────────────────────────────────────────────────────
  [ ] Discussed    [ ] Planned    [ ] Unit Tests
  [ ] E2E Tests    [ ] Implemented [ ] Verified

  Phase 4: Admin Panel                                 [PENDING]
  ─────────────────────────────────────────────────────
  [ ] Discussed    [ ] Planned    [ ] Unit Tests
  [ ] E2E Tests    [ ] Implemented [ ] Verified

═══════════════════════════════════════════════════════════════════════════

QUALITY SUMMARY
─────────────────────────────────────────────────────────────────────────────

  Test Coverage:
  ──────────────
  Overall: 72% (target: 80%)  ⚠️ BELOW TARGET

  Phase 1: 89% ✓
  Phase 2: 45% ⚠️
  Phase 3: --
  Phase 4: --

  Test Counts:
  ────────────
  Unit tests:  47 passing, 0 failing
  E2E tests:   12 passing, 0 failing

  Quality Score: 78/100 (target: 75) ✓

═══════════════════════════════════════════════════════════════════════════

SKIPPED STEPS (ACTION NEEDED)
─────────────────────────────────────────────────────────────────────────────

  1. Phase 2: No E2E scenarios defined
     → Add E2E section to .planning/phases/2-PLAN.md

  2. Phase 2: Coverage below threshold (45%)
     → Run /tlc:coverage to identify gaps

  3. Project: No CI/CD configured
     → Run /tlc:ci to generate pipeline

═══════════════════════════════════════════════════════════════════════════

RECOMMENDED WORKFLOW
─────────────────────────────────────────────────────────────────────────────

  For each phase, follow this order:

  1. /tlc:discuss    Shape the implementation approach
  2. /tlc:plan       Break into tasks with test cases + E2E scenarios
  3. /tlc:build      Write tests → implement → run E2E
  4. /tlc:verify     Human acceptance testing
  5. /tlc:coverage   Check test coverage meets threshold

  Before release:
  6. /tlc:quality    Ensure quality score meets threshold
  7. /tlc:complete   Tag release

═══════════════════════════════════════════════════════════════════════════

Quick Actions:
  [1] Continue current phase  → /tlc
  [2] Fix skipped steps       → Shows fix menu
  [3] Run coverage check      → /tlc:coverage
  [4] Show all commands       → /tlc:help

Choice [1/2/3/4]: _
```

## Process

### Step 1: Load Project Config

```bash
# Read .tlc.json
config=$(cat .tlc.json)

# Extract settings
unitFramework=$(echo $config | jq -r '.testFrameworks.primary // "not configured"')
e2eFramework=$(echo $config | jq -r '.e2e.framework // "not configured"')
coverageThreshold=$(echo $config | jq -r '.quality.coverageThreshold // 80')
qualityThreshold=$(echo $config | jq -r '.quality.qualityScoreThreshold // 75')
mainBranch=$(echo $config | jq -r '.git.mainBranch // "main"')
```

### Step 2: Scan All Phases

```bash
# Parse ROADMAP.md for all phases
phases=$(grep -E '^\s*-\s*\[' .planning/ROADMAP.md)

# For each phase, check artifacts
for phase in 1 2 3 4 5; do
  discussion=".planning/phases/${phase}-DISCUSSION.md"
  plan=".planning/phases/${phase}-PLAN.md"
  tests=".planning/phases/${phase}-TESTS.md"
  e2e="tests/e2e/phase-${phase}.spec.ts"
  verified=".planning/phases/${phase}-VERIFIED.md"

  # Check existence
  [ -f "$discussion" ] && discussed="[x]" || discussed="[ ]"
  [ -f "$plan" ] && planned="[x]" || planned="[ ]"
  # ... etc
done
```

### Step 3: Collect Skipped Steps

Build list of all skipped/missing steps across project:

```
Skipped Step Categories:
─────────────────────────

1. Missing artifacts (DISCUSSION.md, PLAN.md, etc.)
2. E2E scenarios not defined in plans
3. Coverage below threshold
4. Quality score below threshold
5. CI/CD not configured
6. Phases not verified
7. Tests written after code (detected by commit order)
```

### Step 4: Calculate Quality Metrics

```bash
# Run test coverage
npm run test:coverage 2>/dev/null

# Parse coverage report
coverage=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')

# Run quality scorer
qualityScore=$(node -e "require('./server/lib/quality-scorer').score()" 2>/dev/null)
```

### Step 5: Display and Prompt

Show the full checklist and offer actions.

## Usage

```
/tlc:checklist
```

No arguments. Shows complete project status.

## When to Use

- Starting a work session (see overall status)
- Before release (ensure nothing skipped)
- Onboarding new team member (show project health)
- Sprint planning (identify gaps to address)
