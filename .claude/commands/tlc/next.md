# /tlc:next - Just Do It

One command. Analyzes state. Shows what's next. Asks once. Then executes.

## Purpose

Unlike `/tlc` which shows a dashboard and waits, `/tlc:next` is action-oriented:
1. Figures out the next logical action
2. Shows it briefly
3. Asks: "Anything else in mind, or shall I proceed?"
4. On confirmation → executes immediately

## Usage

```
/tlc:next
```

No arguments. Minimal friction.

## Process

### Step 1: Analyze Current State

Read:
- `.tlc.json` - project config
- `.planning/ROADMAP.md` - current phase
- `.planning/phases/{N}-PLAN.md` - task status

Determine:
- Current phase
- Available tasks (unclaimed, not blocked)
- Test status
- Next logical action

### Step 2: Show Brief Summary

```
Phase 3: API Endpoints
━━━━━━━━━━━━━━━━━━━━━━

Next: Build task 2 - Create user endpoint
      (3 independent tasks can run in parallel)

Anything else in mind, or shall I proceed? [Y/n]: _
```

Keep it short. One screen. No scrolling.

### Step 3: Handle Response

**Enter or Y**: Execute immediately
- Run `/tlc:build` for the current phase
- Auto-parallelize independent tasks
- No more questions

**n**: Show alternatives
```
What would you like instead?
  [1] Different task
  [2] Add context/requirements first
  [3] Show full status (/tlc)
  [4] Cancel
```

**Custom input**: Incorporate into action
- "focus on tests" → Run tests first
- "task 3" → Start with task 3
- "skip validation" → Note preference, proceed

### Step 4: Execute

Once confirmed:
- Call appropriate `/tlc:*` command
- Don't ask more questions
- Just execute

## Decision Logic

| State | Next Action |
|-------|-------------|
| No project | `/tlc:new-project` |
| No roadmap | `/tlc:plan 1` |
| Phase has plan, no tests | `/tlc:build {phase}` |
| Tests failing | `/tlc:autofix` |
| Tests passing, not verified | `/tlc:verify {phase}` |
| Phase verified | Move to next phase |
| All phases done | `/tlc:complete` |

## Key Principles

1. **One question max**: "Proceed? [Y/n]"
2. **Default is yes**: Enter = proceed
3. **Show don't ask**: Display what will happen, don't ask what to do
4. **Custom input works**: User can type anything, we adapt
5. **No dashboard**: Brief summary only

## Example Flow

```
> /tlc:next

Phase 3: API Endpoints
━━━━━━━━━━━━━━━━━━━━━━

Next: Build remaining 4 tasks (auto-parallel)
      - Task 2: Create user endpoint
      - Task 3: Add auth middleware
      - Task 4: Rate limiting
      - Task 5: Error handlers

Proceed? [Y/n]:

(user presses Enter)

Starting parallel build with 4 agents...
```

## Difference from /tlc

| /tlc | /tlc:next |
|------|-----------|
| Shows full dashboard | Shows one-line summary |
| Lists all options | Shows recommended action |
| Waits for choice | Defaults to action |
| Multiple sections | Single focus |
| Status-oriented | Action-oriented |

Use `/tlc` to see status. Use `/tlc:next` to make progress.
