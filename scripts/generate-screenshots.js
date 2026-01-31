#!/usr/bin/env node
/**
 * Generate terminal-style screenshots for documentation
 */

const { generateSync } = require('text-to-image');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../docs/wiki/images');

// Terminal styling
const options = {
  bgColor: '#1e1e1e',
  textColor: '#d4d4d4',
  fontFamily: 'Consolas, Monaco, monospace',
  fontSize: 14,
  lineHeight: 20,
  margin: 20,
  maxWidth: 700,
};

// Screenshot definitions
const screenshots = {
  'dashboard-overview': `
┌─────────────────────────────────────────────────────────────────┐
│  TLC Dashboard                                        v1.2.28   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Project: my-awesome-app                                        │
│  Phase 2: User Authentication         ████████░░ 80%           │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Tasks           │  │ Tests           │  │ Coverage        │ │
│  │ ██████████ 4/5  │  │ ✓ 47 passing    │  │ 87%             │ │
│  │                 │  │ ✗ 2 failing     │  │ ████████░░      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  Team:  @alice (Task 3)  @bob (Task 4)  @charlie (available)   │
│                                                                 │
│  [1] Tasks  [2] Logs  [3] Preview  [4] Team  [?] Help          │
└─────────────────────────────────────────────────────────────────┘
`,

  'tlc-next-prompt': `
$ /tlc:next

Phase 2: User Authentication
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next: Build remaining 3 tasks (auto-parallel)
      • Task 3: Session management
      • Task 4: Password reset
      • Task 5: OAuth integration

Proceed? [Y/n]: _
`,

  'tlc-progress': `
$ /tlc:progress

my-awesome-app - Progress
═══════════════════════════════════════════════════════════════

Milestone: v1.0
Phase 2: User Authentication  ████████░░ 80%

Tasks:
  [x] 1. Create user schema         @alice
  [x] 2. Add validation             @bob
  [>] 3. Session management         @alice (in progress)
  [ ] 4. Password reset
  [ ] 5. OAuth integration

Tests:  47 passing | 2 failing
Coverage: 87%

Next: Complete Task 3, then /tlc:build continues
`,

  'build-parallel': `
$ /tlc:build 2

Analyzing task dependencies...

Independent tasks detected: 4
Starting parallel build with 4 agents...

  Agent 1 ████████░░ Task 1: Create schema
  Agent 2 ██████░░░░ Task 2: Add validation
  Agent 3 ████░░░░░░ Task 3: Create endpoints
  Agent 4 ██░░░░░░░░ Task 4: Error handling

Tests: 12 passing | 3 failing (in progress)

Agent 1 completed: Task 1 ✓
Agent 2 completed: Task 2 ✓
`,

  'tlc-who': `
$ /tlc:who

Phase 2: User Authentication
═══════════════════════════════════════════════════════════════

Team Activity:

  @alice
    ✓ Task 1: Create user schema (completed 2h ago)
    → Task 3: Session management (working now)

  @bob
    ✓ Task 2: Add validation (completed 1h ago)
    → Task 4: Password reset (working now)

  @charlie
    No tasks claimed

Available Tasks:
  [ ] Task 5: OAuth integration

Open Bugs: 1
  BUG-012: Medium - Session expires too quickly
`,

  'dashboard-tasks': `
┌─────────────────────────────────────────────────────────────────┐
│  Task Board                                      Phase 2        │
├───────────────────┬───────────────────┬─────────────────────────┤
│  TODO             │  IN PROGRESS      │  DONE                   │
├───────────────────┼───────────────────┼─────────────────────────┤
│                   │                   │                         │
│  ┌─────────────┐  │  ┌─────────────┐  │  ┌─────────────┐       │
│  │ Task 5      │  │  │ Task 3      │  │  │ Task 1      │       │
│  │ OAuth       │  │  │ Sessions    │  │  │ Schema      │       │
│  │             │  │  │ @alice      │  │  │ @alice ✓    │       │
│  └─────────────┘  │  ├─────────────┤  │  ├─────────────┤       │
│                   │  │ Task 4      │  │  │ Task 2      │       │
│                   │  │ Password    │  │  │ Validation  │       │
│                   │  │ @bob        │  │  │ @bob ✓      │       │
│                   │  └─────────────┘  │  └─────────────┘       │
│                   │                   │                         │
├───────────────────┴───────────────────┴─────────────────────────┤
│  [h/l] Move  [j/k] Navigate  [m] Move task  [Enter] Details     │
└─────────────────────────────────────────────────────────────────┘
`,

  'dashboard-logs': `
┌─────────────────────────────────────────────────────────────────┐
│  Log Stream                                    [Auto-scroll ON] │
├─────────────────────────────────────────────────────────────────┤
│  Filter: [All] [app] [test] [git]          Search: _________   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  14:32:01 [app]  Server started on port 5001                   │
│  14:32:03 [app]  Connected to database                         │
│  14:32:15 [test] Running test suite...                         │
│  14:32:16 [test] ✓ user.create returns 201                     │
│  14:32:16 [test] ✓ user.create validates email                 │
│  14:32:17 [test] ✗ user.login handles expired session          │
│  14:32:18 [git]  Commit: feat: add session management          │
│  14:32:20 [app]  Request: POST /api/users                      │
│  14:32:21 [app]  Response: 201 Created (23ms)                  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  [/] Search  [f] Filter  [c] Clear  [Space] Pause               │
└─────────────────────────────────────────────────────────────────┘
`,

  'dashboard-team': `
┌─────────────────────────────────────────────────────────────────┐
│  Team                                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Online                                                         │
│  ────────                                                       │
│  ● @alice     Task 3: Session management      2m ago           │
│  ● @bob       Task 4: Password reset          5m ago           │
│                                                                 │
│  Away                                                           │
│  ────────                                                       │
│  ○ @charlie   No task claimed                 1h ago           │
│                                                                 │
│  Activity Feed                                                  │
│  ────────────                                                   │
│  14:30  @alice committed "add session middleware"              │
│  14:25  @bob claimed Task 4                                    │
│  14:20  @alice completed Task 1                                │
│  14:15  @charlie released Task 3                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
`,

  'test-first-red': `
$ npm test

  User Authentication
    ✗ creates user with valid data
      Expected: 201
      Received: undefined

    ✗ rejects duplicate email
      Error: Cannot read property 'status' of undefined

    ✗ hashes password before storing
      Expected: password to be hashed
      Received: undefined

  3 failing (0 passing)

  ─────────────────────────────────────────────────────────────
  RED PHASE: Tests written, implementation needed
  ─────────────────────────────────────────────────────────────
`,

  'test-first-green': `
$ npm test

  User Authentication
    ✓ creates user with valid data (12ms)
    ✓ rejects duplicate email (8ms)
    ✓ hashes password before storing (15ms)
    ✓ validates email format (3ms)
    ✓ requires password minimum length (2ms)

  Session Management
    ✓ creates session on login (18ms)
    ✓ invalidates session on logout (5ms)

  7 passing (63ms)

  ─────────────────────────────────────────────────────────────
  GREEN PHASE: All tests passing ✓
  ─────────────────────────────────────────────────────────────
`,

  'auto-review': `
$ /tlc:build 2 (auto-review)

═══════════════════════════════════════════════════════════════
Auto-Review Results
═══════════════════════════════════════════════════════════════

Test Coverage
  src/auth/user.ts        94%  ████████████████████░░
  src/auth/session.ts     88%  ██████████████████░░░░
  src/auth/password.ts   100%  ██████████████████████

TDD Compliance
  ✓ Tests committed before implementation
  ✓ All new code has corresponding tests
  ✓ No untested functions added

Security Check
  ✓ No hardcoded secrets
  ✓ Passwords properly hashed
  ✓ SQL injection protection

Quality Score: 92/100

Verdict: ✓ APPROVED
═══════════════════════════════════════════════════════════════
`,

  'new-project-wizard': `
$ /tlc:new-project

═══════════════════════════════════════════════════════════════
TLC New Project Setup
═══════════════════════════════════════════════════════════════

What are you building?
> A task management API with user authentication

Who will use it?
> Development team for internal project tracking

Tech stack preferences?
  [x] Node.js + Express
  [ ] Python + FastAPI
  [ ] Go + Gin
  [ ] Other

Test framework?
  [x] Vitest (recommended)
  [ ] Jest
  [ ] Mocha

Creating project structure...
  ✓ PROJECT.md
  ✓ .planning/ROADMAP.md
  ✓ .tlc.json
  ✓ package.json

Project ready! Run /tlc:next to begin.
`,
};

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Generate each screenshot
console.log('Generating screenshots...\n');

for (const [name, content] of Object.entries(screenshots)) {
  const filename = `${name}.png`;
  const filepath = path.join(OUTPUT_DIR, filename);

  try {
    const dataUri = generateSync(content.trim(), options);
    const base64Data = dataUri.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));
    console.log(`  ✓ ${filename}`);
  } catch (err) {
    console.log(`  ✗ ${filename}: ${err.message}`);
  }
}

console.log('\nDone! Screenshots saved to docs/wiki/images/');
