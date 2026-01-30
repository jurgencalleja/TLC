# /tlc:config - Setup Wizard

Interactive setup for TLC. No JSON editing required.

## Usage

```
/tlc:config
```

## Process

### Step 1: Welcome & Auto-Detect

First, scan the project and greet the user:

```
═══════════════════════════════════════════════════════════════
TLC Setup Wizard
═══════════════════════════════════════════════════════════════

Scanning your project...

✓ Found: package.json (Node.js project)
✓ Found: 12 existing test files
✓ Detected: Jest is installed

Let's configure TLC for your project!
```

### Step 2: Test Framework

Ask in plain language:

```
───────────────────────────────────────────────────────────────
Question 1 of 4: Test Framework
───────────────────────────────────────────────────────────────

Which test framework do you want to use?

  [1] Keep Jest (already installed) ← Recommended
  [2] Switch to Mocha (TLC default)
  [3] Use Vitest (fast, modern)
  [4] I'm not sure - choose for me

Choice [1/2/3/4]: _
```

**If user chooses 4 ("not sure"):**
- Node.js project → Mocha
- Vite project → Vitest
- React/Next.js → Jest
- Python → pytest
- Go → go test

**After selection, handle installation silently:**
```
Setting up Mocha...
✓ Installed mocha, chai, sinon
✓ Created test/ folder
✓ Added test script to package.json

Done!
```

### Step 3: Coverage Target

```
───────────────────────────────────────────────────────────────
Question 2 of 4: Code Coverage
───────────────────────────────────────────────────────────────

How thorough should testing be?

  [1] Relaxed (60%) - Good for prototypes
  [2] Standard (80%) - Recommended for most projects
  [3] Strict (95%) - For critical systems
  [4] Skip coverage checks

Choice [1/2/3/4]: _
```

### Step 4: Team or Solo

```
───────────────────────────────────────────────────────────────
Question 3 of 4: Working Style
───────────────────────────────────────────────────────────────

Are you working alone or with a team?

  [1] Solo - Just me
  [2] Team - Multiple people on this project

Choice [1/2]: _
```

**If Team selected:**
```
Great! Team mode enables:
  • Task claiming (prevent duplicate work)
  • @mentions in plans
  • Team status dashboard

Your team name (from git): alice

Is this correct? [Y/n]: _
```

### Step 5: Summary & Confirm

```
───────────────────────────────────────────────────────────────
Setup Summary
───────────────────────────────────────────────────────────────

  Test Framework:  Mocha + Chai + Sinon
  Coverage Target: 80%
  Team Mode:       Enabled (you: @alice)
  Test Folder:     test/

Apply these settings? [Y/n]: _
```

**On confirm:**
```
═══════════════════════════════════════════════════════════════
✓ TLC Configured!
═══════════════════════════════════════════════════════════════

You're all set. Here's what to do next:

  /tlc              See project status
  /tlc:build        Build current phase (writes tests first)
  /tlc:status       Check if tests are passing

Happy coding!
```

## Reconfigure

If `.tlc.json` already exists, show current settings first:

```
═══════════════════════════════════════════════════════════════
Current TLC Settings
═══════════════════════════════════════════════════════════════

  Test Framework:  Mocha
  Coverage Target: 80%
  Team Mode:       Off

What would you like to change?

  [1] Test framework
  [2] Coverage target
  [3] Enable/disable team mode
  [4] Reset everything
  [5] Exit (keep current settings)

Choice [1/2/3/4/5]: _
```

## Advanced Mode

For power users who want to edit JSON directly:

```
/tlc:config --advanced
```

Shows the raw `.tlc.json` and allows direct editing. But this is hidden from the main flow.

## Auto-Detection Rules

| What We Find | What We Set Up |
|--------------|----------------|
| `jest` in package.json | Jest as primary |
| `vitest` in package.json | Vitest as primary |
| `mocha` in package.json | Mocha as primary |
| `pytest` in requirements.txt | pytest as primary |
| Vite project (vite.config) | Suggest Vitest |
| React/Next.js project | Suggest Jest |
| Nothing detected | Default to Mocha |

## Silent Installation

When setting up a framework, install everything needed without asking:

**Mocha:**
```bash
npm install -D mocha chai sinon proxyquire
```

**Jest:**
```bash
npm install -D jest
```

**Vitest:**
```bash
npm install -D vitest
```

**pytest:**
```bash
pip install pytest pytest-cov pytest-mock
```

## Error Recovery

If something goes wrong:

```
⚠️ Couldn't install mocha automatically.

Try running this manually:
  npm install -D mocha chai sinon proxyquire

Then run /tlc:config again.
```

## Notes

- Never show JSON to beginners
- Always provide numbered choices
- Auto-detect as much as possible
- Install packages automatically
- Provide sensible defaults
- Explain what each choice means in plain English
