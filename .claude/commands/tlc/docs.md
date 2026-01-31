# /tlc:docs - Documentation Maintenance

Automatically maintain wiki, tutorials, and screenshots.

**Runs automatically on push via GitHub Actions.** Manual use for local preview.

## Usage

```bash
/tlc:docs                    # Full docs audit and update
/tlc:docs screenshots        # Regenerate all screenshots
/tlc:docs check              # Check for issues without changing
/tlc:docs sync               # Sync wiki to GitHub wiki repo
```

## Automation

**On every push to main**, GitHub Actions automatically:
1. Updates version references in all docs
2. Checks for missing command documentation
3. Regenerates terminal screenshots
4. Syncs to GitHub Wiki
5. Commits any changes back

You don't need to manually maintain docs. Just push code.

## What This Does

### Full Audit (`/tlc:docs`)

1. **Scan for outdated docs** - Compare docs with code
2. **Check for missing features** - New commands not documented
3. **Regenerate screenshots** - Capture fresh dashboard/command screenshots
4. **Update version references** - Ensure version numbers match
5. **Validate links** - Check for broken internal links
6. **Commit changes** - Auto-commit doc updates

### Screenshots (`/tlc:docs screenshots`)

Uses Playwright to capture real screenshots:

1. Start TLC dev server if not running
2. Navigate to dashboard pages
3. Capture each view:
   - Dashboard overview
   - Task board
   - Log stream
   - Team panel
   - Settings
4. Capture command outputs in terminal
5. Save to `docs/wiki/images/`

### Wiki Update (`/tlc:docs wiki`)

1. Read all command files in `.claude/commands/tlc/`
2. Compare with `docs/wiki/command-reference.md`
3. Add missing commands
4. Update changed descriptions
5. Regenerate command tables

### Changelog (`/tlc:docs changelog`)

1. Read git commits since last release
2. Group by type (feat, fix, docs, etc.)
3. Generate CHANGELOG.md entry
4. Include breaking changes section

## Process

### Step 1: Analyze Current State

```javascript
// Scan for documentation gaps
const commands = glob('.claude/commands/tlc/*.md');
const documented = parseCommandReference('docs/wiki/command-reference.md');

const missing = commands.filter(c => !documented.includes(c.name));
const outdated = commands.filter(c => c.modifiedAt > documented[c.name]?.updatedAt);
```

### Step 2: Screenshot Capture

```javascript
const { chromium } = require('playwright');

async function captureScreenshots() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Dashboard views
  await page.goto('http://localhost:3147');
  await page.screenshot({ path: 'docs/wiki/images/dashboard-overview.png' });

  await page.click('[data-tab="tasks"]');
  await page.screenshot({ path: 'docs/wiki/images/dashboard-tasks.png' });

  await page.click('[data-tab="logs"]');
  await page.screenshot({ path: 'docs/wiki/images/dashboard-logs.png' });

  await page.click('[data-tab="team"]');
  await page.screenshot({ path: 'docs/wiki/images/dashboard-team.png' });

  await browser.close();
}
```

### Step 3: Update Wiki Pages

For each wiki page, check:
- Version numbers match `package.json`
- Command syntax matches actual commands
- Screenshots exist and are referenced
- Links are valid

### Step 4: Generate Updates

```markdown
## Documentation Update Report

### Updated Files
- docs/wiki/command-reference.md (added /tlc:next)
- docs/wiki/getting-started.md (updated version to 1.2.28)

### New Screenshots
- dashboard-overview.png (regenerated)
- tlc-next-prompt.png (new)

### Warnings
- docs/wiki/old-page.md references removed command /tlc:old
```

### Step 5: Commit

```bash
git add docs/
git commit -m "docs: update wiki and screenshots

- Add /tlc:next command documentation
- Regenerate dashboard screenshots
- Update version references to 1.2.28
"
```

## Screenshot Definitions

| Screenshot | Page/Command | Selector |
|------------|--------------|----------|
| dashboard-overview | localhost:3147 | full page |
| dashboard-tasks | localhost:3147/tasks | .task-board |
| dashboard-logs | localhost:3147/logs | .log-stream |
| dashboard-team | localhost:3147/team | .team-panel |
| tlc-next-prompt | terminal | command output |
| build-parallel | terminal | command output |

## Auto-Trigger

This command should run automatically when:

1. **After `/tlc:build` completes** - Check if new features need docs
2. **Before `/tlc:complete`** - Ensure docs are up to date
3. **On version bump** - Update version references

## Configuration

In `.tlc.json`:

```json
{
  "docs": {
    "wiki": "docs/wiki",
    "images": "docs/wiki/images",
    "autoUpdate": true,
    "screenshotDevice": "desktop",
    "checkLinks": true
  }
}
```

## Example Output

```
/tlc:docs

Scanning documentation...

Commands:
  ✓ 32 commands documented
  + 1 new command: /tlc:next (adding)
  ~ 2 commands updated: /tlc:build, /tlc:help

Screenshots:
  ✓ 8 screenshots up to date
  ↻ 4 screenshots regenerating...
    - dashboard-overview.png ✓
    - dashboard-tasks.png ✓
    - dashboard-logs.png ✓
    - dashboard-team.png ✓

Wiki Pages:
  ✓ Home.md
  ✓ getting-started.md
  ~ command-reference.md (updating)
  ✓ solo-developer.md

Links:
  ✓ 47 internal links valid
  ⚠ 1 external link returned 404: https://old-url.com

Committing changes...
  docs: update documentation for v1.2.28

Done! Documentation updated.
```
