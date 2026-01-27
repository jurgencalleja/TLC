# /tlc:config - Configure Test Frameworks

Manage test framework settings for your project.

## Usage

```
/tlc:config
```

## Configuration File

TLC stores test preferences in `.tlc.json` at the project root:

```json
{
  "testFrameworks": {
    "primary": "mocha",
    "installed": ["mocha", "chai", "sinon", "proxyquire"],
    "run": ["mocha"]
  },
  "testCommand": "npm test",
  "testDirectory": "test"
}
```

### Fields

| Field | Description |
|-------|-------------|
| `primary` | Main test framework for new tests |
| `installed` | All test libraries available in project |
| `run` | Which frameworks to execute (subset of installed) |
| `testCommand` | Command to run tests |
| `testDirectory` | Where test files live |

## Supported Frameworks

### Default Stack (Recommended)

TLC defaults to the mocha ecosystem for new projects:

| Library | Purpose |
|---------|---------|
| **mocha** | Test runner |
| **chai** | Assertions (expect, should, assert) |
| **sinon** | Mocks, stubs, spies |
| **proxyquire** | Module mocking/dependency injection |

```bash
npm install -D mocha chai sinon proxyquire @types/mocha @types/chai @types/sinon
```

### Alternative Frameworks

| Framework | Use Case |
|-----------|----------|
| **vitest** | Vite projects, fast, ESM-native |
| **jest** | React/Meta ecosystem, all-in-one |
| **pytest** | Python projects |
| **go test** | Go projects (built-in) |
| **rspec** | Ruby projects |

## Process

### Step 1: Check for Existing Config

Look for `.tlc.json` in project root.

If exists, display current settings:
```
Current TLC Configuration:

Test Framework: mocha
Libraries: mocha, chai, sinon, proxyquire
Run Command: npm test
Test Directory: test/

What would you like to do?
1) View/edit frameworks to run
2) Add a new framework
3) Change primary framework
4) Reset to defaults
```

### Step 2: First-Time Setup

If no config exists, check for existing tests:

1. **Detect installed frameworks** from package.json/dependencies
2. **Detect test files** patterns in use
3. **Propose configuration** based on findings

```
No TLC config found. Analyzing project...

Detected:
  - jest (installed)
  - 47 test files using Jest patterns

Options:
1) Keep Jest as primary (detected)
2) Add mocha alongside Jest
3) Switch to mocha (TLC default)
4) Custom configuration
```

### Step 3: Multi-Framework Setup

When multiple frameworks coexist:

```
Multiple test frameworks detected:
  - mocha: test/unit/*.test.js (23 files)
  - jest: __tests__/*.spec.js (15 files)

Configure which to run:
  [x] mocha - run these tests
  [x] jest - run these tests
  [ ] Run all frameworks

Test commands:
  mocha: npx mocha 'test/**/*.test.js'
  jest: npx jest
  combined: npm test (runs both)
```

### Step 4: Save Configuration

Write `.tlc.json`:

```json
{
  "testFrameworks": {
    "primary": "mocha",
    "installed": ["mocha", "chai", "sinon", "proxyquire", "jest"],
    "run": ["mocha", "jest"]
  },
  "commands": {
    "mocha": "npx mocha 'test/**/*.test.js'",
    "jest": "npx jest",
    "all": "npm test"
  },
  "testDirectory": "test",
  "patterns": {
    "mocha": "test/**/*.test.js",
    "jest": "__tests__/**/*.spec.js"
  }
}
```

### Step 5: Update package.json

Ensure test scripts are configured:

```json
{
  "scripts": {
    "test": "npm run test:mocha && npm run test:jest",
    "test:mocha": "mocha 'test/**/*.test.js'",
    "test:jest": "jest",
    "test:watch": "mocha --watch 'test/**/*.test.js'"
  }
}
```

## Example: Adding a Framework

```
> /tlc:config

Current: mocha (primary)

What would you like to do?
> 2) Add a new framework

Available frameworks to add:
1) jest - All-in-one testing (React ecosystem)
2) vitest - Fast, Vite-native
3) Other (specify)

> 1) jest

Installing jest...
npm install -D jest @types/jest

Configure jest test location:
> __tests__/

Updated .tlc.json:
  installed: mocha, chai, sinon, proxyquire, jest
  run: mocha, jest

Run which tests?
1) All frameworks (mocha + jest)
2) Only mocha
3) Only jest
4) Let me choose per-run

> 1) All frameworks

Done. Run 'npm test' to execute all test suites.
```

## Example: Project with Existing Jest

```
> /tlc:config

Detected: jest (47 test files)

Your project uses Jest. Options:

1) Keep Jest only
2) Add mocha for new tests, keep Jest for existing
3) Migrate to mocha (will need to convert tests)

> 2) Add mocha for new tests

Setting up mocha alongside Jest...

New tests will use: mocha + chai + sinon
Existing tests remain: jest

Updated scripts:
  npm test        - runs both
  npm run test:new - runs mocha only
  npm run test:legacy - runs jest only
```

## Notes

- TLC defaults to mocha for consistency across projects
- Multiple frameworks can coexist when inheriting codebases
- Use `run` array to control which frameworks execute
- The `primary` framework is used for new test generation
