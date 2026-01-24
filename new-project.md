# /tdd:new-project - Start a New Project

Initialize a new project with test-led development.

## What This Does

1. Discuss tech decisions with you
2. Call `/gsd:new-project` for requirements and roadmap
3. Set up test infrastructure

## Process

### Step 1: Tech Stack Discussion

Before any planning, discuss foundational decisions:

**Language/Runtime:**
```
What language/runtime for this project?

1) TypeScript/Node.js - Full-stack JS, great ecosystem
2) Python - Data/ML, fast prototyping, Django/FastAPI
3) Go - Performance, simplicity, great for APIs
4) Rust - Systems, performance-critical, safety
5) Other - specify
```

**Framework (based on language):**
```
TypeScript: Next.js | Express | Fastify | Hono
Python: FastAPI | Django | Flask
Go: Gin | Echo | Chi | stdlib
```

**Database:**
```
What database fits your needs?

1) PostgreSQL - Relational, robust, great default choice
2) SQLite - Simple, embedded, good for small apps
3) MongoDB - Document store, flexible schema
4) Redis - Key-value, caching, sessions
5) Supabase - Postgres + auth + realtime
6) None - stateless or external data source
```

**Architecture:**
```
How should this be structured?

1) Monolith - Single deployable, simple to start
2) Modular monolith - Monolith with clear module boundaries
3) Microservices - Separate services, K8s ready
4) Serverless - Functions, edge deployment
5) Hybrid - Mix based on needs
```

**Hosting/Deployment:**
```
Where will this run?

1) Docker + any host - Portable containers
2) Vercel/Netlify - JAMstack, serverless
3) AWS/GCP/Azure - Full cloud platform
4) Kubernetes - Container orchestration
5) VPS - Simple VM deployment
6) Self-hosted - On-prem
```

### Step 2: Capture Decisions in PROJECT.md

Record all tech decisions at the top of PROJECT.md:

```markdown
# Project Name

## Tech Stack

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript | Team familiarity, type safety |
| Framework | Next.js | Full-stack, good DX |
| Database | PostgreSQL | Relational data, reliability |
| Architecture | Modular monolith | Start simple, scale later |
| Hosting | Docker + Railway | Easy deployment, good free tier |

## Test Framework
- Vitest for unit/integration tests
- Playwright for E2E (if needed)
```

### Step 3: Run GSD New Project Flow

Call `/gsd:new-project` which handles:
- Deep requirements gathering
- Research phase
- Roadmap creation with phases

### Step 4: Append TDD Conventions

After PROJECT.md is created, append:

```markdown
## Development Methodology: Test-Led Development

This project uses TDD. All implementation follows Red → Green → Refactor:

1. **Red**: Write failing tests that define expected behavior
2. **Green**: Write minimum code to make tests pass
3. **Refactor**: Clean up while keeping tests green

Tests are written BEFORE implementation, not after.
```

### Step 5: Set Up Test Framework

Based on stack chosen:

| Stack | Framework | Config |
|-------|-----------|--------|
| Next.js / React | Vitest | `vitest.config.ts` |
| Node.js | Vitest | `vitest.config.ts` |
| Python | pytest | `pyproject.toml` |
| Go | go test | (built-in) |
| Rust | cargo test | (built-in) |

Create test directory and example test file.

### Step 6: Initialize Project Structure

Create the scaffolding based on decisions:

```
project/
├── src/              # or app/ for Next.js
├── tests/            # or __tests__/
├── .env.example
├── docker-compose.yml (if Docker chosen)
├── Dockerfile
├── package.json / pyproject.toml / go.mod
├── vitest.config.ts / pytest.ini
└── PROJECT.md
```

## Usage

```
/tdd:new-project
```

Interactive flow that results in a fully scaffolded project with:
- Clear tech stack documented
- Test framework configured
- Ready to start phase 1
