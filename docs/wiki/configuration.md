# Configuration

TLC configures itself automatically. You rarely need to touch settings manually.

## Setup Wizard

Run the setup wizard to configure TLC:

```
/tlc:config
```

The wizard asks simple questions and sets everything up for you:

1. **Test Framework** - Which testing tool to use
2. **Coverage Target** - How thorough testing should be
3. **Team Mode** - Solo or team collaboration

That's it. No files to edit.

## What Gets Configured

| Setting | What It Means |
|---------|---------------|
| Test Framework | The tool that runs your tests (Mocha, Jest, etc.) |
| Coverage Target | Percentage of code that must be tested |
| Team Mode | Enable task claiming for teams |

## Changing Settings

Run the wizard again anytime:

```
/tlc:config
```

It shows your current settings and lets you change them.

## Test Frameworks

TLC supports these testing tools:

| Framework | Best For |
|-----------|----------|
| **Mocha** | Most JavaScript projects (TLC default) |
| **Jest** | React and Next.js projects |
| **Vitest** | Vite projects |
| **pytest** | Python projects |

Don't know which to pick? Choose "I'm not sure" and TLC picks for you.

## Coverage Levels

| Level | Percentage | When to Use |
|-------|------------|-------------|
| Relaxed | 60% | Quick prototypes, experiments |
| Standard | 80% | Most projects (recommended) |
| Strict | 95% | Banking, healthcare, critical systems |

## Team Mode

When enabled, team mode adds:

- **Task claiming** - Reserve tasks before working
- **@mentions** - See who's working on what
- **Status dashboard** - Team progress at a glance

Enable it in the wizard or with `/tlc:deploy setup`.

## Environment Variables

Set these in your terminal profile for convenience:

| Variable | What It Does |
|----------|--------------|
| `TLC_USER` | Your team name (defaults to git username) |

**Mac/Linux** - Add to `~/.bashrc` or `~/.zshrc`:
```bash
export TLC_USER="alice"
```

**Windows** - Run in PowerShell:
```powershell
[Environment]::SetEnvironmentVariable("TLC_USER", "alice", "User")
```

## Project Files

TLC creates these files automatically:

| File | Purpose |
|------|---------|
| `.tlc.json` | Your settings (auto-generated) |
| `PROJECT.md` | Project overview |
| `.planning/ROADMAP.md` | Your phases and progress |
| `.planning/phases/` | Plans and test status |

You don't need to edit these manually - TLC commands handle everything.

## Advanced: Manual Configuration

For power users who want direct control:

```
/tlc:config --advanced
```

Or edit `.tlc.json` directly. But this is rarely needed.

## Troubleshooting

**Tests not running?**
```
/tlc:config
```
Re-run the wizard to fix test framework setup.

**Wrong coverage target?**
```
/tlc:config
```
Choose option 2 to change coverage settings.

**Team mode not working?**
Check that `TLC_USER` is set, or run `/tlc:config` to enable team mode.
