# /tlc:new-project - Start a New Project

Initialize a new project with test-led development.

## What This Does

1. Gather requirements and context
2. Suggest tech stack based on your needs
3. Create roadmap
4. Set up test infrastructure

## Process

### Step 1: Understand What You're Building

Start by understanding the project:

**Core purpose:**
```
What are you building? (1-2 sentences)
```

**Target users:**
```
Who uses this?

1) Just me / internal tool
2) Small team (<10 users)
3) Startup scale (100-10K users)
4) Growth stage (10K-100K users)
5) Enterprise / high scale (100K+ users)
```

**Data characteristics:**
```
What kind of data?

1) Simple CRUD - users, posts, etc.
2) Relational - complex relationships, joins
3) Document-oriented - flexible schemas
4) Time-series - logs, metrics, events
5) Graph - relationships are the data
6) Minimal / stateless
```

**Real-time requirements:**
```
Do you need real-time features?

1) No - standard request/response
2) Some - notifications, live updates
3) Heavy - chat, collaboration, streaming
```

**Existing constraints:**
```
Any constraints I should know?

- Team experience (what languages/tools do you know?)
- Existing infrastructure (AWS, GCP, on-prem?)
- Budget considerations
- Compliance requirements (HIPAA, SOC2, etc.)
- Timeline pressure
```

### Step 2: Suggest Tech Stack

Based on answers, suggest appropriate stack:

**Example: Internal tool, small team, simple CRUD**
```
Suggested Stack:

| Component | Recommendation | Why |
|-----------|----------------|-----|
| Language | TypeScript | Type safety, good tooling |
| Framework | Next.js | Full-stack, fast to build |
| Database | SQLite or Postgres | Simple, reliable |
| Architecture | Monolith | No need for complexity |
| Hosting | Vercel or Railway | Easy deploy, free tier |

Alternatives to consider:
- Python + FastAPI if more comfortable with Python
- Supabase if you want auth + DB bundled
```

**Example: Growth stage SaaS, real-time, complex data**
```
Suggested Stack:

| Component | Recommendation | Why |
|-----------|----------------|-----|
| Language | TypeScript | Type safety at scale |
| Framework | Next.js + tRPC | Type-safe API layer |
| Database | PostgreSQL | Reliable, scalable |
| Cache | Redis | Sessions, real-time |
| Architecture | Modular monolith | Scale when needed |
| Hosting | Docker + K8s ready | Portable, scalable |

Alternatives to consider:
- Go if performance is critical
- Microservices if team is large enough
```

**Example: High-performance API, minimal latency**
```
Suggested Stack:

| Component | Recommendation | Why |
|-----------|----------------|-----|
| Language | Go or Rust | Performance, efficiency |
| Framework | stdlib or Axum | Minimal overhead |
| Database | PostgreSQL + Redis | Speed + reliability |
| Architecture | Microservices | Scale independently |
| Hosting | Kubernetes | Production-grade |
```

### Step 3: Confirm or Adjust

```
Does this stack work for you?

1) Yes, proceed with this
2) I'd prefer [language] instead
3) Let's discuss alternatives
```

Allow user to override any decision with rationale captured.

### Step 4: Record Decisions

Create PROJECT.md with tech decisions:

```markdown
# Project Name

## Overview
[From step 1 discussion]

## Tech Stack

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript | Team familiarity |
| Framework | Next.js | Full-stack, good DX |
| Database | PostgreSQL | Relational data needs |
| Architecture | Modular monolith | Start simple |
| Hosting | Docker + Railway | Easy CI/CD |

## Constraints
- Timeline: MVP in 4 weeks
- Team: Solo developer
- Budget: Minimal hosting costs
```

### Step 5: Create Roadmap

Based on the project scope, break into phases:

**Phase breakdown approach:**
- Each phase = one coherent feature or component
- Phase should be completable in focused work
- Phase has clear "done" criteria

**Example phases for a SaaS app:**
```
Phase 1: Project Setup
  - Initialize repo, dependencies
  - Set up test framework
  - Create base configuration

Phase 2: Authentication
  - User registration
  - Login/logout
  - Session management

Phase 3: Core Feature
  - Main functionality
  - Data models
  - API endpoints

Phase 4: User Dashboard
  - UI components
  - Data display
  - User settings
```

Create `.planning/ROADMAP.md`:

```markdown
# Roadmap - v1.0

## Overview
{From project discussion}

## Phases

### Phase 1: Project Setup
Initialize project with chosen stack and test infrastructure.

### Phase 2: Authentication
User registration, login, and session management.

### Phase 3: {Core Feature}
{Description based on project goals}

### Phase 4: {Next Feature}
{Description}

## Milestone
Target: v1.0 MVP
```

### Step 6: Append TLC Conventions

```markdown
## Development Methodology: Test-Led Development

This project uses TLC. All implementation follows Red → Green → Refactor:

1. **Red**: Write failing tests that define expected behavior
2. **Green**: Write minimum code to make tests pass
3. **Refactor**: Clean up while keeping tests green

Tests are written BEFORE implementation, not after.

## Test Framework

TLC defaults to the mocha ecosystem:

| Library | Purpose |
|---------|---------|
| mocha | Test runner |
| chai | Assertions |
| sinon | Mocks/stubs/spies |
| proxyquire | Module mocking |

Run: `npm test`

To use a different framework, run `/tlc:config`.
```

### Step 6b: Create TLC Config

Create `.tlc.json` with default test settings:

```json
{
  "testFrameworks": {
    "primary": "mocha",
    "installed": ["mocha", "chai", "sinon", "proxyquire"],
    "run": ["mocha"]
  },
  "testCommand": "npm test",
  "testDirectory": "test",
  "e2e": {
    "framework": "playwright",
    "directory": "tests/e2e",
    "command": "npx playwright test"
  }
}
```

For non-JavaScript stacks:

| Stack | Primary | Installed |
|-------|---------|-----------|
| Python | pytest | pytest |
| Go | go test | (built-in) |
| Ruby | rspec | rspec |

### Step 7: Set Up Project Structure

Scaffold based on chosen stack:

```
project/
├── src/
├── test/                    # Unit tests
├── tests/
│   └── e2e/                 # E2E tests (Playwright)
├── .env.example
├── .tlc.json
├── .mocharc.json
├── playwright.config.ts     # E2E config
├── docker-compose.yml
├── Dockerfile
├── [package.json | pyproject.toml | go.mod]
└── PROJECT.md
```

### Step 8: Install Test Dependencies

For JavaScript/TypeScript projects, install the mocha stack:

```bash
npm install -D mocha chai sinon proxyquire @types/mocha @types/chai @types/sinon
```

Create `.mocharc.json`:
```json
{
  "extension": ["js", "ts"],
  "spec": "test/**/*.test.{js,ts}",
  "require": ["ts-node/register"],
  "timeout": 5000
}
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "mocha",
    "test:watch": "mocha --watch"
  }
}
```

### Step 9: Set Up E2E Testing

E2E tests verify full user flows in the browser.

```
Set up E2E testing?
  [1] Playwright (recommended)
  [2] Cypress
  [3] Skip for now

Choice [1/2/3]: _
```

**If Playwright (default):**

```bash
npm init playwright@latest
```

Create `playwright.config.ts`:
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  baseURL: process.env.BASE_URL || 'http://localhost:5001',
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
```

Create `tests/e2e/.gitkeep` to establish the directory.

Add to `package.json`:
```json
{
  "scripts": {
    "test": "mocha",
    "test:watch": "mocha --watch",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

**If Cypress:**

```bash
npm install -D cypress
npx cypress open
```

**Summary output:**
```
✓ Unit tests: mocha + chai + sinon
✓ E2E tests: playwright
✓ Test directories: test/ (unit), tests/e2e/ (E2E)

Ready to build. Run /tlc:plan to create your first phase.
```

## Usage

```
/tlc:new-project
```

Interactive flow that:
1. Understands what you're building
2. Suggests appropriate tech
3. Lets you adjust
4. Creates roadmap
5. Sets up tests
