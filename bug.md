# /tlc:bug - Log a Bug or Feedback

Report issues discovered during development or QA verification.

## Usage

```
/tlc:bug [description]
```

Or interactive:
```
/tlc:bug
```

## Process

### Step 1: Gather Bug Information

If description provided as argument, use it. Otherwise prompt:

```
What's the issue?
> Login fails when email contains a + symbol

Where did you find this?
1) During development
2) During /tlc:verify (QA)
3) From automated tests
4) User reported
> 2

Severity?
1) Critical - blocks release
2) High - major feature broken
3) Medium - workaround exists
4) Low - cosmetic/minor
> 2
```

### Step 2: Identify Context

Automatically detect:
- Current user: `git config user.name` or `$TLC_USER`
- Current phase: from `.planning/ROADMAP.md`
- Current task: from any `[>@user]` marker in PLAN.md
- Git branch: `git branch --show-current`
- Last commit: `git log -1 --oneline`

### Step 3: Generate Bug ID

Format: `BUG-{NNN}` where NNN is sequential.

Read `.planning/BUGS.md` to find highest existing ID, increment.

### Step 4: Create Bug Entry

Append to `.planning/BUGS.md`:

```markdown
---

### BUG-007: Login fails with + symbol in email

**Status:** Open
**Severity:** High
**Reporter:** @alice
**Date:** 2024-01-26
**Phase:** 2 - Authentication
**Task:** Task 3 - Email validation
**Branch:** feature/auth
**Commit:** a1b2c3d

**Description:**
Login fails when email contains a + symbol (e.g., user+test@example.com)

**Steps to Reproduce:**
1. Go to login page
2. Enter email: user+test@example.com
3. Enter valid password
4. Click Login

**Expected:** Should accept valid email and log in
**Actual:** Shows "Invalid email format" error

**Notes:**
Plus addressing is valid per RFC 5321. Regex validation is too strict.
```

### Step 5: Commit Bug Report

```bash
git add .planning/BUGS.md
git commit -m "bug: BUG-007 - Login fails with + symbol (@alice)"
```

### Step 6: Link to Task (Optional)

If bug relates to a specific task, offer to add reference:

```
Link this bug to Task 3 in the current phase? (Y/n)
```

If yes, add to task in PLAN.md:
```markdown
### Task 3: Email validation [>@bob]

**Bugs:** BUG-007
```

### Step 7: Notify

```
Bug logged: BUG-007
File: .planning/BUGS.md
Committed: bug: BUG-007 - Login fails with + symbol (@alice)

Push to share with team? (Y/n)
```

## Bug Status Workflow

| Status | Meaning |
|--------|---------|
| Open | New, not yet addressed |
| In Progress | Someone is fixing |
| Fixed | Code fixed, needs verification |
| Verified | Fix confirmed working |
| Closed | Resolved |
| Won't Fix | Declined with reason |

## Updating Bug Status

To update an existing bug:

```
/tlc:bug --update BUG-007 --status "Fixed"
```

Or interactive:
```
/tlc:bug --update

Which bug?
  BUG-005: Session timeout too short (Open)
  BUG-006: Missing loading spinner (Open)
  BUG-007: Login fails with + symbol (Open)
> BUG-007

New status?
1) In Progress
2) Fixed
3) Verified
4) Closed
5) Won't Fix
> 2

Add resolution notes?
> Fixed regex in src/auth/validate.ts to allow + in local part

Updated BUG-007: Open → Fixed
```

## Viewing Bugs

To see all open bugs:

```
/tlc:bug --list

Open Bugs (3):

| ID | Severity | Description | Reporter | Phase |
|----|----------|-------------|----------|-------|
| BUG-005 | Medium | Session timeout too short | @alice | 2 |
| BUG-006 | Low | Missing loading spinner | @bob | 2 |
| BUG-007 | High | Login fails with + symbol | @alice | 2 |

Critical: 0 | High: 1 | Medium: 1 | Low: 1
```

## Integration with /tlc:verify

During `/tlc:verify`, QA is prompted to log bugs:

```
Testing Task 3: Email validation

Did you find any issues? (Y/n) y

/tlc:bug (interactive mode)
...
```

## Example Session

```
> /tlc:bug "Button color doesn't match design spec"

Gathering context...
  User: @alice
  Phase: 3 - Dashboard
  Branch: feature/dashboard

Severity?
1) Critical
2) High
3) Medium
4) Low
> 4

BUG-008 created:
  "Button color doesn't match design spec"
  Severity: Low
  Phase: 3 - Dashboard

Committed: bug: BUG-008 - Button color doesn't match design spec (@alice)

Push? (Y/n) y
Pushed to origin/feature/dashboard
```

## BUGS.md Format

The bugs file has a header and entries:

```markdown
# Bug Tracker

## Summary

| Status | Count |
|--------|-------|
| Open | 3 |
| In Progress | 1 |
| Fixed | 2 |
| Closed | 5 |

## Open Bugs

### BUG-007: Login fails with + symbol in email
...

### BUG-006: Missing loading spinner
...

## Closed Bugs

### BUG-001: App crashes on startup
**Status:** Closed
**Resolution:** Fixed null check in main.ts
**Closed:** 2024-01-25 by @bob
...
```
