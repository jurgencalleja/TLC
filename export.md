# /tlc:export - Multi-Tool Support

Export TLC rules and context for other AI coding tools.

## Usage

```
/tlc:export [format]
```

Formats:
- `agents` - AGENTS.md universal format
- `cursor` - Cursor rules
- `copilot` - GitHub Copilot instructions
- `continue` - Continue.dev config
- `cody` - Sourcegraph Cody
- `aider` - Aider conventions
- `all` - All formats

## AGENTS.md Universal Format

The `AGENTS.md` file is a universal standard for AI agent instructions:

```
> /tlc:export agents

Creating AGENTS.md...

This file tells AI tools how to work with your project.

---
# AGENTS.md

## Project Overview

This is a Node.js/Express API with React frontend.
Test framework: mocha/chai/sinon

## Coding Standards

### Test-First Development

ALWAYS write tests before implementation:

1. Create test file first
2. Write failing tests
3. Implement until tests pass
4. Refactor if needed

### Test Location

Tests go next to source files:
```
src/
  auth/
    login.js
    login.test.js
```

### Test Framework

Use mocha with chai assertions:
```javascript
const { expect } = require('chai');
const sinon = require('sinon');

describe('login', () => {
  it('returns user on valid credentials', async () => {
    // Test code
  });
});
```

## Task Management

Tasks are tracked in `.planning/phases/{N}-PLAN.md`:

```markdown
### Task 1: Description [status]

status markers:
- [ ] = available
- [>@user] = claimed
- [x@user] = completed
```

Before starting work:
1. Check PLAN.md for available tasks
2. Claim task by updating marker to [>@yourname]
3. Work on the task
4. Mark complete when done [x@yourname]

## File Conventions

| Pattern | Purpose |
|---------|---------|
| `*.test.js` | Test files |
| `*.spec.js` | Alternative test files |
| `.planning/` | TLC planning files |
| `PROJECT.md` | Project overview |
| `CLAUDE.md` | Claude-specific instructions |

## Commands

When working on this project:

- Run tests: `npm test`
- Run single test: `npm test -- --grep "test name"`
- Watch mode: `npm run test:watch`

## Current State

Check `.planning/ROADMAP.md` for project status.
Check current phase PLAN.md for active tasks.
---

Created AGENTS.md in project root.
```

## Cursor Rules

```
> /tlc:export cursor

Creating .cursorrules...

---
# Cursor Rules for TLC Project

## Test-First Development

When implementing new features:
1. First, create or update test file
2. Write tests that fail
3. Then implement the code
4. Verify tests pass

## File Patterns

Tests: `{name}.test.js` next to source
Planning: `.planning/phases/{N}-PLAN.md`

## Testing

Framework: mocha + chai + sinon

Example:
```javascript
const { expect } = require('chai');
describe('feature', () => {
  it('does something', () => {
    expect(result).to.equal(expected);
  });
});
```

Run: `npm test`

## Task Workflow

Before coding:
1. Read current task from PLAN.md
2. Understand requirements
3. Write tests first
4. Then implement

## Code Style

- Use async/await over callbacks
- Prefer named exports
- Keep functions small (<30 lines)
- Document public APIs
---

Created .cursorrules
```

## GitHub Copilot

```
> /tlc:export copilot

Creating .github/copilot-instructions.md...

---
# Copilot Instructions

## Project Context

Node.js Express API with React frontend.
Testing: mocha, chai, sinon, proxyquire

## Test-First Approach

Always suggest tests before implementation.

When asked to implement a feature:
1. First suggest test cases
2. Then implement the code

## Preferred Patterns

### Tests
```javascript
const { expect } = require('chai');
const sinon = require('sinon');

describe('module', () => {
  afterEach(() => sinon.restore());

  it('should do something', async () => {
    // Arrange
    const stub = sinon.stub();

    // Act
    const result = await fn();

    // Assert
    expect(result).to.deep.equal(expected);
  });
});
```

### Async Functions
```javascript
async function getData() {
  try {
    const result = await fetch(url);
    return result.json();
  } catch (error) {
    throw new ApiError('Failed to fetch', { cause: error });
  }
}
```

## Files to Reference

- PROJECT.md - Project overview
- .planning/ROADMAP.md - Current progress
- .planning/phases/*-PLAN.md - Current tasks
---

Created .github/copilot-instructions.md
```

## Continue.dev

```
> /tlc:export continue

Creating .continue/config.json and rules...

---
{
  "models": [],
  "customCommands": [
    {
      "name": "test",
      "description": "Write tests for selected code",
      "prompt": "Write mocha/chai tests for this code. Include edge cases."
    },
    {
      "name": "tlc",
      "description": "TLC workflow guidance",
      "prompt": "Based on the TLC workflow, what should I do next? Check PLAN.md for current tasks."
    }
  ],
  "contextProviders": [
    {
      "name": "planning",
      "params": {
        "files": [
          "PROJECT.md",
          ".planning/ROADMAP.md",
          ".planning/phases/*-PLAN.md"
        ]
      }
    }
  ],
  "docs": [
    {
      "title": "TLC Workflow",
      "startUrl": "https://github.com/your/tlc-docs"
    }
  ]
}
---

Created .continue/config.json
Created .continue/rules/tlc.md
```

## Sourcegraph Cody

```
> /tlc:export cody

Creating .cody/config.json...

---
{
  "contextFilters": {
    "include": [
      "**/*.js",
      "**/*.ts",
      "**/*.test.js",
      "PROJECT.md",
      ".planning/**/*.md"
    ],
    "exclude": [
      "**/node_modules/**",
      "**/dist/**"
    ]
  },
  "codebase": {
    "testFramework": "mocha",
    "testPattern": "*.test.{js,ts}"
  }
}
---

Created .cody/config.json
Created .cody/instructions.md
```

## Aider

```
> /tlc:export aider

Creating .aider.conf.yml...

---
# Aider Configuration for TLC

# Always include these files for context
read:
  - PROJECT.md
  - .planning/ROADMAP.md

# Test-first conventions
conventions:
  - "Write tests before implementation"
  - "Tests go in {name}.test.js next to source"
  - "Use mocha/chai for testing"

# Lint/format settings
auto-lint: true
lint-cmd: npm run lint

# Test command
test-cmd: npm test
---

Created .aider.conf.yml
```

## Export All

```
> /tlc:export all

Exporting to all formats...

Created:
  ✓ AGENTS.md (universal)
  ✓ .cursorrules (Cursor)
  ✓ .github/copilot-instructions.md (Copilot)
  ✓ .continue/config.json (Continue)
  ✓ .cody/config.json (Cody)
  ✓ .aider.conf.yml (Aider)

All AI tools can now understand your TLC workflow!
```

## Keeping in Sync

When project changes, re-export:

```
> /tlc:export --update

Updating AI tool configurations...

Changes detected:
  - Test framework: jest → mocha
  - New phase added to roadmap

Updated:
  ✓ AGENTS.md
  ✓ .cursorrules
  ✓ .github/copilot-instructions.md
```

## Configuration

In `.tlc.json`:

```json
{
  "export": {
    "autoUpdate": true,
    "formats": ["agents", "cursor", "copilot"],
    "customRules": [
      "Always use TypeScript strict mode",
      "Prefer functional components in React"
    ]
  }
}
```

## IDE Integration

### VS Code

With exported files, VS Code extensions will:
- Copilot: Follow instructions in `.github/copilot-instructions.md`
- Continue: Use `.continue/config.json`
- Cody: Use `.cody/instructions.md`

### Cursor

Cursor automatically reads `.cursorrules` from project root.

### JetBrains

JetBrains IDEs with AI Assistant read `AGENTS.md`.

## MCP Integration

For tools supporting Model Context Protocol:

```json
{
  "mcp": {
    "servers": {
      "tlc": {
        "command": "tlc-mcp-server",
        "args": ["--project", "."]
      }
    }
  }
}
```

This provides:
- Task list from PLAN.md
- Bug list from BUGS.md
- Project context from PROJECT.md

## Notes

- AGENTS.md is the universal format (works with most tools)
- Tool-specific files add extra features
- Re-export after major changes
- Commit these files to share with team
