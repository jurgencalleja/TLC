# TLC Roadmap - v1.0

## Vision

TLC is the **only AI coding tool that enforces test-first development**. While competitors focus on planning and code generation, TLC ensures tests define behavior before code exists.

## Target Users

- **3 Engineers** - "Vibe coding" with Claude Code, need coordination
- **Product Owner** - Defines requirements, tracks progress
- **QA Team** - Verifies features, reports bugs

## Milestone: v1.0 - Team Collaboration Release

### Phase 1: Core Infrastructure [x]

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

**Note:** Dashboard UI exists but many features are placeholders. Full functionality comes in Phase 3 (Dev Server) and Phase 4 (API Docs).

---

### Phase 2: Test Quality & Auto-Fix [x]

**Goal:** Improve test quality metrics and automate failure recovery.

**Deliverables:**
- [x] Test quality scoring (`/tlc:quality`)
  - [x] Coverage percentage parsing (Istanbul + Vitest)
  - [x] Edge case detection
  - [x] Quality score calculation (40% coverage + 30% edge cases + 30% mutation)
- [x] Auto-fix on test failure (`/tlc:autofix`)
  - [x] Error pattern matching
  - [x] Fix proposal generation
  - [x] Configurable max attempts
- [x] Edge case generator (`/tlc:edge-cases`)
  - [x] Function parsing (TypeScript/JavaScript)
  - [x] Edge cases by parameter type
  - [x] Security pattern tests
- [x] Dashboard QualityPane component
- [x] Configuration schema (.tlc.json quality/autofix/edgeCases)

**Success Criteria:**
- [x] Test quality score visible in dashboard
- [x] Edge cases generated for each task
- [x] 94 server tests + 70 dashboard tests = 164 total tests

---

### Phase 2.5: Project Health [x]

**Goal:** Security audit and dependency management for project maintenance.

**Deliverables:**
- [x] Security audit (`/tlc:security`)
  - [x] Parse npm audit / pip-audit output
  - [x] Display vulnerabilities by severity
  - [x] Generate fix suggestions
- [x] Dependency updates (`/tlc:outdated`)
  - [x] Parse npm outdated / pip outdated
  - [x] Categorize by update type (major/minor/patch)
  - [x] Generate update plans
- [x] Dashboard integration
  - [x] HealthPane component
  - [x] Security status indicator
  - [x] Outdated dependency count

**Success Criteria:**
- [x] Security vulnerabilities visible in dashboard
- [x] Breaking changes flagged before update
- [x] 36 new tests (14 security + 15 dependency + 7 dashboard)

---

### Phase 3: TLC Dev Server (Mini-Replit) [x]

**Goal:** Unified development environment with live preview and team collaboration.

**Deliverables:**
- [x] Auto-detect project type (Next.js, Express, Python, Go, etc.)
- [x] Dockerfile generation per service type
- [x] Docker-compose generation with infrastructure (postgres, redis, minio)
- [x] Service proxy configuration for routing to containers
- [x] Container lifecycle management (start/stop/restart/logs)
- [x] Log formatting, filtering, and buffering
- [x] ServicesPane dashboard component (container status)
- [x] LogsPane dashboard component (real-time logs)
- [x] WebSocket server for real-time updates
- [x] File watcher for hot reload triggers
- [x] Screenshot capture module for bug reports
- [x] Dev server runtime integration
- [x] AppPreview component for embedded app viewing
- [x] Start app server automatically (`/tlc:start`) - command exists
- [x] Single URL for PO/QA (no technical setup) - web dashboard with app preview

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

**Test Progress:**
- [x] docker-manager: 20 tests
- [x] log-streamer: 15 tests
- [x] service-proxy: 17 tests
- [x] container-orchestrator: 33 tests
- [x] dev-server-command: 25 tests
- [x] websocket-server: 36 tests
- [x] file-watcher: 37 tests
- [x] screenshot-capture: 39 tests
- [x] dev-server-runtime: 38 tests
- [x] ServicesPane: 13 tests
- [x] LogsPane: 18 tests
- [x] AppPreview: 20 tests
- Total: 311 new tests (383 server + 128 dashboard = 511 total)

**Success Criteria:**
- QA tests real app in browser, submits bugs with screenshots
- PO sees progress without technical setup
- Engineer sees app logs + test results in one place

---

### Phase 4: API Documentation Generation [x]

**Goal:** Auto-generate comprehensive API docs for humans, AI coders, and deployed AI agents.

**Deliverables:**
- [x] Route detection module
  - [x] Detect Express, Fastify, Hono, Koa frameworks
  - [x] Extract routes from code patterns
  - [x] Parse path parameters
- [x] OpenAPI generator
  - [x] Generate OpenAPI 3.x specification
  - [x] JSON and YAML serialization
  - [x] Validation
- [x] Spec merger
  - [x] Find existing swagger/openapi specs
  - [x] Merge detected routes into existing specs
  - [x] Filter duplicates
- [x] ORM schema parser
  - [x] Drizzle, Prisma, TypeORM support
  - [x] JSON Schema export for models
  - [ ] Relationship diagrams
- [x] Example generator
  - [x] Auto-generate curl examples
  - [x] Sample request/response payloads
  - [x] Error response documentation
- [x] Docs generator orchestrator
- [x] Auth flow documentation
  - [x] Token formats and flows (JWT, OAuth2, API key, basic, session)
  - [x] Permission/role detection
  - [x] Security scheme generation
  - [x] Markdown documentation generation
- [x] Dashboard integration
  - [x] DocsPane component
  - [x] `/tlc:docs` command
  - [ ] Swagger UI embedded in dashboard
- [x] AI-agent-friendly format
  - [x] MCP tool definitions from OpenAPI
  - [x] MCP server manifest generation
  - [x] Tool invocation examples
  - [x] Markdown documentation

**Test Progress:**
- [x] route-detector: 33 tests
- [x] openapi-generator: 48 tests
- [x] spec-merger: 34 tests
- [x] orm-schema-parser: 32 tests
- [x] example-generator: 35 tests
- [x] docs-generator: 13 tests
- [x] docs-command: 28 tests
- [x] auth-flow-docs: 34 tests
- [x] DocsPane: 21 tests
- [x] mcp-format: 38 tests
- Total: 316 new tests (Phase 4)

**Success Criteria:**
- API docs viewable in dashboard next to live app
- AI agents can discover and call APIs from docs
- Human developers get curl examples + auth info
- ORM schemas documented with relationships

---

### Phase 5: CI/CD Integration [x]

**Goal:** Enforce test-first in automated pipelines.

**Deliverables:**
- [x] GitHub Actions workflow generator (github-actions.js)
  - [x] Test workflow generation with matrix support
  - [x] PR workflow generation
  - [x] Custom YAML serializer (no external deps)
  - [x] Package manager detection (npm, pnpm, yarn, python, go)
- [x] `/tlc:ci` command (ci-command.js)
  - [x] --test, --pr, --both workflow types
  - [x] --threshold for coverage limits
  - [x] --dry-run preview mode
  - [x] Auto-detect package manager
- [x] Coverage threshold enforcement (coverage-threshold.js)
  - [x] Parse Istanbul/Vitest/Jest coverage JSON
  - [x] Parse pytest coverage output
  - [x] Parse Go coverage output
  - [x] Per-file threshold checks
- [x] PR test report generation (pr-report.js)
  - [x] Parse Vitest/Jest/pytest/Go test output
  - [x] Generate PR comment markdown
  - [x] Generate GitHub step summary
  - [x] Collapsible failure details
- [x] Block merges when tests fail (via merge-command)
- [x] **Regression test suite on merge/import:**
  - [x] `/tlc:merge` - Run full regression before completing merge
  - [x] Pre-merge checks (uncommitted changes, branch validation)
  - [x] Import detection (new dependencies, breaking changes)
  - [x] Merge summary generation
  - [ ] Pre-merge hooks (git hooks integration)

**Test Progress:**
- [x] github-actions: 50 tests
- [x] ci-command: 31 tests
- [x] coverage-threshold: 36 tests
- [x] pr-report: 41 tests
- [x] merge-command: 20 tests
- Total: 178 new tests (856 server + 149 dashboard = 1005 total)

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

### Phase 6: Issue Tracker Integration [x]

**Goal:** Connect TLC to external project management.

**Deliverables:**
- [x] Issue tracker core module (issue-tracker.js)
  - [x] Support for Linear, GitHub, Jira, GitLab
  - [x] Status normalization across trackers
  - [x] Priority normalization
  - [x] Acceptance criteria extraction from descriptions
  - [x] Test case extraction (Given/When/Then support)
- [x] `/tlc:issue` command (issue-command.js)
  - [x] Import issues and generate test specs
  - [x] List issues from tracker
  - [x] Show issue status
  - [x] Sync task statuses to issues
  - [x] Support for markdown and JSON output
- [x] Auto-generate test specs from issue descriptions
  - [x] Extract acceptance criteria from checkboxes and "should" statements
  - [x] Generate test spec markdown with test cases
- [x] Bi-directional sync (bugs → issues) (bug-sync.js)
  - [x] Parse BUGS.md format
  - [x] Convert bugs to issue tracker format
  - [x] Convert issues to bug format
  - [x] Find status updates between bugs and issues
  - [x] Generate sync reports

**Test Progress:**
- [x] issue-tracker: 39 tests
- [x] issue-command: 34 tests
- [x] bug-sync: 35 tests
- Total: 108 new tests (964 server + 149 dashboard = 1113 total)

**Success Criteria:**
- [x] PO creates issues, engineers get test specs
- [x] Issue status reflects actual test state
- [x] Bugs flow back to issue tracker

---

### Phase 7: Team Workflow Documentation [x]

**Goal:** Document how teams of 3+ engineers collaborate with TLC.

**Deliverables:**
- [x] Team workflow paper (generateTeamWorkflow)
- [x] Role-specific guides (Engineer, PO, QA, Lead)
- [x] Onboarding guide (generateOnboardingGuide)
- [x] `/tlc:docs` command for generation
- [x] Common pitfalls by role
- [x] Quick start per role
- [ ] Video tutorials (external)
- [ ] Example project walkthrough (external)

**Test Progress:**
- [x] team-docs: 36 tests
- [x] team-docs-command: 24 tests
- Total: 60 new tests (1024 server + 149 dashboard = 1173 total)

**Success Criteria:**
- [x] New team can onboard in <1 hour (onboarding guide)
- [x] Clear role boundaries documented (role guides)
- [x] Common pitfalls addressed (PITFALLS per role)

---

### Phase 8: Multi-Tool Support [x]

**Goal:** Support Cursor, Antigravity, Copilot, Continue, and other AI coding tools.

**Deliverables:**
- [x] `/tlc:export` - Generate tool-specific config files:
  - [x] `AGENTS.md` (universal standard)
  - [x] `.cursor/rules/tlc.mdc` (Cursor)
  - [x] `.antigravity/rules.md` (Google Antigravity)
  - [x] `.windsurfrules` (Windsurf)
  - [x] `.github/copilot-instructions.md` (Copilot)
  - [x] `.continue/rules/tlc.md` (Continue)
  - [x] `.cody/instructions.md` (Cody)
  - [x] `.amazonq/rules/tlc.md` (Amazon Q)
  - [x] `.aider.conf.yml` (Aider)
- [x] Runtime detection (which AI tool is running)
- [ ] TLC MCP Server (works with any MCP-compatible tool) - deferred to v1.1

**Test Progress:**
- [x] tool-rules: 62 tests
- [x] tool-detector: 47 tests
- [x] export-command: 36 tests
- Total: 145 new tests (1169 server + 149 dashboard = 1318 total)

**Why This Matters:**
- Teams use different tools (Cursor, Antigravity, VS Code + Copilot)
- TLC workflow should be tool-agnostic
- `AGENTS.md` is backed by Google, OpenAI, Sourcegraph, Cursor

**Success Criteria:**
- [x] Engineer using Cursor/Antigravity gets same TLC workflow as Claude Code
- [x] Test-first enforcement works across all supported tools

---

### Phase 9: TLC Dev Server [x]

**Goal:** Central server for distributed teams - push to branch, server deploys.

**Architecture:**
```
Engineers (worldwide) → git push → GitHub → webhook → Dev Server
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
- [x] GitHub/GitLab webhook listener (webhook-listener.js)
- [x] Per-branch deployments with subdomains (branch-deployer.js)
- [x] Reverse proxy config generation (caddy/nginx)
- [x] Basic auth with users table (auth-system.js)
- [x] JWT tokens and session management
- [x] Docker-based isolation per branch
- [x] Slack integration with webhooks (slack-notifier.js)
- [x] `/tlc:deploy` command (deploy-command.js)
- [ ] `tlc-server` npm package (packaging task)

**Test Progress:**
- [x] webhook-listener: 49 tests
- [x] branch-deployer: 27 tests
- [x] auth-system: 60 tests
- [x] slack-notifier: 35 tests
- [x] deploy-command: 33 tests
- Total: 204 new tests (1373 server + 149 dashboard = 1522 total)

**Success Criteria:**
- [x] Webhook listener validates GitHub/GitLab signatures
- [x] Branch deployer generates container names and subdomains
- [x] Auth system handles users, JWT, sessions, permissions
- [x] Slack notifier sends formatted notifications

---

---

## Milestone: v1.1 - Automatic Memory System

### Phase 10: Memory Storage Layer [x]

**Goal:** Create persistent storage for team and personal memory.

**Deliverables:**
- [x] Memory directory structure (.tlc/memory/team, .tlc/memory/.local)
- [x] Memory write utilities (decisions, gotchas, preferences, session logs)
- [x] Memory read utilities (load, search)
- [x] Gitignore integration for .local

**Success Criteria:**
- [x] Team memory tracked in git
- [x] Personal memory stays local
- [x] Read/write operations work reliably

**Tests:** 47 (12 storage + 15 writer + 20 reader)

---

### Phase 11: Automatic Capture [x]

**Goal:** Detect and store decisions, preferences, gotchas from conversations automatically.

**Deliverables:**
- [x] Pattern detection (decisions, preferences, corrections, gotchas)
- [x] Memory classification (team vs personal)
- [x] Background observer hook
- [x] Non-blocking capture

**Success Criteria:**
- [x] Decisions captured without user intervention
- [x] No latency impact on responses
- [x] Correct team/personal classification

**Tests:** 47 (19 detector + 18 classifier + 10 observer)

---

### Phase 12: Automatic Recall [ ]

**Goal:** Surface relevant memory at session start.

**Deliverables:**
- [ ] Session context builder
- [ ] Relevance scoring (file, branch, recency, keyword)
- [ ] CLAUDE.md injection
- [ ] Token budget management

**Success Criteria:**
- [ ] Relevant context appears at session start
- [ ] Context stays within token budget
- [ ] No announcement needed - just works

---

### Phase 13: Memory Integration [ ]

**Goal:** Hook memory system into TLC commands.

**Deliverables:**
- [ ] /tlc:init creates memory structure
- [ ] All commands trigger observation
- [ ] Session end summary
- [ ] Auto-commit team memory

**Success Criteria:**
- [ ] Memory works seamlessly with existing TLC workflow
- [ ] Team memory committed with conventional commits
- [ ] Session summaries generated

---

---

## Milestone: v1.2 - Dashboard Refresh

Complete redesign of TLC dashboard for both local dev and VPS. Transform from prototype to polished product.

### Phase 14: Design System Foundation [ ]

**Goal:** Establish design tokens, core UI components, and layout system.

**Deliverables:**
- [ ] Design tokens (colors, spacing, typography, dark/light themes)
- [ ] Core UI components (Button, Card, Badge, Input, Modal, Toast)
- [ ] Layout components (Sidebar, Header, MobileNav, Shell)
- [ ] Responsive grid system

**Success Criteria:**
- [ ] Theme switching works
- [ ] Components accessible (keyboard nav, contrast)
- [ ] Mobile-first responsive layout

---

### Phase 15: Project Views [ ]

**Goal:** Project cards, grid, and detail pages.

**Deliverables:**
- [ ] ProjectCard with status, tests, coverage
- [ ] ProjectGrid with search/filter
- [ ] ProjectDetail with tabs (Overview, Tasks, Tests, Logs, Settings)
- [ ] Branch selector

**Success Criteria:**
- [ ] Projects browsable and searchable
- [ ] Quick actions accessible on hover
- [ ] Responsive grid (1/2/3 columns)

---

### Phase 16: Task Management [ ]

**Goal:** Kanban board for task tracking.

**Deliverables:**
- [ ] TaskBoard with drag-and-drop
- [ ] TaskCard with priority, assignee, test status
- [ ] TaskDetail modal with activity, comments
- [ ] Filter by assignee/status

**Success Criteria:**
- [ ] Drag-and-drop works on desktop and mobile
- [ ] Task claiming from board
- [ ] Real-time updates across team

---

### Phase 17: Logs & Preview [ ]

**Goal:** Log streaming and live app preview.

**Deliverables:**
- [ ] LogStream with virtualization (thousands of entries)
- [ ] Log filtering and search
- [ ] PreviewFrame with device toggle
- [ ] Auto-scroll with pause detection

**Success Criteria:**
- [ ] Logs render smoothly at 10k+ entries
- [ ] Preview works in iframe with error handling
- [ ] Device size toggle (phone/tablet/desktop)

---

### Phase 18: Team Features (VPS) [ ]

**Goal:** Team presence and activity for VPS deployments.

**Deliverables:**
- [ ] TeamPresence with online/offline status
- [ ] ActivityFeed with filtering
- [ ] Real-time WebSocket updates
- [ ] Environment detection (local vs VPS)

**Success Criteria:**
- [ ] Team members visible in real-time
- [ ] Activity updates instantly
- [ ] Features hidden in local mode

---

### Phase 19: Settings & Polish [ ]

**Goal:** Settings, keyboard shortcuts, final polish.

**Deliverables:**
- [ ] Settings page with config editor
- [ ] WebSocket layer with auto-reconnect
- [ ] Keyboard shortcuts (Cmd+K palette)
- [ ] Accessibility audit pass

**Success Criteria:**
- [ ] Loads in <2s on 3G
- [ ] Keyboard navigable
- [ ] Screen reader friendly
- [ ] Works on tablet (iPad)

---

## Future Milestones (v1.x)

### v1.4 - Enterprise Features
- Multi-repo support
- Audit logs for all agent actions
- SOC 2 documentation
- Zero-data-retention mode
- SSO integration (OAuth, SAML)

### v1.5 - Advanced AI
- [x] Parallel agent execution (Overdrive module - auto-detects independent tasks)
- Agent orchestration dashboard
- Model selection per agent
- Cost optimization mode
- Quality optimization mode

### v1.6 - Ecosystem
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
| AI-ready API docs | ✅ | ❌ | ❌ | ❌ |

---

## Metrics

| Metric | Target |
|--------|--------|
| Test coverage on TLC codebase | >80% |
| Commands documented | 100% |
| User onboarding time | <30 min |
| Bug submission to fix | <24 hours |
