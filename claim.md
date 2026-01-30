# /tlc:claim - Claim a Task

Reserve a task so teammates know you're working on it.

## Usage

```
/tlc:claim [task-number]
```

## Process

### Step 0: Check Team Mode

Verify team coordination is enabled:

```bash
teamEnabled=$(jq -r '.team.enabled // false' .tlc.json 2>/dev/null)

if [ "$teamEnabled" != "true" ]; then
  echo "Team coordination not enabled."
  echo ""
  echo "Enable it with: /tlc:deploy setup"
  echo "Or add to .tlc.json: { \"team\": { \"enabled\": true } }"
  exit 1
fi
```

### Step 1: Identify User

Get current user identity:

```bash
# Check TLC_USER environment variable first
if [ -n "$TLC_USER" ]; then
  user=$TLC_USER
else
  # Fall back to git username, normalized to lowercase
  user=$(git config user.name | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
fi
```

### Step 2: Sync with Main Branch

Get the configured trunk branch from `.tlc.json`:

```bash
mainBranch=$(jq -r '.git.mainBranch // "main"' .tlc.json 2>/dev/null || echo "main")
```

Rebase from trunk to minimize conflicts:

```bash
git fetch origin
git rebase origin/$mainBranch
```

Output:
```
Syncing with main...
  ↳ Rebased 2 commits from origin/main
```

If rebase fails due to conflicts:
```
⚠️ Rebase conflict detected.

Your branch has diverged from main. Resolve conflicts first:
  git rebase --continue   (after fixing conflicts)
  git rebase --abort      (to cancel)

Then run /tlc:claim again.
```

### Step 3: Find Current Phase Plan

Locate the active phase PLAN.md:

1. Read `.planning/ROADMAP.md`
2. Find phase marked `[>]` or `[current]`
3. Load `.planning/phases/{N}-*-PLAN.md`

### Step 4: Parse Task Status

Read task headings and their status markers:

| Pattern | Status | Available |
|---------|--------|-----------|
| `### Task N: Title [ ]` | Available | Yes |
| `### Task N: Title [>@user]` | Claimed | No (unless by you) |
| `### Task N: Title [x@user]` | Completed | No |

### Step 5: Show Available Tasks

Display tasks with their status:

```
Phase 2: User Dashboard

Tasks:
  1. Create layout component [x@alice] (done)
  2. Fetch data hook [ ] (available)
  3. Add charts [>@bob] (bob is working)
  4. Loading states [ ] (available)

Available: 2, 4
```

### Step 6: Claim Task

If task-number provided:
- Verify task exists and is available
- If not available, show error

If not provided:
- Prompt user to select from available tasks

Update the task heading:

```markdown
### Task 2: Fetch data hook [ ]
```

becomes:

```markdown
### Task 2: Fetch data hook [>@alice]
```

### Step 7: Commit Claim

```bash
git add .planning/phases/{N}-PLAN.md
git commit -m "claim: task {N} - {title} (@{user})"
```

### Step 8: Push

Prompt to push:

```
Committed. Push now? (Y/n)
```

If yes:
```bash
git push
```

If push fails (someone else pushed):
```
Push failed - someone else updated the plan.
Run: git pull --rebase
Then try /tlc:claim again
```

## Example Session

```
> /tlc:claim 2

Syncing latest...
✓ Up to date

Phase 1: Authentication

Tasks:
  1. Create user schema [x@bob] (done)
  2. Add validation [ ] → [>@alice]
  3. Write migrations [>@bob] (bob is working)
  4. Integration tests [ ] (available)

Claiming task 2: Add validation

✓ Committed: claim: task 2 - Add validation (@alice)

Push now? (Y/n) y
✓ Pushed

Task 2 is yours. Run /tlc:build to start.
```

## Error Handling

**Task already claimed:**
```
Task 2 is being worked on by @bob.
Available tasks: 4

Choose a different task, or ask @bob to /tlc:release 2
```

**Task already completed:**
```
Task 2 was completed by @alice.
Available tasks: 4
```

**No available tasks:**
```
All tasks in Phase 1 are claimed or completed.

  [x@alice] 1. Create schema
  [>@bob] 2. Add validation
  [x@alice] 3. Write migrations
  [>@bob] 4. Integration tests

Wait for a task to be released, or help review completed work.
```

**Merge conflict on push:**
```
Push rejected - concurrent claim detected.

Someone else claimed a task while you were claiming.
Run: git pull --rebase

If conflict on YOUR task: resolve and push
If conflict on different task: auto-resolved, just push
```

## Notes

- Claims are advisory - they don't prevent others from editing files
- Claims help coordinate, not enforce
- Use `/tlc:who` to see full team status
- Use `/tlc:release` to give up a claim
