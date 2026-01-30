# Skip the Manual - Just Start

**You know how to code. You just want to use TLC. Here's the minimum.**

---

## 30-Second Setup

```bash
# Install TLC globally
npx tlc-claude-code --global

# Restart Claude Code to load commands
```

Done. Type `/tlc` to start.

---

## The Only Commands You Need

| Command | When |
|---------|------|
| `/tlc` | Always start here |
| `/tlc:build` | Build current phase |
| `/tlc:verify` | After building |

That's it. `/tlc` tells you what to do next.

---

## New Project (30 seconds)

```bash
mkdir my-project && cd my-project && git init
```

Then in Claude Code:
```
/tlc:new-project
```

Answer 3 questions. Done.

---

## Existing Project (30 seconds)

```bash
cd your-project
```

Then in Claude Code:
```
/tlc:init
```

TLC scans your code and sets up testing.

---

## The Workflow

```
/tlc              →  Shows current phase status
                     Recommends next action

/tlc:build        →  Writes tests first
                     Implements code
                     Runs tests

/tlc:verify       →  Human testing
                     Mark phase complete
```

Repeat until done.

---

## Team Mode (Optional)

Enable with:
```
/tlc:deploy setup
```

Then:
```
/tlc:claim        →  Reserve a task
/tlc:who          →  See team status
git push          →  Share your claim
```

---

## Quick Reference

### Project Files

```
.tlc.json              ← Config (auto-generated)
.planning/ROADMAP.md   ← Phases
.planning/phases/      ← Plans, tests, verification
```

### Config (`.tlc.json`)

```json
{
  "testFrameworks": { "primary": "mocha" },
  "testDirectory": "test",
  "quality": { "coverageThreshold": 80 }
}
```

### Task Markers (Team Mode)

```
[ ]        available
[>@alice]  claimed by alice
[x@bob]    completed by bob
```

---

## Need More?

| Topic | Link |
|-------|------|
| All commands | [Command Reference](command-reference) |
| Config options | [Configuration](configuration) |
| Something broken | [Troubleshooting](troubleshooting) |
| Team setup | [Team Workflow](team-workflow) |
| Dev server | [Dev Server Setup](devserver) |
| Complete beginner | [Noob Guide](noob) |

---

## TL;DR

```
npx tlc-claude-code --global    # Install
/tlc                            # Start
/tlc:build                      # Build
/tlc:verify                     # Verify
```

Tests are written automatically. Code is written automatically. You just approve.
