# /tdd:complete - Complete Milestone

Archive current milestone and tag the release.

## What This Does

1. Verifies all phases complete
2. Runs full test suite
3. Creates git tag
4. Archives milestone files
5. Prepares for next version

## Usage

```
/tdd:complete
```

## Process

### Step 1: Check All Phases Complete

Read `.planning/ROADMAP.md` and verify:
- All phases marked `[x]` or `[completed]`
- All phases have `{N}-VERIFIED.md`

If incomplete:
```
Cannot complete milestone.

Incomplete phases:
  - Phase 4: Reports (not verified)
  - Phase 5: Settings (not built)

Run /tdd to continue building.
```

### Step 2: Run Full Test Suite

```bash
npm test
```

- ✅ All pass → Continue
- ❌ Any fail → Block completion

```
Cannot complete milestone.

3 tests failing:
  - user.test.ts: login timeout
  - api.test.ts: invalid response

Fix tests before completing.
```

### Step 3: Confirm Completion

```
Milestone: v1.0

Summary:
  - 5 phases completed
  - 47 tests passing
  - All phases verified

Ready to tag release? (Y/n)
```

### Step 4: Create Git Tag

```bash
git tag -a v1.0 -m "Release v1.0

Phases:
- Phase 1: Authentication
- Phase 2: User Dashboard
- Phase 3: Reports
- Phase 4: Settings
- Phase 5: Admin Panel

Tests: 47 passing"
```

### Step 5: Archive Milestone

Move planning files:
```
.planning/
├── archive/
│   └── v1.0/
│       ├── ROADMAP.md
│       ├── phases/
│       │   ├── 1-PLAN.md
│       │   ├── 1-VERIFIED.md
│       │   └── ...
│       └── SUMMARY.md
└── (clean for next milestone)
```

Create `.planning/archive/v1.0/SUMMARY.md`:
```markdown
# v1.0 Release Summary

Released: {date}
Tag: v1.0

## Phases

1. Authentication - User login, registration, sessions
2. User Dashboard - Main interface, data display
3. Reports - Export, PDF generation
4. Settings - User preferences
5. Admin Panel - User management

## Stats

- Total tests: 47
- Duration: {X days/weeks}
- Commits: {N}

## Notes

{Any release notes}
```

### Step 6: Complete

```
✅ Milestone v1.0 complete!

Tag created: v1.0
Files archived to .planning/archive/v1.0/

Next steps:
1) Push tag: git push origin v1.0
2) Start next version: /tdd:new-milestone v2.0
```

## Example

```
> /tdd:complete

Checking milestone status...

✅ All 5 phases verified
✅ 47 tests passing

Ready to complete v1.0? (Y/n) > y

Creating tag v1.0...
Archiving planning files...

✅ Milestone v1.0 complete!

Push to remote? (Y/n) > y

Done! Start v2.0 with /tdd:new-milestone
```
