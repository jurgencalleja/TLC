# /tlc:update - Update TLC

Update TLC to the latest version.

## Usage

```
/tlc:update
```

## Process

### Step 1: Check Current Version

```
═══════════════════════════════════════════════════════════════
TLC Update
═══════════════════════════════════════════════════════════════

Current version: v1.2.20
Checking for updates...
```

### Step 2: Check for Updates

```bash
# Get latest version from npm
latestVersion=$(npm show tlc-claude-code version)
currentVersion=$(cat ~/.claude/commands/tlc/package.json | jq -r '.version')

if [ "$latestVersion" = "$currentVersion" ]; then
  echo "✓ You're on the latest version (v$currentVersion)"
  exit 0
fi
```

### Step 3: Show What's New

```
New version available: v1.2.21

What's new:
  • Setup wizard - no more JSON editing
  • GitHub Desktop recommended for beginners
  • Fixed wiki links

Update now? [Y/n]: _
```

### Step 4: Update

```
Updating TLC...

npx tlc-claude-code@latest --global

✓ Updated to v1.2.21

Restart Claude Code to load the new commands.
```

### Step 5: Show Changes (Optional)

If user wants to see full changelog:

```
Show full changelog? [y/N]: _
```

If yes, fetch and display:
```
v1.2.21 (2024-01-30)
  • Setup wizard for configuration
  • Beginner-friendly docs

v1.2.20 (2024-01-30)
  • Fixed wiki link format

v1.2.19 (2024-01-30)
  • GitHub Desktop in noob guide
```

## Auto-Update Check

When running `/tlc`, check for updates in background:

```bash
# Silent check (don't block)
latestVersion=$(npm show tlc-claude-code version 2>/dev/null)

if [ "$latestVersion" != "$currentVersion" ]; then
  echo "💡 TLC update available: v$latestVersion (you have v$currentVersion)"
  echo "   Run /tlc:update to upgrade"
fi
```

## Force Update

Skip confirmation:

```
/tlc:update --yes
```

## Specific Version

Install a specific version:

```
/tlc:update --version 1.2.15
```

## Offline / No Update

```
═══════════════════════════════════════════════════════════════
TLC Update
═══════════════════════════════════════════════════════════════

Current version: v1.2.20

⚠️ Couldn't check for updates (offline or npm unreachable)

To update manually:
  npx tlc-claude-code@latest --global
```

## Notes

- Updates install globally via npm
- Requires restart of Claude Code to load new commands
- Check npm for latest: https://www.npmjs.com/package/tlc-claude-code
