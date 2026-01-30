# /tlc:release - Release a Task

Release a task you claimed so others can work on it.

## Usage

```
/tlc:release [task-number]
```

## When to Use

- Blocked and can't continue
- Switching to a different task
- End of day, won't finish
- Decided task approach needs rethinking

## Process

### Step 0: Check Team Mode

```bash
teamEnabled=$(jq -r '.team.enabled // false' .tlc.json 2>/dev/null)

if [ "$teamEnabled" != "true" ]; then
  echo "Team coordination not enabled."
  echo "Enable it with: /tlc:deploy setup"
  exit 1
fi
```

### Step 1: Identify User

Get current user identity (same as `/tlc:claim`):

```bash
if [ -n "$TLC_USER" ]; then
  user=$TLC_USER
else
  user=$(git config user.name | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
fi
```

### Step 2: Find Your Claims

Parse current phase PLAN.md for tasks claimed by you:

```
Looking for tasks claimed by @alice...

Your claimed tasks:
  2. Add validation [>@alice]
  5. Error handling [>@alice]
```

### Step 3: Select Task to Release

If task-number provided:
- Verify you own that task
- If not yours, show error

If not provided:
- Show your claimed tasks
- Prompt to select one

### Step 4: Update Task Marker

Change from claimed to available:

```markdown
### Task 2: Add validation [>@alice]
```

becomes:

```markdown
### Task 2: Add validation [ ]
```

### Step 5: Commit and Push

```bash
git add .planning/phases/{N}-PLAN.md
git commit -m "release: task {N} - {title} (@{user})"
git push
```

## Example Session

```
> /tlc:release

Your claimed tasks in Phase 1:
  2. Add validation [>@alice]
  5. Error handling [>@alice]

Release which task? [2/5]: 2

Task 2: Add validation [>@alice] → [ ]

✓ Committed: release: task 2 - Add validation (@alice)
✓ Pushed

Task 2 is now available for others.
```

## With Task Number

```
> /tlc:release 2

Task 2: Add validation [>@alice] → [ ]

✓ Committed: release: task 2 - Add validation (@alice)
✓ Pushed

Task 2 is now available for others.
```

## Error Handling

**Not your task:**
```
Task 2 is claimed by @bob, not you.
You can only release your own tasks.

Your tasks: 5
```

**Task not claimed:**
```
Task 2 is not claimed (already available).
Nothing to release.
```

**No tasks claimed:**
```
You have no claimed tasks in Phase 1.
Use /tlc:claim to claim a task.
```

## Notes

- Releasing doesn't undo any work you've done
- Your commits remain in history
- Another teammate can claim and continue where you left off
- Consider adding a note to the task if you made partial progress
