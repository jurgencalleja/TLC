# /tlc:who - Team Status

See who's working on what in the current phase.

## Usage

```
/tlc:who
```

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

### Step 1: Find Current Phase

1. Read `.planning/ROADMAP.md`
2. Find phase marked `[>]` or `[current]`
3. Load `.planning/phases/{N}-*-PLAN.md`

### Step 2: Parse Task Markers

Extract status from task headings:

| Marker | Status | Owner |
|--------|--------|-------|
| `[ ]` | available | - |
| `[>@user]` | working | @user |
| `[x@user]` | done | @user |

### Step 3: Identify Current User

```bash
if [ -n "$TLC_USER" ]; then
  user=$TLC_USER
else
  user=$(git config user.name | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
fi
```

### Step 4: Display Team Status

```
Phase 2: User Dashboard

| Task | Description | Status | Owner |
|------|-------------|--------|-------|
| 1 | Create layout | done | @alice |
| 2 | Fetch data hook | available | - |
| 3 | Add charts | working | @bob |
| 4 | Loading states | available | - |

Team Activity:
  @alice: 1 done
  @bob: 1 working

You (@alice): No active tasks
Available: 2, 4
```

## Output Format

### Table View

Shows all tasks with status:

```
Phase 1: Authentication

| # | Task | Status | Owner |
|---|------|--------|-------|
| 1 | Create user schema | done | @alice |
| 2 | Add validation | working | @bob |
| 3 | Write migrations | done | @alice |
| 4 | Integration tests | available | - |
```

### Summary

After the table:

```
Summary:
  Done: 2 tasks (@alice: 2)
  Working: 1 task (@bob: 1)
  Available: 1 task

You (@charlie):
  No tasks claimed
  Available to claim: 4
```

### Your Status

Highlights what you're working on:

```
You (@bob):
  Working on: Task 2 - Add validation

Next: Continue with /tlc:build or /tlc:release if blocked
```

## Example Output

```
> /tlc:who

Phase 2: User Dashboard

Tasks:
  1. Create layout       [x@alice]  done
  2. Fetch data hook     [ ]        available
  3. Add charts          [>@bob]    working
  4. Loading states      [ ]        available
  5. Error boundaries    [x@alice]  done

Team:
  @alice  2 done
  @bob    1 working

You (@bob):
  → Task 3: Add charts (in progress)

Available tasks: 2, 4
```

## No Activity

If no one has claimed anything:

```
> /tlc:who

Phase 1: Authentication

All 4 tasks available:
  1. Create user schema [ ]
  2. Add validation [ ]
  3. Write migrations [ ]
  4. Integration tests [ ]

No team activity yet.
Run /tlc:claim to get started.
```

## Notes

- Shows current phase only
- Pull latest first for accurate status: `git pull`
- Task numbers match PLAN.md task numbers
- Use `/tlc:claim N` to claim an available task
- Use `/tlc:release N` to release your task
