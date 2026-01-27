# /tlc:issues - Issue Tracker Integration

Sync TLC tasks and bugs with external issue trackers.

## Usage

```
/tlc:issues [command]
```

Commands:
- `setup` - Configure issue tracker
- `sync` - Sync tasks/bugs with tracker
- `import` - Import issues as tasks
- `export` - Export tasks as issues
- `link` - Link task to existing issue

## Supported Trackers

| Tracker | Tasks | Bugs | Two-Way Sync |
|---------|-------|------|--------------|
| GitHub Issues | ✓ | ✓ | ✓ |
| GitLab Issues | ✓ | ✓ | ✓ |
| Jira | ✓ | ✓ | ✓ |
| Linear | ✓ | ✓ | ✓ |
| Trello | ✓ | ✓ | One-way |
| Asana | ✓ | ✓ | One-way |

## Setup

### GitHub Issues

```
> /tlc:issues setup

Detected: GitHub (github.com/acme/myproject)

GitHub Issues requires a Personal Access Token.
Create one at: https://github.com/settings/tokens

Token needs: repo scope

Enter token (or press Enter to skip): ghp_xxxx

Testing connection...
  ✓ Connected to acme/myproject
  ✓ Found 12 open issues

Configuration saved to .tlc.json

Labels to create for TLC:
  - tlc:task (blue)
  - tlc:bug (red)
  - tlc:phase-N (gray)

Create labels? (Y/n)
```

### Jira

```
> /tlc:issues setup --jira

Jira Configuration:

  Instance URL: https://acme.atlassian.net
  Project Key: PROJ
  Email: alice@acme.com
  API Token: (from https://id.atlassian.com/manage/api-tokens)

Testing connection...
  ✓ Connected to PROJ
  ✓ Found 45 issues

Issue type mapping:
  TLC Task → Jira Task
  TLC Bug → Jira Bug

Create TLC label in Jira? (Y/n)
```

### Linear

```
> /tlc:issues setup --linear

Linear Configuration:

  API Key: (from Settings > API)
  Team: Engineering

Testing connection...
  ✓ Connected to Engineering team
  ✓ Found 23 issues

Label mapping:
  TLC Task → Linear Issue
  TLC Bug → Linear Bug (type)

Sync project labels? (Y/n)
```

## Configuration

In `.tlc.json`:

```json
{
  "issues": {
    "provider": "github",
    "autoSync": true,
    "syncOnCommit": true,
    "labelPrefix": "tlc:",
    "mapping": {
      "task": "Task",
      "bug": "Bug"
    },
    "github": {
      "owner": "acme",
      "repo": "myproject",
      "labels": {
        "task": "tlc:task",
        "bug": "tlc:bug"
      }
    }
  }
}
```

## Sync Tasks

### Export to Issue Tracker

```
> /tlc:issues sync

Phase 2: User Authentication

Tasks:
  1. Create login form [ ] → Create issue? (Y/n)
  2. Add validation [>@alice] → Already linked: #45
  3. Password reset [ ] → Create issue? (Y/n)

Creating issues...
  ✓ Task 1 → #78: Create login form
  ✓ Task 3 → #79: Password reset

Updated PLAN.md with issue links.
```

### Import from Issue Tracker

```
> /tlc:issues import

Fetching issues with label 'tlc:task'...

Found 5 unlinked issues:
  #80: Add email validation
  #81: Rate limiting
  #82: Session management
  #83: OAuth integration
  #84: 2FA support

Import as tasks in current phase? (Y/n) y

Added to Phase 2:
  Task 5: Add email validation [#80]
  Task 6: Rate limiting [#81]
  Task 7: Session management [#82]
  Task 8: OAuth integration [#83]
  Task 9: 2FA support [#84]
```

## Link Task to Issue

```
> /tlc:issues link 3 #45

Linked Task 3 to GitHub Issue #45

PLAN.md updated:
  ### Task 3: Password reset [ ] <!-- #45 -->
```

## Bug Sync

Bugs from `/tlc:bug` can auto-create issues:

```
> /tlc:bug "Login button doesn't work on mobile"

Bug BUG-012 created.

Create GitHub issue? (Y/n) y

Created: #85 - [BUG] Login button doesn't work on mobile
  Labels: tlc:bug, bug
  Linked in BUGS.md
```

## Two-Way Sync

When enabled, changes sync both ways:

### Issue → TLC

- Issue closed → Task marked complete
- Issue assigned → Task claimed
- Issue labeled → Status updated

### TLC → Issue

- Task completed → Issue closed
- Task claimed → Issue assigned
- Bug created → Issue created

## Sync on Commit

With `syncOnCommit: true`, issue references in commits update status:

```bash
git commit -m "Add login form validation

Fixes #45
Closes #78"
```

TLC automatically:
- Marks linked tasks as complete
- Updates PLAN.md status markers
- Syncs with issue tracker

## Jira-Specific Features

### Sprint Integration

```
> /tlc:issues sync --sprint

Current Sprint: Sprint 23

Tasks not in sprint:
  Task 1: Create login form
  Task 3: Password reset

Add to sprint? (Y/n)
```

### Story Points

```json
{
  "issues": {
    "jira": {
      "storyPointsField": "customfield_10016",
      "defaultPoints": 3
    }
  }
}
```

### Epic Linking

```
> /tlc:issues link-epic PROJ-100

Linked Phase 2 to Epic PROJ-100

All Phase 2 tasks now belong to this epic.
```

## Linear-Specific Features

### Cycle Integration

```
> /tlc:issues sync --cycle

Current Cycle: Week 45

Unassigned tasks:
  Task 1: Create login form

Add to cycle? (Y/n)
```

### Project Linking

```
> /tlc:issues link-project "Authentication Overhaul"

Linked Phase 2 to Linear Project.
```

## Webhooks (Advanced)

For real-time sync, configure webhooks:

### GitHub

```
Webhook URL: https://your-server.com/tlc/webhook/github
Events: Issues, Issue comments
```

### Jira

```
Webhook URL: https://your-server.com/tlc/webhook/jira
Events: Issue created, updated, deleted
```

## Example Workflow

```
# 1. Setup integration
> /tlc:issues setup

# 2. Plan phase - creates issues
> /tlc:plan
  Creating tasks...
  Syncing to GitHub Issues...
    ✓ Task 1 → #90
    ✓ Task 2 → #91
    ✓ Task 3 → #92

# 3. Work on task - claim syncs
> /tlc:claim 1
  Claimed Task 1
  GitHub #90 assigned to @alice

# 4. Complete task - closes issue
> /tlc:build
  Task 1 complete
  Closing GitHub #90...

# 5. Import new issues from tracker
> /tlc:issues import
  Found 2 new issues
  Added as Task 4, Task 5
```

## Troubleshooting

### Token Issues

```
Error: 401 Unauthorized

Check:
  - Token has correct scopes (repo for GitHub)
  - Token not expired
  - URL correct for Jira/Linear
```

### Sync Conflicts

```
Conflict: Task 3 modified in both TLC and GitHub

  TLC: Task 3: Add validation [x@alice]
  GitHub: #45: Add validation (Open, @bob)

Resolve:
  1) Keep TLC version (mark task complete)
  2) Keep GitHub version (reopen task)
  3) Manual merge
```

## Notes

- Tokens stored in `.tlc.json` (add to .gitignore if needed)
- Use environment variables for CI: `TLC_GITHUB_TOKEN`
- Sync is incremental (only changed items)
- Offline changes queue and sync when connected
