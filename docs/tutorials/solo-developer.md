# Solo Developer Tutorial

Build a complete feature using TLC's test-first workflow. This tutorial takes about 30 minutes.

## What You'll Build

A simple task API with:
- Create task
- List tasks
- Mark task complete
- Delete task

## Prerequisites

- Node.js 18+
- Claude Code with TLC installed
- Basic JavaScript knowledge

## Step 1: Create New Project

Open a terminal in an empty directory:

```bash
mkdir task-api
cd task-api
```

In Claude Code:
```
/tlc:new-project
```

When prompted:
- **Project name:** Task API
- **Description:** Simple REST API for task management
- **Tech stack:** Node.js with Express
- **Test framework:** Mocha (default)

TLC creates the project structure:
```
task-api/
├── PROJECT.md
├── .planning/
│   ├── ROADMAP.md
│   └── phases/
├── .tlc.json
├── package.json
└── src/
```

## Step 2: Review the Roadmap

Open `.planning/ROADMAP.md`. TLC has created phases:

```markdown
## Phase 1: Core API

- Task 1: Create Express server
- Task 2: Add task creation endpoint
- Task 3: Add task listing endpoint
- Task 4: Add task completion endpoint
- Task 5: Add task deletion endpoint
```

## Step 3: Plan Phase 1

```
/tlc:plan 1
```

TLC creates `.planning/phases/1-PLAN.md`:

```markdown
# Phase 1: Core API - Plan

## Task 1: Create Express server

**Goal:** Basic Express server with health check

**Files:**
- src/index.js
- src/app.js

**Test Cases:**
- Server starts without error
- GET /health returns 200
- GET /health returns { status: 'ok' }

---

## Task 2: Add task creation endpoint

**Goal:** POST /tasks creates a new task

**Files:**
- src/routes/tasks.js
- src/models/task.js

**Test Cases:**
- POST /tasks with valid data returns 201
- POST /tasks returns created task with id
- POST /tasks with missing title returns 400
- POST /tasks with empty title returns 400
```

## Step 4: Build Phase 1 (Test-First)

```
/tlc:build 1
```

TLC starts the test-first process:

### 4a. Writing Tests (Red Phase)

TLC creates `test/server.test.js`:

```javascript
const { expect } = require('chai');
const request = require('supertest');
const app = require('../src/app');

describe('Server', () => {
  describe('GET /health', () => {
    it('returns 200 status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).to.equal(200);
    });

    it('returns ok status in body', async () => {
      const res = await request(app).get('/health');
      expect(res.body.status).to.equal('ok');
    });
  });
});
```

TLC runs tests:
```
❌ 2 tests failing (expected - no implementation yet)
```

**This is correct!** Tests should fail because code doesn't exist.

### 4b. Implementation (Green Phase)

TLC implements `src/app.js`:

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;
```

TLC runs tests again:
```
✅ 2 tests passing
```

TLC commits:
```
feat: create express server with health check - phase 1
```

### 4c. Continue with Task 2

TLC writes tests for task creation:

```javascript
describe('POST /tasks', () => {
  it('returns 201 for valid task', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Buy milk' });

    expect(res.status).to.equal(201);
  });

  it('returns task with id', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Buy milk' });

    expect(res.body.id).to.exist;
    expect(res.body.title).to.equal('Buy milk');
  });

  it('returns 400 for missing title', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({});

    expect(res.status).to.equal(400);
  });
});
```

Tests fail, then TLC implements:

```javascript
// src/routes/tasks.js
const tasks = [];
let nextId = 1;

router.post('/', (req, res) => {
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title required' });
  }

  const task = {
    id: nextId++,
    title,
    completed: false,
    createdAt: new Date()
  };

  tasks.push(task);
  res.status(201).json(task);
});
```

Tests pass, TLC commits:
```
feat: add task creation endpoint - phase 1
```

### 4d. Process Continues

TLC repeats for each task:
1. Write failing tests
2. Implement code
3. Verify tests pass
4. Commit

## Step 5: Auto-Review

After all tasks complete, TLC runs automatic review:

```
🔍 Auto-Review Results

Test Coverage: ✅ 5/5 files covered
TDD Score: 100% ✅
Security: ✅ No issues

Verdict: ✅ APPROVED
```

## Step 6: Verify

```
/tlc:verify 1
```

TLC presents verification checklist:

```
Phase 1 Verification

Please manually test:

1. Start server: npm start
2. Test health: curl http://localhost:3000/health
3. Create task: curl -X POST http://localhost:3000/tasks -H "Content-Type: application/json" -d '{"title":"Test"}'
4. List tasks: curl http://localhost:3000/tasks
5. Complete task: curl -X PATCH http://localhost:3000/tasks/1 -H "Content-Type: application/json" -d '{"completed":true}'
6. Delete task: curl -X DELETE http://localhost:3000/tasks/1

All working correctly? (Y/n)
```

Type `Y` to confirm.

## Step 7: Check Progress

```
/tlc:progress
```

```
Task API - Progress

Milestone: v1.0
Phase 1: Core API ✅ Complete

Progress: 1/3 phases (33%)
Tests: 15 passing, 0 failing
Coverage: 94%

Next: /tlc:plan 2 (Database Integration)
```

## Step 8: Continue to Phase 2

```
/tlc:plan 2
```

And the cycle continues...

## Key Takeaways

### The TLC Rhythm

```
Plan → Write Tests → See Fail → Implement → See Pass → Commit → Repeat
```

### What You Didn't Do

- Write code before tests
- Manually test each change
- Wonder "does this work?"
- Debug mysterious failures

### What You Got

- 100% test coverage
- Documented behavior
- Confidence in your code
- Clean commit history

## Tips for Solo Development

### 1. Trust the Process

It feels slow at first. You'll think "I could just write the code." Resist. The time saved debugging is worth it.

### 2. Keep Tasks Small

Each task should be completable in 15-30 minutes. If it's bigger, split it.

### 3. Commit Often

TLC commits after each task. This gives you:
- Easy rollback points
- Clear history
- Progress visibility

### 4. Use Coverage Gaps

```
/tlc:coverage
```

Find untested code and add tests. 80%+ coverage is the goal.

### 5. Run Quality Check

```
/tlc:quality
```

Get a score and suggestions for improving test quality.

## Next Steps

- Add more phases to your project
- Try `/tlc:edge-cases` on a complex function
- Set up `/tlc:ci` for automated testing
- Check out the [Team Setup Tutorial](team-setup.md) when you add collaborators

## Complete Example

The finished project:

```
task-api/
├── PROJECT.md
├── .planning/
│   ├── ROADMAP.md
│   ├── phases/
│   │   ├── 1-PLAN.md
│   │   └── 1-TESTS.md
├── .tlc.json
├── package.json
├── src/
│   ├── app.js
│   ├── index.js
│   ├── routes/
│   │   └── tasks.js
│   └── models/
│       └── task.js
└── test/
    ├── server.test.js
    └── tasks.test.js
```

15 tests, 94% coverage, clean commit history, working API.

That's TLC.
