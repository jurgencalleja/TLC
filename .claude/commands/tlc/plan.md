# /tlc:plan - Plan a Phase

Research and create implementation plans with clear tasks.

## Architectural Standards

**Plan like a principal engineer designing for scale:**

### Structure
- **Layered architecture**: UI → Application → Domain → Infrastructure
- **Bounded contexts**: Group related functionality, minimize coupling
- **Dependency direction**: Always point inward (infrastructure depends on domain, never reverse)

### Design Decisions
- **Interface-first**: Define contracts before implementations
- **Extension points**: Where will this need to grow? Plan for it.
- **Error boundaries**: Where can failures occur? How are they handled?
- **Data flow**: How does data enter, transform, and exit the system?

### Code Quality Gates
- **File size limit**: No file should exceed 1000 lines. Plan splits for large modules.
- **Folder limit**: No folder should exceed 15 files. Plan domain subfolders.
- **Strict typing**: Plan interfaces upfront — no `any` types, explicit return types.
- **Module structure**: Group by domain entity (NestJS-style), not by file type.

### Task Breakdown
- **Vertical slices**: Each task delivers testable, visible progress
- **Risk-first**: Tackle unknowns and integrations early
- **Dependencies explicit**: Mark what blocks what

## What This Does

1. Researches how to implement the phase
2. Breaks work into discrete tasks
3. Creates PLAN.md with actionable steps
4. Prepares for test writing

## Usage

```
/tlc:plan [phase_number]
```

If no phase number, auto-detect current phase from ROADMAP.md.

## Process

### Step 1: Load Context

Read:
- `.planning/ROADMAP.md` - phase goal
- `.planning/phases/{N}-DISCUSSION.md` - implementation preferences
- `PROJECT.md` - tech stack, constraints

### Step 2: Research (if needed)

For phases requiring external knowledge:
- Look up library documentation
- Check best practices
- Identify patterns

Create `.planning/phases/{N}-RESEARCH.md` with findings.

### Step 3: Break Into Tasks

Each task should be:
- **Small** - completable in one focused session
- **Testable** - has clear pass/fail criteria
- **Independent** - minimal dependencies on other tasks
- **Standards-compliant** - won't produce files >1000 lines or folders >15 files

**Before finalizing tasks, check:**
1. Will any planned file exceed 1000 lines? → Split into sub-modules
2. Will any folder exceed 15 files? → Plan domain subfolders
3. Are all interfaces defined? → Add `interfaces/` directory per module
4. Are types explicit? → Plan typed interfaces, not `any`

#### Task Status Markers (Multi-User)

When working with teammates, tasks include status markers in headings:

| Marker | Meaning | Example |
|--------|---------|---------|
| `[ ]` | Available | `### Task 1: Create schema [ ]` |
| `[>@user]` | Claimed (in progress) | `### Task 1: Create schema [>@alice]` |
| `[x@user]` | Completed | `### Task 1: Create schema [x@alice]` |

Claim tasks before starting to avoid duplicate work.
Use `/tlc:who` to see team status.
Use `/tlc:claim` to claim a task, `/tlc:release` to release one.

```markdown
## Task 1: Create user schema [ ]

**Goal:** Define database schema for users table

**Files:**
- src/modules/user/interfaces/user.interface.ts
- src/modules/user/user.repository.ts

**Acceptance Criteria:**
- [ ] Schema has id, email, passwordHash, createdAt
- [ ] Email is unique
- [ ] Timestamps auto-populate
- [ ] All types explicit (no `any`)
- [ ] Exported functions have return types

**Test Cases:**
- Schema validates correct user data
- Schema rejects duplicate emails
- Schema rejects missing required fields
```

### Step 4: Create Plan File

Create `.planning/phases/{N}-PLAN.md`:

```markdown
# Phase {N}: {Name} - Plan

## Overview

{Brief description of what this phase delivers}

## Prerequisites

- [ ] {Any setup or prior work needed}

## Tasks

### Task 1: {Title}

**Goal:** {What this accomplishes}

**Files:**
- {files to create/modify}

**Acceptance Criteria:**
- [ ] {Testable criterion 1}
- [ ] {Testable criterion 2}

**Test Cases:**
- {Test description 1}
- {Test description 2}

---

### Task 2: {Title}

...

## Dependencies

{Task dependencies if any - e.g., Task 3 requires Task 1}

## Estimated Scope

- Tasks: {N}
- Files: {N}
- Tests: ~{N} (estimated)
```

### Step 5: Review Plan

Present plan summary:

```
Phase 2: User Dashboard - Plan

Tasks: 4
1. Create dashboard layout component
2. Implement data fetching hook
3. Build stat cards
4. Add loading/error states

Estimated tests: 12

Proceed with this plan? (Y/n)
```

Allow refinement if needed.

### Step 6: Save and Continue

```
Plan saved to .planning/phases/{N}-PLAN.md

Ready to build?
1) Yes, run /tlc:build (writes tests first)
2) No, I'll build later
```

## Task Guidelines

**Good tasks:**
```
Task: Create login API endpoint
- POST /api/auth/login
- Validates email/password
- Returns JWT token
- Handles invalid credentials
```

**Bad tasks:**
```
Task: Build auth system  <- too big
Task: Add login          <- too vague
```

## Example Output

```markdown
# Phase 1: Authentication - Plan

## Overview

User registration and login with JWT tokens.

## Tasks

### Task 1: Create user schema

**Goal:** Database schema for users

**Files:**
- src/db/schema/users.ts
- src/db/migrations/001_users.sql

**Acceptance Criteria:**
- [ ] Has id, email, passwordHash, createdAt, updatedAt
- [ ] Email unique constraint
- [ ] Password hashed with bcrypt

**Test Cases:**
- Schema accepts valid user data
- Schema rejects duplicate email
- Password is hashed, not plain text

---

### Task 2: Registration endpoint

**Goal:** POST /api/auth/register

**Files:**
- src/api/auth/register.ts
- src/lib/auth/password.ts

**Acceptance Criteria:**
- [ ] Creates user with hashed password
- [ ] Returns user without password
- [ ] Rejects existing email with 409
- [ ] Validates email format

**Test Cases:**
- Register with valid data returns user
- Register with existing email returns 409
- Register with invalid email returns 400
- Password stored as hash
```
