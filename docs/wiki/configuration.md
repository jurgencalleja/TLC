# TLC Configuration Guide

TLC is configured via `.tlc.json` in your project root.

## Default Configuration

```json
{
  "version": "1.0",
  "testFrameworks": {
    "primary": "mocha",
    "installed": ["mocha", "chai", "sinon", "proxyquire"],
    "run": ["mocha"]
  },
  "commands": {
    "test": "npm test",
    "coverage": "npm run coverage"
  }
}
```

## Configuration Options

### Test Frameworks

```json
{
  "testFrameworks": {
    "primary": "mocha",
    "installed": ["mocha", "chai", "sinon", "proxyquire"],
    "run": ["mocha"]
  }
}
```

| Field | Description |
|-------|-------------|
| `primary` | Main test framework (mocha, vitest, jest, pytest) |
| `installed` | All testing libraries installed |
| `run` | Frameworks to run (for multi-framework projects) |

#### Supported Frameworks

| Framework | Language | Default Libraries |
|-----------|----------|-------------------|
| `mocha` | JavaScript/TypeScript | chai, sinon, proxyquire |
| `vitest` | JavaScript/TypeScript | Built-in assertions |
| `jest` | JavaScript/TypeScript | Built-in assertions |
| `pytest` | Python | pytest-cov, pytest-mock |
| `go` | Go | Built-in testing |
| `rspec` | Ruby | rspec-mocks |

### Commands

```json
{
  "commands": {
    "test": "npm test",
    "coverage": "npm run coverage",
    "lint": "npm run lint",
    "build": "npm run build"
  }
}
```

Custom commands TLC will use for various operations.

### Quality Settings

```json
{
  "quality": {
    "coverageThreshold": 80,
    "mutationThreshold": 60,
    "edgeCaseMinimum": 5
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `coverageThreshold` | 80 | Minimum coverage percentage |
| `mutationThreshold` | 60 | Minimum mutation testing score |
| `edgeCaseMinimum` | 5 | Minimum edge cases per function |

### Autofix Settings

```json
{
  "autofix": {
    "maxAttempts": 3,
    "backoffMs": 1000,
    "patterns": ["import", "type", "null"]
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `maxAttempts` | 3 | Max retry attempts |
| `backoffMs` | 1000 | Delay between attempts |
| `patterns` | [...] | Error patterns to match |

### Git Settings

```json
{
  "git": {
    "mainBranch": "main"
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `mainBranch` | "main" | Trunk branch for rebasing and merges |

The `mainBranch` is used by:
- `/tlc:claim` - rebases from this branch before claiming a task
- `/tlc:build` - suggests merging back to this branch after completion
- PR reviews - compares changes against this branch

Set during `/tlc:init` based on your repository's default branch.

### Team Settings

```json
{
  "team": {
    "requireClaim": true,
    "autoAssign": false,
    "slackWebhook": "https://hooks.slack.com/..."
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `requireClaim` | true | Must claim task before working |
| `autoAssign` | false | Auto-assign based on expertise |
| `slackWebhook` | null | Slack notifications URL |

### CI/CD Settings

```json
{
  "ci": {
    "provider": "github",
    "coverageThreshold": 80,
    "blockOnFailure": true,
    "parallelJobs": 4
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `provider` | "github" | CI provider (github, gitlab, azure) |
| `coverageThreshold` | 80 | Coverage required to pass |
| `blockOnFailure` | true | Block merge on test failure |
| `parallelJobs` | 4 | Parallel test jobs |

### Issue Tracker Settings

```json
{
  "issues": {
    "provider": "github",
    "project": "owner/repo",
    "labels": {
      "bug": "bug",
      "feature": "enhancement"
    }
  }
}
```

| Field | Description |
|-------|-------------|
| `provider` | Issue tracker (github, jira, linear, gitlab) |
| `project` | Project identifier |
| `labels` | Label mappings |

### Dev Server Settings

```json
{
  "devServer": {
    "port": 3147,
    "appPort": 5001,
    "dbPort": 5433,
    "hotReload": true
  }
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `port` | 3147 | Dashboard port |
| `appPort` | 5001 | Application port |
| `dbPort` | 5433 | Database port |
| `hotReload` | true | Enable hot reload |

## Environment Variables

TLC respects these environment variables:

| Variable | Description |
|----------|-------------|
| `TLC_USER` | Override git username for task claiming |
| `TLC_ENV` | Environment (development, production) |
| `TLC_DEBUG` | Enable debug logging |
| `GITHUB_TOKEN` | GitHub API token for PR reviews |
| `SLACK_WEBHOOK_URL` | Slack notifications |

## Framework-Specific Configuration

### Mocha (.mocharc.json)

```json
{
  "extension": ["js", "ts"],
  "spec": "test/**/*.test.{js,ts}",
  "require": ["ts-node/register"],
  "timeout": 5000
}
```

### Vitest (vitest.config.js)

```javascript
export default {
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
}
```

### Jest (jest.config.js)

```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  collectCoverage: true,
  coverageThreshold: {
    global: { lines: 80 }
  }
}
```

### pytest (pytest.ini)

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*
addopts = --cov=src --cov-report=term
```

## Project Files

### PROJECT.md

Project overview document. Contains:
- Project name and description
- Tech stack
- Team members
- Key decisions

### .planning/ROADMAP.md

Phase breakdown. Contains:
- Milestone goals
- Phase definitions
- Progress tracking

### .planning/BUGS.md

Bug tracker. Format:
```markdown
### BUG-001: Login fails on Safari [open]

**Severity:** high
**Reported:** 2024-01-15
**Reporter:** @alice

Steps to reproduce...
```

### .planning/phases/{N}-PLAN.md

Phase plan. Contains:
- Task breakdown
- Acceptance criteria
- Test cases
- Dependencies

## Multiple Configurations

For monorepos, TLC looks for `.tlc.json` in:
1. Current directory
2. Git root
3. Package directory (for workspaces)

Override with `TLC_CONFIG` environment variable:
```bash
TLC_CONFIG=/path/to/.tlc.json /tlc:build
```
