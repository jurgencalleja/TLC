# /tlc:refactor - Step-by-Step Standards Refactoring

Fix coding standards violations one step at a time with previews and checkpoints.

## What This Does

Same fixes as `/tlc:cleanup` but:
- Shows preview before each change
- Waits for confirmation
- Can skip individual steps
- Can abort at any point
- Saves checkpoints for resume

## Usage

```
/tlc:refactor
```

## Process

### Step 1: Create or Resume Session

Check for existing checkpoint:

```javascript
const { loadCheckpoint, createRefactorSession } = require('./lib/standards/refactor-stepper');

let session = await loadCheckpoint(projectPath);
if (session) {
  console.log('Found checkpoint from', session.savedAt);
  console.log('Resume? [Y/n]');
  // If yes, resume; if no, start fresh
} else {
  const auditResults = await auditProject(projectPath);
  session = await createRefactorSession(projectPath, auditResults);
}
```

### Step 2: Show Session Overview

```
TLC Refactor - Step-by-Step Standards Fix
═══════════════════════════════════════════════════════════════

Session: abc123
Steps: 11 total
  - 4 config extractions
  - 3 folder migrations
  - 2 interface extractions
  - 2 constant replacements

Press Enter to start, or 'q' to quit: _
```

### Step 3: For Each Step

#### Show Preview

```
Step 1/11: Extract hardcoded URL
═══════════════════════════════════════════════════════════════

File: src/api.ts

BEFORE:
  15 │ fetch('http://localhost:3000/api/users');

AFTER:
  15 │ fetch((process.env.API_URL || 'http://localhost:3000') + '/api/users');

Environment variable: API_URL
Default value: http://localhost:3000

───────────────────────────────────────────────────────────────
[Enter] Apply  [s] Skip  [q] Quit  [?] Help: _
```

#### Handle User Input

| Key | Action |
|-----|--------|
| Enter | Apply the change |
| s | Skip this step |
| q | Quit and save checkpoint |
| ? | Show help |

#### After Apply

```
✓ Applied: Extracted API_URL

Commit this change? [Y/n]: y
✓ Committed: refactor(api): extract API_URL to environment

Continuing to step 2/11...
```

### Step 4: Handle Skip

```
Step 5/11: Migrate src/services/user.service.ts
═══════════════════════════════════════════════════════════════

Skip this step? Enter reason (optional): Not applicable - this is a shared utility

✓ Skipped: Migrate user.service.ts
  Reason: Not applicable - this is a shared utility

Continuing to step 6/11...
```

### Step 5: Handle Abort

```
Aborting session...

Progress saved to: .planning/refactor-checkpoint.json

Completed: 4/11 steps
Skipped: 1 step
Remaining: 6 steps

Resume later with: /tlc:refactor
```

### Step 6: Completion

```
TLC Refactor Complete
═══════════════════════════════════════════════════════════════

Session: abc123
Duration: 12 minutes

Results:
  ✓ Applied: 9 steps
  ○ Skipped: 2 steps

Commits created: 5
  - refactor(api): extract environment variables
  - refactor(user): migrate to entity folder
  - refactor(user): extract interfaces to types/
  - refactor(product): migrate to entity folder
  - refactor(shared): add JSDoc comments

All selected fixes applied. Run /tlc:audit to verify.
```

## Checkpoint Format

Saved to `.planning/refactor-checkpoint.json`:

```json
{
  "id": "session-abc123",
  "projectPath": "/path/to/project",
  "savedAt": "2024-01-15T10:30:00Z",
  "currentStep": 4,
  "steps": [
    { "id": "1", "type": "extract-config", "status": "completed" },
    { "id": "2", "type": "extract-config", "status": "completed" },
    { "id": "3", "type": "migrate-folder", "status": "completed" },
    { "id": "4", "type": "migrate-folder", "status": "skipped", "skipReason": "Shared utility" },
    { "id": "5", "type": "extract-interface", "status": "pending" }
  ]
}
```

## Step Priority Order

Steps are ordered for safe execution:

1. **Extract config** - Environment variables first (no structural changes)
2. **Migrate folders** - Move files to entity structure
3. **Extract interfaces** - Pull types to separate files
4. **Replace constants** - Add constants files
5. **Add JSDoc** - Documentation last (doesn't affect imports)

## When to Use

- **Learning**: Understand what each change does
- **Selective fixes**: Skip changes that don't apply
- **Large codebase**: Take breaks, resume later
- **Review**: Want to approve each change

## See Also

- `/tlc:audit` - Check without fixing
- `/tlc:cleanup` - Fix everything automatically
