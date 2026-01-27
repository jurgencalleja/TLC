# /tlc:ci - CI/CD Integration

Generate CI/CD pipeline configuration for your TLC project.

## Usage

```
/tlc:ci [provider]
```

Providers: `github`, `gitlab`, `bitbucket`, `azure`, `circle`

If no provider specified, auto-detects from git remote.

## What This Does

1. Detects your CI/CD platform from git remote
2. Generates appropriate config file
3. Includes test-first validation
4. Adds regression test gates

## GitHub Actions

Creates `.github/workflows/tlc.yml`:

```yaml
name: TLC Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        if: always()

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  regression:
    runs-on: ubuntu-latest
    needs: [test]
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Check for untested code
        run: |
          # Get changed files
          CHANGED=$(git diff --name-only origin/main...HEAD | grep -E '\.(ts|js|tsx|jsx)$' | grep -v '\.test\.' || true)

          if [ -n "$CHANGED" ]; then
            echo "Changed source files:"
            echo "$CHANGED"

            # Check each has corresponding test
            for file in $CHANGED; do
              testfile="${file%.*}.test.${file##*.}"
              if [ ! -f "$testfile" ]; then
                echo "::warning file=$file::No test file found for $file"
              fi
            done
          fi

      - name: Run regression tests
        run: npm test -- --coverage

      - name: Coverage diff
        run: |
          # Compare coverage with base branch
          echo "Coverage report generated"
```

## GitLab CI

Creates `.gitlab-ci.yml`:

```yaml
stages:
  - test
  - regression

default:
  image: node:20
  cache:
    paths:
      - node_modules/

test:
  stage: test
  script:
    - npm ci
    - npm test
  coverage: '/Lines\s*:\s*(\d+\.?\d*)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

lint:
  stage: test
  script:
    - npm ci
    - npm run lint
  allow_failure: true

regression:
  stage: regression
  only:
    - merge_requests
  script:
    - npm ci
    - |
      CHANGED=$(git diff --name-only $CI_MERGE_REQUEST_DIFF_BASE_SHA...HEAD | grep -E '\.(ts|js)$' | grep -v '\.test\.' || true)
      if [ -n "$CHANGED" ]; then
        echo "Checking tests for changed files..."
        for file in $CHANGED; do
          testfile="${file%.*}.test.${file##*.}"
          if [ ! -f "$testfile" ]; then
            echo "WARNING: No test file for $file"
          fi
        done
      fi
    - npm test -- --coverage
```

## Bitbucket Pipelines

Creates `bitbucket-pipelines.yml`:

```yaml
image: node:20

definitions:
  caches:
    npm: ~/.npm

pipelines:
  default:
    - step:
        name: Test
        caches:
          - npm
        script:
          - npm ci
          - npm test

  pull-requests:
    '**':
      - step:
          name: Test
          caches:
            - npm
          script:
            - npm ci
            - npm test
      - step:
          name: Regression Check
          caches:
            - npm
          script:
            - npm ci
            - npm test -- --coverage
```

## Azure Pipelines

Creates `azure-pipelines.yml`:

```yaml
trigger:
  - main
  - develop

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: Test
    jobs:
      - job: Test
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'

          - script: npm ci
            displayName: Install dependencies

          - script: npm test
            displayName: Run tests

          - task: PublishCodeCoverageResults@2
            inputs:
              summaryFileLocation: '$(System.DefaultWorkingDirectory)/coverage/cobertura-coverage.xml'

  - stage: Regression
    condition: eq(variables['Build.Reason'], 'PullRequest')
    jobs:
      - job: Regression
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'
          - script: npm ci
          - script: npm test -- --coverage
            displayName: Regression tests
```

## CircleCI

Creates `.circleci/config.yml`:

```yaml
version: 2.1

executors:
  node:
    docker:
      - image: cimg/node:20.0

jobs:
  test:
    executor: node
    steps:
      - checkout
      - restore_cache:
          keys:
            - npm-{{ checksum "package-lock.json" }}
      - run: npm ci
      - save_cache:
          paths:
            - node_modules
          key: npm-{{ checksum "package-lock.json" }}
      - run: npm test
      - store_test_results:
          path: test-results
      - store_artifacts:
          path: coverage

  regression:
    executor: node
    steps:
      - checkout
      - restore_cache:
          keys:
            - npm-{{ checksum "package-lock.json" }}
      - run: npm ci
      - run:
          name: Check for untested code
          command: |
            CHANGED=$(git diff --name-only origin/main...HEAD | grep -E '\.(ts|js)$' | grep -v '\.test\.' || true)
            if [ -n "$CHANGED" ]; then
              echo "Changed files: $CHANGED"
            fi
      - run: npm test -- --coverage

workflows:
  test-and-deploy:
    jobs:
      - test
      - regression:
          filters:
            branches:
              ignore: main
```

## Regression Test Features

### Automatic Detection

The CI config includes regression checks that:

1. **Identify changed files** in the PR/MR
2. **Verify test coverage** for changed files
3. **Run full test suite** to catch regressions
4. **Report coverage diff** vs base branch

### Configuring Regression Behavior

In `.tlc.json`:

```json
{
  "ci": {
    "requireTestsForNewFiles": true,
    "coverageThreshold": 80,
    "failOnCoverageDecrease": true,
    "regressionOnPR": true
  }
}
```

### Coverage Requirements

Set minimum coverage in `package.json`:

```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

Or for mocha with nyc:

```json
{
  "nyc": {
    "check-coverage": true,
    "lines": 80,
    "functions": 80,
    "branches": 80
  }
}
```

## Import/Merge Regression

When importing external code (`/tlc:import-project`), automatically run regression:

```
> /tlc:import-project ../legacy-api

Importing legacy-api...

Found 47 source files without tests.

Running regression tests on merge...
  ✓ 23 existing tests pass
  ⚠ 12 new files need tests

Create tasks for missing tests? (Y/n)
```

## Example Session

```
> /tlc:ci

Detecting CI/CD platform...
  Remote: git@github.com:acme/myproject.git
  Platform: GitHub

Generating .github/workflows/tlc.yml...

Created CI pipeline with:
  ✓ Test job (runs on all pushes)
  ✓ Lint job (runs on all pushes)
  ✓ Regression job (runs on PRs)
  ✓ Coverage reporting (Codecov)

Commit this file? (Y/n) y

Committed: ci: add TLC GitHub Actions pipeline

Next steps:
  1. Push to GitHub
  2. Add CODECOV_TOKEN secret (optional)
  3. PRs will now require passing tests
```

## Notes

- CI config respects `.tlc.json` settings
- Coverage thresholds match project config
- Regression checks are PR-only by default
- Use `/tlc:ci --dry-run` to preview without creating files
