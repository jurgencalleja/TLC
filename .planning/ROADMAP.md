# TLC Roadmap - v1.0

## Vision

TLC is the **only AI coding tool that enforces test-first development**. While competitors focus on planning and code generation, TLC ensures tests define behavior before code exists.

## Target Users

- **3 Engineers** - "Vibe coding" with Claude Code, need coordination
- **Product Owner** - Defines requirements, tracks progress
- **QA Team** - Verifies features, reports bugs

## Milestone: v1.0 - Team Collaboration Release

### Phase 1: Core Infrastructure [current]

**Goal:** Establish TLC as source of truth for planning, ensure consistent usage.

**Deliverables:**
- [x] CLAUDE.md to enforce TLC over internal task tools
- [x] Multi-user task claiming (`/tlc:claim`, `/tlc:release`, `/tlc:who`)
- [x] Configurable test frameworks (mocha default)
- [x] Bug tracking (`/tlc:bug`)
- [x] Dashboard server (`/tlc:server`)

**Success Criteria:**
- Claude uses TLC artifacts, not TaskCreate/TaskUpdate
- Multiple engineers can coordinate without conflicts
- QA can submit bugs through web UI

---

### Phase 2: Test Quality & Auto-Fix [ ]

**Goal:** Improve test quality metrics and automate failure recovery.

**Deliverables:**
- Test quality scoring (`/tlc:quality`)
  - Coverage percentage
  - Edge case detection
  - Mutation testing score
- Auto-fix on test failure
  - Retry loop with reasoning
  - Configurable max attempts
  - Show debugging steps
- Edge case generator (`/tlc:edge-cases`)
  - AI-generated edge cases from code analysis
  - Integration with mutation testing

**Success Criteria:**
- Test quality score visible in dashboard
- 80%+ of simple test failures auto-fixed
- Edge cases generated for each task

---

### Phase 3: TLC Dev Server (Mini-Replit) [ ]

**Goal:** Unified development environment with live preview and team collaboration.

**Deliverables:**
- Auto-detect project type (Next.js, Express, Python, Go, etc.)
- Start app server automatically
- Embed running app in dashboard (iframe with proxy)
- Real-time log streaming:
  - App stdout/stderr
  - Test output
  - Git activity
- Screenshot capture for bug reports
- Hot reload on file changes
- Single URL for PO/QA (no technical setup)

**Architecture:**
```
┌─────────────────────────────────────┐
│  localhost:3147 (TLC Dashboard)     │
│  ┌───────────┐  ┌─────────────────┐ │
│  │ App embed │  │ Logs/Tasks/Bugs │ │
│  │ (proxy)   │  │                 │ │
│  └───────────┘  └─────────────────┘ │
│       ↓                             │
│  localhost:3000 (Your App)          │
└─────────────────────────────────────┘
```

**Success Criteria:**
- QA tests real app in browser, submits bugs with screenshots
- PO sees progress without technical setup
- Engineer sees app logs + test results in one place

---

### Phase 4: CI/CD Integration [ ]

**Goal:** Enforce test-first in automated pipelines.

**Deliverables:**
- GitHub Actions template (`/tlc:ci`)
- Block merges when tests fail
- Coverage threshold enforcement
- Auto-run `/tlc:coverage` on PRs
- PR test report comments
- **Regression test suite on merge/import:**
  - `/tlc:merge` - Run full regression before completing merge
  - Pre-merge hooks that require test pass
  - Import detection (new dependencies, breaking changes)
  - Automatic rollback if regression fails

**Merge Workflow:**
```
git merge feature/x
     ↓
TLC detects merge
     ↓
"Run regression tests? (Y/n)"
     ↓
Full test suite runs
     ↓
Pass → Complete merge
Fail → Abort merge, show failures
```

**Success Criteria:**
- No untested code merges to main
- Coverage thresholds enforced automatically
- PR authors see test status before review
- Regressions caught before they reach main branch

---

### Phase 5: Issue Tracker Integration [ ]

**Goal:** Connect TLC to external project management.

**Deliverables:**
- Linear MCP integration
- `/tlc:issue` - Import requirements from issue tracker
- Auto-generate test specs from issue descriptions
- Update issue status when tests pass
- Bi-directional sync (bugs → issues)

**Success Criteria:**
- PO creates issues, engineers get test specs
- Issue status reflects actual test state
- Bugs flow back to issue tracker

---

### Phase 6: Team Workflow Documentation [ ]

**Goal:** Document how teams of 3+ engineers collaborate with TLC.

**Deliverables:**
- Team workflow paper
- Role-specific guides (Engineer, PO, QA)
- Video tutorials
- Example project walkthrough

**Success Criteria:**
- New team can onboard in <1 hour
- Clear role boundaries documented
- Common pitfalls addressed

---

---

### Phase 7: Multi-Tool Support [ ]

**Goal:** Support Cursor, Copilot, Continue, and other AI coding tools.

**Deliverables:**
- `/tlc:export-rules` - Generate tool-specific config files:
  - `AGENTS.md` (universal standard)
  - `.cursor/rules/tlc.mdc` (Cursor)
  - `.github/copilot-instructions.md` (Copilot)
  - `.continue/rules/tlc.md` (Continue)
  - `.amazonq/rules/tlc.md` (Amazon Q)
- Runtime detection (which AI tool is running)
- TLC MCP Server (works with any MCP-compatible tool)

**Why This Matters:**
- Teams use different tools (some prefer Cursor, some VS Code + Copilot)
- TLC workflow should be tool-agnostic
- `AGENTS.md` is backed by Google, OpenAI, Sourcegraph, Cursor

**Success Criteria:**
- Engineer using Cursor gets same TLC workflow as Claude Code
- Test-first enforcement works across all supported tools

---

### Phase 8: VPS Deployment Server [ ]

**Goal:** Central server for distributed teams - push to branch, VPS deploys.

**Architecture:**
```
Engineers (worldwide) → git push → GitHub → webhook → VPS
                                                       ↓
                                              TLC Server
                                              - Branch deployments
                                              - Central dashboard
                                              - Log aggregation
                                              - Bug tracker
                                                       ↓
                                              QA/PO (browser)
```

**Deliverables:**
- `tlc-server` npm package for VPS
- GitHub/GitLab webhook listener
- Per-branch deployments (subdomains)
- Reverse proxy (caddy/nginx)
- **Basic auth with users table** (not SSO)
- Docker-based isolation per branch
- Log streaming to dashboard
- Central bug tracker
- **Slack integration (webhooks)**

**Auth System:**
```
Users table:
- id, email, password_hash, role (admin/engineer/qa/po)
- JWT tokens for API access
- Session management
```

**Slack Notifications:**
```
Events → Slack webhook:
- 🐛 Bug submitted: "BUG-007: Login fails (@alice)"
- ✅ Tests passing: "feature/auth - 24/24 tests pass"
- ❌ Tests failing: "feature/auth - 2 tests failed"
- 🚀 Deploy complete: "feature/auth deployed to auth.app.example.com"
- 📋 Task claimed: "@bob claimed Task 3: Add validation"
- 🔄 Branch updated: "feature/auth - 3 new commits"

Config (.tlc.json):
{
  "slack": {
    "webhookUrl": "https://hooks.slack.com/services/xxx",
    "channel": "#dev-notifications",
    "events": ["bug", "test-fail", "deploy", "claim"]
  }
}
```

**Success Criteria:**
- Engineer pushes, VPS auto-deploys within 2 minutes
- QA logs in, sees all branches, tests any of them
- Bugs submitted through dashboard appear in git

---

## Future Milestones (v1.x)

### v1.1 - Enterprise Features
- Multi-repo support
- Audit logs for all agent actions
- SOC 2 documentation
- Zero-data-retention mode
- SSO integration (OAuth, SAML)

### v1.2 - Advanced AI
- Parallel agent execution
- Agent orchestration dashboard
- Model selection per agent
- Cost optimization mode
- Quality optimization mode

### v1.3 - Ecosystem
- MCP tool publishing
- Plugin marketplace
- Custom agent definitions
- Third-party integrations

---

## Competitive Differentiators

| Feature | TLC | Cursor | Copilot | Devin |
|---------|-----|--------|---------|-------|
| Test-first enforcement | ✅ | ❌ | ❌ | ❌ |
| Multi-user coordination | ✅ | ⚠️ | ⚠️ | ❌ |
| Coverage tracking | ✅ | ❌ | ❌ | ❌ |
| QA bug submission | ✅ | ❌ | ❌ | ❌ |
| Real-time log streaming | ✅ | ❌ | ❌ | ⚠️ |

---

## Metrics

| Metric | Target |
|--------|--------|
| Test coverage on TLC codebase | >80% |
| Commands documented | 100% |
| User onboarding time | <30 min |
| Bug submission to fix | <24 hours |
