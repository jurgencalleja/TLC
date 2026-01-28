# Team Setup Tutorial

Set up TLC for a team of 3 engineers, a product owner, and QA. This tutorial covers the complete workflow from project setup to deployment.

## Team Roles

| Role | Person | Responsibilities |
|------|--------|------------------|
| **Lead Engineer** | Alice | Architecture, reviews, unblocking |
| **Engineer** | Bob | Feature development |
| **Engineer** | Carol | Feature development |
| **Product Owner** | Dan | Requirements, priorities, acceptance |
| **QA** | Eve | Testing, bug reporting |

## Part 1: Project Setup (Lead Engineer)

### 1.1 Create the Project

Alice creates the project:

```bash
mkdir team-project
cd team-project
git init
```

In Claude Code:
```
/tlc:new-project
```

Configure for team:
- **Project name:** Team Project
- **Description:** Collaborative task management app
- **Tech stack:** Node.js, React, PostgreSQL

### 1.2 Configure Team Settings

Edit `.tlc.json`:

```json
{
  "version": "1.0",
  "team": {
    "requireClaim": true,
    "members": ["alice", "bob", "carol"],
    "slackWebhook": "https://hooks.slack.com/services/xxx"
  },
  "testFrameworks": {
    "primary": "vitest",
    "installed": ["vitest", "@testing-library/react"],
    "run": ["vitest"]
  }
}
```

### 1.3 Set Up Dev Server

```bash
tlc init
```

This creates `tlc-start.bat` (Windows) or `tlc-start.sh` (Mac/Linux).

### 1.4 Push to Repository

```bash
git add .
git commit -m "Initial TLC setup"
git remote add origin https://github.com/team/project.git
git push -u origin main
```

### 1.5 Share with Team

Send team members:
1. Repository URL
2. TLC installation instructions:
   ```bash
   npm install -g tlc-claude-code
   tlc
   ```

## Part 2: Daily Workflow

### 2.1 Engineer Starts Work (Bob)

Bob clones and starts:

```bash
git clone https://github.com/team/project.git
cd project
git pull  # Always pull first!
```

In Claude Code:
```
/tlc
```

TLC shows:
```
Team Project - Status

Phase 2: User Dashboard
├── [ ] Task 1: Create dashboard layout
├── [ ] Task 2: Add stat cards
├── [>@carol] Task 3: Implement charts (Carol working)
└── [ ] Task 4: Add filters

Available tasks: 1, 2, 4
Your tasks: none

Claim a task? (1/2/4)
```

Bob claims Task 1:
```
/tlc:claim 1
```

TLC updates `.planning/phases/2-PLAN.md`:
```markdown
### Task 1: Create dashboard layout [>@bob]
```

And commits:
```
claim: task 1 - dashboard layout (@bob)
```

### 2.2 Build the Task

```
/tlc:build 2
```

TLC focuses on Bob's claimed task:

```
Building Task 1: Create dashboard layout

Writing tests...
Created: tests/components/Dashboard.test.tsx (4 tests)

Running tests...
❌ 4 tests failing (expected)

Implementing...
Created: src/components/Dashboard.tsx

Running tests...
✅ 4 tests passing

Committed: feat: create dashboard layout - phase 2 (@bob)

Task 1 complete. Continue to next available task? (Y/n)
```

### 2.3 Push Progress

```bash
git push
```

Team sees Bob's progress immediately.

### 2.4 Another Engineer (Carol)

Meanwhile, Carol is working on Task 3 (charts). She follows the same workflow:

1. `git pull`
2. `/tlc:build 2` - TLC knows she has Task 3
3. Write tests, implement, commit
4. `git push`

### 2.5 Check Team Status

Any team member can run:
```
/tlc:who
```

```
Team Status

Phase 2: User Dashboard

@alice (lead)
  └── No active tasks

@bob
  └── [>] Task 1: Create dashboard layout (in progress)

@carol
  └── [>] Task 3: Implement charts (in progress)

Completed today:
  └── [x@bob] Task 2: Add stat cards (10:30 AM)

Available:
  └── Task 4: Add filters
```

## Part 3: QA Workflow (Eve)

### 3.1 Start Dev Server

Eve doesn't need Claude Code. She uses the dashboard.

```bash
# In project directory
./tlc-start.sh  # or tlc-start.bat on Windows
```

Browser opens to `http://localhost:3147`

### 3.2 Dashboard View

Eve sees:
- **App Preview** - Live running application
- **Tasks** - Current phase progress
- **Bugs** - Bug list
- **Logs** - Real-time application logs

### 3.3 Submit a Bug

Eve finds an issue. She clicks "Report Bug" in the dashboard:

```
Title: Chart tooltip shows wrong date

Severity: Medium

Steps:
1. Go to Dashboard
2. Hover over any chart point
3. Tooltip shows date as "Invalid Date"

Expected: Should show formatted date like "Jan 15, 2024"
```

Click "Submit" - bug is added to `.planning/BUGS.md`:

```markdown
### BUG-001: Chart tooltip shows wrong date [open]

**Severity:** medium
**Reported:** 2024-01-15
**Reporter:** @eve

Steps to reproduce:
1. Go to Dashboard
2. Hover over any chart point
3. Tooltip shows date as "Invalid Date"

Expected: Should show formatted date like "Jan 15, 2024"
```

### 3.4 Engineers See Bugs

Carol (working on charts) runs:
```
/tlc:progress
```

```
⚠️ New bug affecting your work:
BUG-001: Chart tooltip shows wrong date (medium)

Fix before completing Task 3? (Y/n)
```

Carol fixes the bug, and TLC updates the bug status.

## Part 4: Product Owner Workflow (Dan)

### 4.1 Review Progress

Dan uses the dashboard at `http://localhost:3147`:

- **Progress bar** shows phase completion
- **Tasks** shows who's working on what
- **Test status** shows passing/failing

### 4.2 Verify Completed Features

When a phase is ready, Alice runs:
```
/tlc:verify 2
```

Dan joins the verification:

```
Phase 2 Verification

@dan - Please verify:

1. Dashboard Layout
   [ ] Displays correctly on desktop
   [ ] Displays correctly on mobile
   [ ] Navigation works

2. Stat Cards
   [ ] Shows correct totals
   [ ] Updates in real-time
   [ ] Handles empty state

3. Charts
   [ ] Data loads correctly
   [ ] Tooltips show correct values
   [ ] Responsive on resize

4. Filters
   [ ] Date range works
   [ ] Category filter works
   [ ] Filters persist on reload

All verified? Type issues or confirm:
```

Dan types:
```
Charts tooltip still shows UTC time, should be local time
```

TLC creates a bug and blocks phase completion.

## Part 5: CI/CD Integration

### 5.1 Set Up CI

Alice runs:
```
/tlc:ci --both
```

TLC creates `.github/workflows/test.yml`:

```yaml
name: TLC Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test
      - name: Coverage Check
        run: |
          coverage=$(npm run coverage -- --json | jq '.total.lines.pct')
          if (( $(echo "$coverage < 80" | bc -l) )); then
            echo "Coverage $coverage% below 80% threshold"
            exit 1
          fi
```

### 5.2 PR Workflow

Bob creates a PR:

```bash
git checkout -b feature/dashboard-layout
git push -u origin feature/dashboard-layout
gh pr create --title "Add dashboard layout"
```

GitHub Actions runs tests. If they pass, TLC auto-reviews:

```
/tlc:review-pr 42
```

Posts to PR:
```markdown
## 🤖 TLC Code Review

| Check | Status |
|-------|--------|
| Test Coverage | ✅ 94% |
| TDD Score | ✅ 100% |
| Security | ✅ No issues |

### Verdict: ✅ APPROVED

---
*Automated review by TLC*
```

### 5.3 Merge Protection

In GitHub repo settings, enable:
- Require status checks (TLC Tests)
- Require review approval
- No direct pushes to main

## Part 6: VPS Deployment

### 6.1 Set Up VPS

On Ubuntu VPS:
```bash
curl -fsSL https://raw.githubusercontent.com/jurgencalleja/TLC/main/scripts/vps-setup.sh | bash
```

Follow prompts for:
- Domain name
- Admin email
- Slack webhook (optional)

### 6.2 Configure Webhook

In GitHub repo Settings > Webhooks:
- URL: `https://dashboard.project.com/api/webhook`
- Secret: (from VPS setup output)
- Events: Push

### 6.3 Branch Previews

Now when anyone pushes:
- `main` deploys to `main.project.com`
- `feature/x` deploys to `feature-x.project.com`

QA (Eve) can test any branch without local setup!

## Part 7: Release

### 7.1 Complete Milestone

When all phases done:
```
/tlc:complete
```

TLC:
1. Runs full test suite
2. Generates changelog
3. Tags release
4. Archives milestone

### 7.2 Start Next Milestone

```
/tlc:new-milestone
```

Creates fresh roadmap for v2.0.

## Coordination Rules

### Daily Standup (Optional)

```
/tlc:who
```

Shows who's blocked, what's available.

### Before Starting Work

```bash
git pull
/tlc:claim <task>
git push
```

### Before Ending Day

```bash
git add .
git commit -m "WIP: task description"
git push
```

### If Blocked

```
/tlc:release <task>
```

Release task for someone else.

### If Bug Found

Use dashboard or:
```
/tlc:bug
```

## Common Issues

### Merge Conflicts in PLAN.md

```bash
git pull --rebase
# Resolve conflicts - keep both claims
git add .planning/phases/2-PLAN.md
git rebase --continue
git push
```

### Two People Claimed Same Task

```
/tlc:who
```

Coordinate via Slack. One person releases:
```
/tlc:release 3
```

### Tests Failing on CI but Pass Locally

1. Check Node version matches
2. Check for timezone issues
3. Check for race conditions in async tests

## Summary

| Role | Daily Actions |
|------|---------------|
| **Engineer** | Pull → Claim → Build → Push |
| **QA** | Dashboard → Test → Report bugs |
| **PO** | Dashboard → Track → Verify |
| **Lead** | Review PRs → Unblock → Plan next |

TLC keeps everyone synchronized through:
- Git-based task claiming
- Automatic PR reviews
- Real-time dashboard
- Branch preview deployments

No meetings needed to know project status. Just run `/tlc:who` or check the dashboard.
