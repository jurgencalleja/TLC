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

### Phase 12: Automatic Recall [x]

**Goal:** Surface relevant memory at session start.

**Deliverables:**
- [x] Session context builder
- [x] Relevance scoring (file, branch, recency, keyword)
- [x] CLAUDE.md injection
- [x] Token budget management

**Success Criteria:**
- [x] Relevant context appears at session start
- [x] Context stays within token budget
- [x] No announcement needed - just works

**Tests:** 43 (10 context-builder + 11 relevance-scorer + 11 claude-injector + 11 session-summary)

---

### Phase 13: Memory Integration [x]

**Goal:** Hook memory system into TLC commands.

**Deliverables:**
- [x] /tlc:init creates memory structure
- [x] All commands trigger observation
- [x] Session end summary
- [x] Auto-commit team memory

**Success Criteria:**
- [x] Memory works seamlessly with existing TLC workflow
- [x] Team memory committed with conventional commits
- [x] Session summaries generated

**Tests:** 38 (12 memory-init + 12 memory-committer + 14 memory-hooks)

---

---

## Milestone: v1.2 - Dashboard Refresh

Complete redesign of TLC dashboard for both local dev and VPS. Transform from prototype to polished product.

### Phase 14: Design System Foundation [x]

**Goal:** Establish design tokens, core UI components, and layout system.

**Deliverables:**
- [x] Design tokens (colors, spacing, typography, dark/light themes)
- [x] Core UI components (Button, Card, Badge, Input)
- [x] Layout components (Sidebar, Header, Shell)
- [x] Ink-compatible terminal layout

**Test Progress:**
- tokens: 6 tests
- Button: 10 tests
- Card: 8 tests
- Badge: 9 tests
- Input: 7 tests
- Shell/Sidebar/Header: 18 tests
- Total: 58 tests

**Success Criteria:**
- [x] Theme switching works
- [x] Components accessible (keyboard nav, contrast)
- [x] Ink-based terminal layout

---

### Phase 15: Project Views [x]

**Goal:** Project cards, grid, and detail pages.

**Deliverables:**
- [x] ProjectCard with status, tests, coverage
- [x] ProjectList with search/filter/sort
- [x] ProjectDetail with tabs (Overview, Tasks, Tests, Logs)
- [x] BranchSelector with ahead/behind status

**Success Criteria:**
- [x] Projects browsable and searchable
- [x] Keyboard navigation (j/k, 1-4)
- [x] 71 tests passing

---

### Phase 16: Task Management [x]

**Goal:** Kanban board for task tracking.

**Deliverables:**
- [x] TaskBoard with keyboard navigation (h/l/j/k)
- [x] TaskCard with priority, assignee, test status
- [x] TaskDetail with activity, acceptance criteria
- [x] TaskFilter by assignee/status/priority

**Success Criteria:**
- [x] Keyboard-driven task management
- [x] Task claiming/release from detail view
- [x] 78 tests passing

---

### Phase 17: Logs & Preview [x]

**Goal:** Log streaming and live app preview.

**Deliverables:**
- [x] LogStream with pagination (handles 10k+ entries)
- [x] LogSearch with match count and navigation
- [x] DeviceFrame with phone/tablet/desktop presets
- [x] PreviewPanel with service selector and device toggle

**Success Criteria:**
- [x] Logs paginated for smooth rendering at scale
- [x] Preview URLs generated with viewport params
- [x] 86 tests passing

---

### Phase 18: Team Features (VPS) [x]

**Goal:** Team presence and activity for VPS deployments.

**Deliverables:**
- [x] TeamPresence with online/offline/away status
- [x] ActivityFeed with user and type filtering
- [x] EnvironmentBadge (local/vps/staging/production)
- [x] TeamPanel combining presence + activity

**Success Criteria:**
- [x] Team members sorted by status
- [x] Activity types: commit, claim, complete, review, comment
- [x] Features hidden in local mode
- [x] 75 tests passing

---

### Phase 19: Settings & Polish [x]

**Goal:** Settings, keyboard shortcuts, final polish.

**Deliverables:**
- [x] SettingsPanel with config editing (30 tests)
- [x] CommandPalette with fuzzy search (25 tests)
- [x] KeyboardHelp with context grouping (20 tests)
- [x] ConnectionStatus with auto-reconnect (22 tests)
- [x] StatusBar with compact info display (23 tests)
- [x] FocusIndicator for accessibility (19 tests)

**Success Criteria:**
- [x] Full keyboard navigation
- [x] Skip links and focus traps for accessibility
- [x] High contrast mode support
- [x] 139 tests passing

---

---

## Milestone: v1.3 - Architecture & Review Commands

Add architecture-level operations: multi-LLM code review with consensus, systematic refactoring, architecture analysis, and microservice support.

### Phase 20: Multi-LLM Infrastructure [x]

**Goal:** Create adapter system for multiple AI models with budget tracking.

**Deliverables:**
- [x] Model adapter interface (Claude, OpenAI, DeepSeek)
- [x] OpenAI budget and rate limiting
- [x] Consensus engine for multi-model reviews
- [x] Usage tracking persistence

**Models:**
- Claude: claude-opus-4-5-20251101 (Opus 4.5)
- OpenAI: o3
- DeepSeek: deepseek-r1

**Test Progress:**
- base-adapter: 9 tests
- claude-adapter: 19 tests
- openai-adapter: 23 tests
- deepseek-adapter: 20 tests
- budget-tracker: 13 tests
- consensus-engine: 9 tests
- Total: 93 new tests

**Success Criteria:**
- [x] All adapters return standardized response format
- [x] Budget limits enforced (daily/monthly)
- [x] Reviews run in parallel across models
- [x] Graceful fallback when models fail

---

### Phase 21: Review Command [x]

**Goal:** Multi-LLM code review with consensus reporting.

**Deliverables:**
- [x] `/tlc:review` command
- [x] Review report generator (markdown, JSON, HTML)
- [x] Confidence scoring based on model agreement
- [x] Cost tracking per review

**Test Progress:**
- review-reporter: 29 tests
- file-collector: 35 tests
- review-orchestrator: 20 tests
- review-command: 32 tests
- Total: 116 new tests

**Success Criteria:**
- [x] Reviews single file, directory, or full codebase
- [x] Shows agreement percentage
- [x] Respects .tlcignore patterns
- [x] Skips models over budget

---

### Phase 22: Refactor Command [x]

**Goal:** Systematic codebase refactoring with safety.

**Deliverables:**
- [x] `/tlc:refactor --analyze` - find opportunities
- [x] `/tlc:refactor --plan` - generate phased plan
- [x] `/tlc:refactor --execute` - apply with tests
- [x] Checkpoint and rollback system

**Test Progress:**
- ast-analyzer: 23 tests
- duplication-detector: 15 tests
- semantic-analyzer: 14 tests
- impact-scorer: 15 tests
- checkpoint-manager: 20 tests
- refactor-executor: 9 tests
- refactor-reporter: 17 tests
- candidates-tracker: 10 tests
- refactor-progress: 14 tests
- refactor-command: 15 tests
- refactor-observer: 17 tests
- Total: 169 new tests (1977 total)

**Success Criteria:**
- [x] Detects duplication, complexity, long methods
- [x] Creates checkpoint before changes
- [x] Generates tests for changed code
- [x] Auto-rollback on test failure

---

### Phase 23: Architecture Commands [x]

**Goal:** Architecture analysis and microservice conversion.

**Deliverables:**
- [x] `/tlc:architecture` - analyze current state
- [x] `/tlc:architecture --boundaries` - suggest services
- [x] `/tlc:convert microservice` - conversion plan
- [x] Dependency graph generation (Mermaid)

**Test Progress:**
- dependency-graph: 22 tests
- coupling-calculator: 19 tests
- cohesion-analyzer: 15 tests
- circular-detector: 16 tests
- mermaid-generator: 16 tests
- boundary-detector: 13 tests
- architecture-command: 33 tests
- conversion-planner: 19 tests
- service-scaffold: 20 tests
- convert-command: 30 tests
- Total: 203 new tests (2180 total)

**Success Criteria:**
- [x] Calculates coupling/cohesion metrics
- [x] Detects circular dependencies
- [x] Generates service scaffolds with API contracts
- [x] Creates migration tests for service extraction

---

### Phase 24: Microservice Templates [x]

**Goal:** Greenfield microservice project scaffolding.

**Deliverables:**
- [x] `/tlc:new-project --architecture microservice`
- [x] Service mesh config (Traefik)
- [x] Shared kernel structure
- [x] Inter-service messaging patterns

**Test Progress:**
- microservice-template: 18 tests
- traefik-config: 23 tests
- shared-kernel: 26 tests
- messaging-patterns: 19 tests
- contract-testing: 32 tests
- example-service: 29 tests
- new-project-microservice: 36 tests
- Total: 183 new tests (2363 total)

**Success Criteria:**
- [x] Complete docker-compose with all services
- [x] API gateway configured
- [x] Contract testing enabled
- [x] Example service included

---

### Phase 25: Usage Dashboard [x]

**Goal:** Budget and usage visibility.

**Deliverables:**
- [x] `/tlc:usage` command
- [x] Usage history (7-day rolling)
- [x] Budget alerts at threshold
- [x] Admin reset capability
- [x] Dashboard UsagePane component

**Test Progress:**
- usage-history: 14 tests
- usage-formatter: 23 tests
- budget-alerts: 21 tests
- usage-command: 25 tests
- UsagePane: 15 tests
- Total: 98 new tests (3881 total)

**Success Criteria:**
- [x] Shows daily/monthly spend per model
- [x] Alerts at configured threshold (50%, 80%, 100%)
- [x] Usage persists across sessions
- [x] Visual progress bars in dashboard

---

---

## Milestone: v1.4 - Enterprise Features

Enterprise-grade capabilities for large teams and compliance requirements.

### Phase 26: Multi-Repo Support [x]

**Goal:** Manage multiple repositories as a unified project.

**Deliverables:**
- [x] `/tlc:workspace` command for multi-repo management
- [x] Cross-repo dependency tracking
- [x] Unified test runs across repos
- [x] Shared memory across workspace
- [x] Dashboard workspace view

**Test Progress:**
- workspace-config: 23 tests
- bulk-repo-init: 24 tests
- workspace-scanner: 25 tests
- repo-dependency-tracker: 19 tests
- workspace-test-runner: 17 tests
- workspace-memory: 19 tests
- workspace-command: 18 tests
- WorkspacePane: 9 tests
- Total: 154 new tests

**Success Criteria:**
- [x] Add/remove repos from workspace
- [x] Run tests across all repos
- [x] Track dependencies between repos
- [x] Single dashboard for entire workspace

---

### Phase 27: Workspace Documentation [x]

**Goal:** Auto-generate documentation for multi-repo workspaces.

**Deliverables:**
- [x] Per-repo README generation
- [x] Cross-repo flow diagrams (data flow, API chains)
- [x] "What does this repo do" summaries
- [x] Architecture decision records (ADRs)
- [x] Mermaid diagrams for service interactions
- [x] `/tlc:workspace --docs` command

**Test Progress:**
- readme-generator: 29 tests
- flow-diagram-generator: 18 tests
- service-summary: 34 tests
- adr-generator: 39 tests
- service-interaction-diagram: 27 tests
- workspace-docs-command: 51 tests
- WorkspaceDocsPane: 20 tests
- Total: 218 new tests

**Success Criteria:**
- [x] Each repo has generated README
- [x] Cross-repo dependencies visualized
- [x] Data flow between services documented
- [x] ADRs track architectural decisions

---

### Phase 28: Audit Logging [x]

**Goal:** Complete audit trail of all agent actions.

**Deliverables:**
- [ ] Audit log storage (append-only)
- [ ] Action classification (read, write, execute, etc.)
- [ ] User attribution (who triggered)
- [ ] Searchable audit queries
- [ ] Export to SIEM formats

**Success Criteria:**
- [ ] Every file change logged with context
- [ ] Every command execution logged
- [ ] Logs tamper-evident (checksums)
- [ ] Export to JSON, CSV, Splunk format

---

### Phase 29: Zero-Data-Retention Mode [x]

**Goal:** Privacy-first mode that doesn't persist sensitive data.

**Deliverables:**
- [x] Ephemeral session mode (ephemeral-storage.js - 20 tests)
- [x] Auto-purge on session end (session-purge.js - 17 tests)
- [x] Configurable retention policies (retention-policy.js - 38 tests)
- [x] Sensitive data detection (sensitive-detector.js - 27 tests)
- [x] Memory exclusion patterns (memory-exclusion.js - 25 tests)
- [x] Zero-retention mode master switch (zero-retention.js - 18 tests)
- [x] Zero-retention CLI command (zero-retention-command.js - 31 tests)
- [x] Dashboard ZeroRetentionPane (ZeroRetentionPane.tsx - 12 tests)

**Test Progress:** 188 tests (8 tasks)

**Success Criteria:**
- [x] No data persists after session (ephemeral storage)
- [x] Secrets never written to disk (memory exclusion + sensitive detection)
- [x] Configurable per-project (.tlc.json support)

---

### Phase 30: SSO Integration [x]

**Goal:** Enterprise authentication with OAuth and SAML.

**Deliverables:**
- [x] OAuth 2.0 providers (oauth-registry.js - 25 tests, oauth-flow.js - 31 tests)
- [x] SAML 2.0 support (saml-provider.js - 46 tests)
- [x] Role mapping from IdP (role-mapper.js - 31 tests)
- [x] Session management (sso-session.js - 34 tests)
- [x] MFA support (mfa-handler.js - 49 tests)
- [x] Identity provider manager (idp-manager.js - 31 tests)
- [x] SSO CLI command (sso-command.js - 47 tests)
- [x] Dashboard SSOPane (SSOPane.tsx - 12 tests)

**Test Progress:** 337 tests (9 tasks)

**Success Criteria:**
- [x] Login via GitHub/Google works (OAuth flow with PKCE)
- [x] SAML IdP integration (AuthnRequest, Response validation)
- [x] Roles sync from provider (regex pattern matching, priority)
- [x] Session timeout configurable (concurrent limits, cleanup)

---

### Phase 31: Compliance Documentation [x]

**Goal:** SOC 2 and security compliance tooling.

**Deliverables:**
- [x] Security policy generator (security-policy-generator.js - 56 tests)
- [x] Access control documentation (access-control-doc.js - 48 tests)
- [x] Data flow diagrams (data-flow-doc.js - 31 tests)
- [x] Compliance checklist (compliance-checklist.js - 55 tests)
- [x] Evidence collection (evidence-collector.js - 61 tests)
- [x] Compliance reporter (compliance-reporter.js - 53 tests)
- [x] Compliance CLI command (compliance-command.js - 38 tests)
- [x] Dashboard CompliancePane (CompliancePane.tsx - 19 tests)

**Test Progress:** 361 tests (8 tasks)

**Success Criteria:**
- [x] Generate SOC 2 Type II evidence (evidence collector with hashing)
- [x] Document all data flows (Mermaid diagrams, sensitivity classification)
- [x] Track access permissions (user/role matrix, change history)
- [x] Exportable compliance reports (HTML, Markdown, JSON, CSV)

---

## Milestone: v1.5 - Advanced AI

Intelligent agent orchestration with model selection, cost optimization, and quality control.

### Phase 32: Agent Registry & Lifecycle [x]

**Goal:** Central registry for managing agent instances, their state, and lifecycle.

**Deliverables:**
- [x] Agent registry (register, list, get, remove agents)
- [x] Agent state machine (pending → running → completed/failed/cancelled)
- [x] Agent metadata (model, tokens, cost, duration)
- [x] Lifecycle hooks (onStart, onComplete, onError)
- [x] Agent persistence (resume after restart)
- [x] Agent cleanup (timeout, orphan detection)

**Success Criteria:**
- [x] All running agents tracked in registry
- [x] Agents can be cancelled mid-execution
- [x] State persisted across session restarts

**Tests:** 209 unit + 22 E2E = 231 total

---

### Phase 33: Model Router [x]

**Goal:** Intelligent routing of tasks to appropriate models based on complexity and cost.

**Deliverables:**
- [x] Provider interface (unified CLI/API adapter)
- [x] CLI detector (claude, codex, gemini detection)
- [x] CLI provider (execute CLI tools)
- [x] API provider (REST API backends)
- [x] Provider queue (task queuing with priorities)
- [x] Output schemas (JSON validation)
- [x] Model router (route to appropriate provider)
- [x] Router config (schema for .tlc.json)
- [x] Devserver router API (HTTP endpoints)
- [x] Router setup command (interactive config)

**Test Progress:**
- provider-interface: 16 tests
- cli-detector: 13 tests
- cli-provider: 10 tests
- api-provider: 10 tests
- provider-queue: 14 tests
- output-schemas: 10 tests
- model-router: 10 tests
- router-config: 9 tests
- devserver-router-api: 10 tests
- router-setup-command: 10 tests
- Total: 112 tests

**Success Criteria:**
- [x] Providers unified under single interface
- [x] CLI tools detected and executable
- [x] Tasks queued with priority handling
- [x] Router config in .tlc.json

---

### Phase 34: Cost Controller [x]

**Goal:** Budget management and cost optimization across all AI operations.

**Deliverables:**
- [x] Real-time cost tracking (per agent, per session, per day)
- [x] Budget limits (hard stop, soft warning)
- [x] Cost projections (estimate before execution)
- [x] Optimization suggestions (cheaper alternatives)
- [x] Cost reports (by model, by operation type)
- [x] `/tlc:cost` command (status, budget, report)
- [x] CostPane dashboard component

**Success Criteria:**
- [x] Never exceed configured budget
- [x] Users see cost before expensive operations
- [x] Historical cost data available

**Implementation:**
- cost-tracker.js: Real-time tracking per agent/session/day
- model-pricing.js: Pricing database for all models
- budget-limits.js: Daily/monthly budget enforcement
- cost-projections.js: Token estimation and cost projection
- cost-optimizer.js: Model recommendations
- cost-reports.js: Reports with trend analysis
- cost-command.js: CLI interface
- CostPane.tsx: Dashboard component

---

### Phase 35: Quality Gate [ ]

**Goal:** Ensure output quality meets thresholds before accepting results.

**Deliverables:**
- [ ] Quality scoring (code style, test coverage, completeness)
- [ ] Quality thresholds (per operation type)
- [ ] Auto-retry with better model on quality failure
- [ ] Quality history (track improvements over time)
- [ ] Quality presets (fast, balanced, thorough)
- [ ] `/tlc:quality-gate` command (configure, status)

**Success Criteria:**
- [ ] Low-quality outputs automatically retried
- [ ] Quality scores visible in dashboard
- [ ] Configurable per-project thresholds

---

### Phase 36: Agent Orchestration Dashboard [ ]

**Goal:** Visual UI for monitoring and controlling AI agents.

**Deliverables:**
- [ ] AgentList component (running, queued, completed)
- [ ] AgentDetail component (tokens, cost, logs, output)
- [ ] AgentControls (pause, resume, cancel, retry)
- [ ] CostMeter component (budget vs spent)
- [ ] ModelSelector component (override routing)
- [ ] QualityIndicator component (per-agent scores)

**Success Criteria:**
- [ ] Real-time agent status updates
- [ ] Cancel/retry agents from UI
- [ ] Cost visibility at a glance

---

### Phase 37: Orchestration Command [ ]

**Goal:** CLI for agent management and AI operations control.

**Deliverables:**
- [ ] `/tlc:agents` - list running/queued/completed agents
- [ ] `/tlc:agents cancel <id>` - cancel agent
- [ ] `/tlc:agents retry <id>` - retry failed agent
- [ ] `/tlc:agents logs <id>` - view agent output
- [ ] `/tlc:optimize` - suggest cost/quality optimizations
- [ ] Integration with existing TLC commands

**Success Criteria:**
- [ ] Full agent control from CLI
- [ ] Consistent with existing TLC UX
- [ ] Works alongside dashboard

---

### Phase 38: Dashboard Completion [x]

**Goal:** Complete Dashboard Refresh milestone by filling gaps from specification.

**Deliverables:**
- [x] Modal component (focus trap, ESC close, portal)
- [x] Dropdown component (keyboard nav, type-ahead, multi-select)
- [x] Toast component (variants, auto-dismiss, stacking)
- [x] Skeleton component (loading placeholders)
- [x] MobileNav component (bottom navigation for phones)
- [x] Zustand stores (ui, project, task, log)
- [x] Custom hooks (useWebSocket, useProjects, useTasks, useLogs, useTheme)
- [x] Accessibility audit (WCAG 2.1 AA)
- [x] Mobile responsiveness (tablet + phone)
- [x] Performance optimization (<2s load on 3G)

**Test Progress:**
- [x] Modal: 17 tests
- [x] Dropdown: 16 tests
- [x] Toast: 16 tests
- [x] Skeleton: 22 tests
- [x] MobileNav: 13 tests
- [x] Stores: 35 tests (uiStore + projectStore)
- [x] Hooks: 24 tests (useTheme + useWebSocket)
- [x] Accessibility: 17 tests
- [x] Responsiveness: 16 tests
- [x] Performance: 12 tests
- Total: 188 tests (actual)

**Success Criteria:**
- [x] New user can navigate without documentation
- [x] Works on tablet (PMs use iPads)
- [x] Real-time updates feel instant (<500ms perceived)
- [x] Loads in <2s on 3G connection
- [x] Accessibility: keyboard nav, proper contrast, screen reader friendly

---

### Phase 39: Functional Web Dashboard [x]

**Goal:** Transform web dashboard from UI shell into working application for PMs, QA, and clients.

**Problem:** Dashboard UI exists but doesn't work:
- APIs missing or return wrong format
- No way to CREATE tasks/bugs (only view)
- No client-facing mode for external users

**Deliverables:**
- [x] Fix /api/tasks format (flat array vs nested)
- [x] Add /api/health endpoint
- [x] Add /api/router/status endpoint
- [x] POST /api/tasks for creating tasks
- [x] Task creation form in dashboard
- [x] Enhanced bug form with screenshots
- [x] Project notes panel (view/edit PROJECT.md)
- [x] Client mode dashboard (/dashboard/client)
- [x] Fix all data binding issues
- [x] E2E integration tests

**Success Criteria:**
- [x] PM can create tasks via web GUI
- [x] QA can submit bugs with screenshots
- [x] Clients can report bugs without seeing code
- [x] All panels show real data from APIs

**Test Progress:**
- [ ] tasks-api: ~20 tests
- [ ] health-api: ~15 tests
- [ ] router-status-api: ~15 tests
- [ ] notes-api: ~15 tests
- [ ] dashboard-functional E2E: ~20 tests
- Total: ~120 tests

---

## Milestone: v2.0 - Dashboard Rebuild

Complete ground-up rebuild of TLC Dashboard. The previous dashboard (v1.2 phases 14-19) was a prototype that proved the concept but had fundamental issues: broken Docker deployments, missing API endpoints, dummy data in production, and inconsistent architecture.

**Key Requirement:** Docker images must be published to a registry to avoid npm global install issues.

### Phase 40: Design System Foundation [x]

**Goal:** Establish design tokens, core UI components, and layout system from scratch.

**Architecture:**
```
dashboard-web/
├── src/
│   ├── components/ui/       # Design system primitives
│   ├── components/layout/   # Shell, Sidebar, Header
│   ├── styles/tokens.css    # Design tokens
│   └── index.tsx            # Entry point
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── Dockerfile               # For registry publishing
```

**Deliverables:**
- [x] Design tokens (colors, spacing, typography, dark/light themes)
- [x] Core UI components (Button, Card, Badge, Input, Modal, Toast, Skeleton, Dropdown)
- [x] Layout components (Sidebar, Header, MobileNav, Shell)
- [x] Dockerfile for dashboard
- [ ] Publish to Docker registry (ghcr.io/jurgencalleja/tlc-dashboard)

**Test Progress:**
- Button: 16 tests
- Card: 18 tests
- Badge: 16 tests
- Input: 16 tests
- Modal: 13 tests
- Toast: 15 tests
- Skeleton: 21 tests
- Dropdown: 15 tests
- Sidebar: 13 tests
- Header: 15 tests
- Shell: 12 tests
- MobileNav: 12 tests
- Total: 182 tests

**Success Criteria:**
- [x] Theme switching works (dark default, light option)
- [x] Components accessible (keyboard nav, WCAG 2.1 AA contrast)
- [x] Mobile responsive (375px+)
- [ ] Docker image builds and runs

---

### Phase 41: Project Views [x]

**Goal:** Project cards, grid, and detail pages with real data.

**Deliverables:**
- [x] ProjectCard with status, tests, coverage
- [x] ProjectGrid with search/filter/sort
- [x] ProjectDetail with tabs (Overview, Tasks, Tests, Logs, Settings)
- [x] BranchSelector dropdown
- [ ] /api/project endpoint (real data from package.json, .tlc.json)

**Test Progress:**
- ProjectCard: 16 tests
- ProjectGrid: 16 tests
- ProjectDetail: 17 tests
- BranchSelector: 12 tests
- Total: 61 tests

**Success Criteria:**
- [x] Projects browsable and searchable
- [x] Empty state with getting started guide
- [x] Loading skeletons
- [x] Responsive grid (1/2/3 columns)

---

### Phase 42: Task Management [x]

**Goal:** Kanban board for task tracking with real data from PLAN.md files.

**Deliverables:**
- [x] TaskBoard with columns (To Do, In Progress, Done)
- [x] TaskCard with priority, assignee, test status
- [x] TaskDetail modal with activity, acceptance criteria
- [x] Drag and drop between columns
- [ ] /api/tasks endpoint (parses .planning/phases/*-PLAN.md) - deferred to API phase
- [ ] POST /api/tasks (creates tasks) - deferred to API phase

**Test Progress:**
- TaskCard: 14 tests
- TaskBoard: 16 tests
- TaskDetail: 13 tests
- TaskFilter: 11 tests
- Total: 54 tests

**Success Criteria:**
- [x] Keyboard-driven navigation (h/l/j/k)
- [x] Task claiming/release works

---

### Phase 43: Logs & Preview [x]

**Goal:** Log streaming and live app preview.

**Deliverables:**
- [x] LogStream with virtualized list (handles 10k+ entries)
- [x] LogSearch with match count and navigation
- [x] PreviewPanel with iframe and service selector
- [x] DeviceToggle (phone/tablet/desktop sizes)

**Test Progress:**
- LogStream: 14 tests
- LogSearch: 14 tests
- PreviewPanel: 17 tests
- Total: 45 tests

**Success Criteria:**
- [x] Auto-scroll with pause on user scroll
- [x] Logs color-coded by level
- [x] Device sizes: 375px, 768px, 100%

---

### Phase 44: Team Features (VPS Only) [x]

**Goal:** Team presence and activity for VPS deployments.

**Deliverables:**
- [x] TeamPresence with online/offline/away/busy indicators
- [x] ActivityFeed with time grouping (Today, Yesterday, Earlier)
- [x] Activity types: commits, task claims, task completions, comments, reviews
- [x] EnvironmentBadge (local/vps/staging/production)
- [x] TeamPanel combining presence + activity with tabs
- [x] Feature toggle (hidden in local mode)

**Test Progress:**
- TeamPresence: 13 tests
- ActivityFeed: 11 tests
- EnvironmentBadge: 11 tests
- TeamPanel: 12 tests
- Total: 47 tests

**Success Criteria:**
- [x] Team members show online status
- [x] Features hidden when mode=local

---

### Phase 45: Settings & Polish [x]

**Goal:** Settings, keyboard shortcuts, final polish.

**Deliverables:**
- [x] SettingsPanel with .tlc.json editor and validation
- [x] ThemeToggle (dark/light/system)
- [x] CommandPalette with fuzzy search (Cmd+K)
- [x] KeyboardHelp modal with category grouping (? key)
- [x] ConnectionStatus indicator with retry
- [x] NotificationSettings with granular preferences

**Test Progress:**
- SettingsPanel: 8 tests
- ThemeToggle: 9 tests
- CommandPalette: 11 tests
- KeyboardHelp: 9 tests
- ConnectionStatus: 11 tests
- NotificationSettings: 8 tests
- Total: 56 tests

**Success Criteria:**
- [x] Full keyboard navigation
- [x] WebSocket connection indicator

---

### Phase 46: Docker & Deployment [x]

**Goal:** Production-ready Docker deployment.

**Deliverables:**
- [x] Multi-stage Dockerfile (build + nginx)
- [x] Docker Compose for complete stack
- [x] GitHub Actions workflow (publish step ready but commented)
- [x] Environment detection (local/vps/staging/production)
- [x] Feature flags per environment
- [ ] Publish to ghcr.io - deferred to v2.1 Production Deployment

**Test Progress:**
- Environment utilities: 15 tests
- Total: 15 tests

**Success Criteria:**
- [x] Docker image builds
- [x] Environment detection works

---

### Phase 47: QA Test Review [x]

**Goal:** Allow QA to review auto-generated E2E tests and verification tasks without code access.

**Workflow:**
```
Developer runs /tlc:verify
       ↓
System creates verification task
       ↓
Task auto-assigned to users with role=qa
       ↓
QA sees task in their dashboard queue
       ↓
QA completes verification (approve/reject/comment)
       ↓
Developer sees QA feedback
```

**Deliverables:**
- [x] QATaskQueue (pending verifications for QA users)
- [x] TestFileViewer (syntax-highlighted, read-only)
- [x] ArtifactViewer (screenshots, videos, traces)
- [x] TestReviewPanel (pending → approved / needs changes)
- [x] ScenarioRequestForm (QA suggests new tests)
- [ ] /api/qa/* endpoints - deferred to API phase
- [ ] Notification system - deferred to API phase

**Test Progress:**
- QATaskQueue: 10 tests
- TestFileViewer: 9 tests
- ArtifactViewer: 12 tests
- TestReviewPanel: 12 tests
- ScenarioRequestForm: 10 tests
- Total: 53 tests

**Success Criteria:**
- [x] QA can view all E2E tests in browser
- [x] QA can view Playwright artifacts
- [x] QA can approve tests or request changes
- [x] QA can suggest new test scenarios

---

---

**Dashboard v2.0 Complete!**
- Total: 517 component tests
- All UI components implemented with TDD
- Docker & environment detection ready
- API endpoints deferred to next phase

---

## Milestone: v2.1 - Secure Production Deployment

**Security-First Deployment** for teams without dedicated security/DevOps staff, plus enterprise k8s for teams with DevOps.

**Why Security-First:** Research shows 45% of AI-generated code contains security flaws, with XSS vulnerabilities in 86% of samples. TLC must generate secure code by default and enforce security at every deployment stage.

**References:**
- [OWASP Top 10 2025](https://owasp.org/Top10/2025/)
- [AI Code Security Risks](https://www.veracode.com/blog/ai-generated-code-security-risks/)
- [Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)

---

### Phase 48: Secure Code Generation [x]

**Goal:** Ensure TLC-generated code is secure by default, addressing OWASP Top 10 2025.

**Problem:** AI code generators produce vulnerable code:
- 45% contains security flaws
- Missing input validation by default
- XSS vulnerabilities in 86% of samples
- Iterative degradation (more bugs each iteration)

**Deliverables:**

**Input Validation (OWASP A03: Injection)**
- [x] Input sanitization templates for all user inputs
- [x] Parameterized query enforcement (no string concatenation)
- [x] Path traversal prevention (whitelist allowed paths)
- [x] Command injection prevention (no shell exec with user input)

**Output Encoding (OWASP A03: XSS)**
- [x] Context-aware output encoding (HTML, JS, URL, CSS)
- [x] Content Security Policy headers in all templates
- [x] Subresource Integrity (SRI) for external scripts

**Authentication (OWASP A07: Auth Failures)**
- [x] Secure password hashing (Argon2id, not bcrypt)
- [x] Rate limiting on auth endpoints (5 attempts/minute)
- [x] Account lockout after failed attempts
- [x] Secure session management (httpOnly, secure, sameSite)

**Access Control (OWASP A01: Broken Access Control)**
- [x] Default-deny access patterns
- [x] Object-level authorization checks
- [x] Function-level authorization checks
- [x] CORS whitelist (no wildcard origins)

**Cryptography (OWASP A02: Crypto Failures)**
- [x] No hardcoded secrets (detect and fail)
- [x] Secure random generation (crypto.randomBytes)
- [x] TLS 1.3 minimum for all connections
- [x] Key rotation support

**Error Handling**
- [x] No stack traces in production responses
- [x] Structured error logging (no sensitive data)
- [x] Graceful degradation patterns

**Implementation:**
- input-validator.js: sanitization, path/URL/email validation, SQL/command injection prevention (34 tests)
- output-encoder.js: HTML/JS/URL/CSS encoding, CSP headers, SRI hashes (31 tests)
- secure-auth.js: argon2id hashing, rate limiting, lockout, session config (24 tests)
- access-control.js: RBAC/ABAC, CORS, object/function-level auth (25 tests)
- crypto-patterns.js: secret detection, secure random, TLS, key rotation (24 tests)
- secure-errors.js: safe error handling, structured logging (32 tests)
- secure-code-command.js: CLI for scan/generate/fix/audit (68 tests)

**Test Coverage:** 238 tests

**Success Criteria:**
- [x] Generated code uses secure patterns
- [x] Hardcoded secrets detected
- [x] All user inputs validated before use
- [x] All outputs encoded for context

---

### Phase 49: Container Security Hardening [ ]

**Goal:** Production-grade container security following CIS Docker Benchmark.

**Reference:** [OWASP Docker Security](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)

**Deliverables:**

**Image Hardening**
- [ ] Minimal base images (Alpine/Distroless, not Ubuntu)
- [ ] Multi-stage builds (build deps not in final image)
- [ ] Non-root user in all containers (USER directive)
- [ ] No SUID/SGID binaries
- [ ] Image signing with Docker Content Trust (DCT)
- [ ] SBOM generation for each image

**Runtime Security**
- [ ] Drop all capabilities (`--cap-drop ALL`)
- [ ] Add only required caps (`--cap-add` whitelist)
- [ ] Read-only root filesystem (`--read-only`)
- [ ] No privileged containers (block `--privileged`)
- [ ] User namespace remapping enabled
- [ ] Seccomp profiles (default or custom)
- [ ] AppArmor/SELinux profiles

**Network Security**
- [ ] Custom bridge networks (no default bridge)
- [ ] Network segmentation per service
- [ ] No `--net=host` in production
- [ ] Internal DNS only for service discovery

**Secrets Management**
- [ ] Docker secrets (not env vars for sensitive data)
- [ ] No secrets in Dockerfiles or images
- [ ] Secret rotation support
- [ ] Vault/SOPS integration option

**Scanning & Compliance**
- [ ] Trivy vulnerability scanning in CI
- [ ] Block builds with critical/high CVEs
- [ ] CIS Docker Benchmark audit script
- [ ] Container drift detection

**Test Coverage:**
- [ ] Dockerfile linting rules (~25 tests)
- [ ] Runtime security checks (~30 tests)
- [ ] Network policy tests (~20 tests)
- [ ] Secrets handling tests (~15 tests)
- Total: ~90 tests

**Success Criteria:**
- [ ] All containers run as non-root
- [ ] No critical CVEs in production images
- [ ] Pass CIS Docker Benchmark Level 1
- [ ] Secrets never visible in logs/env

---

### Phase 50: Branch Deployment Strategy [x]

**Goal:** Differentiate deployment behavior with security gates at each tier.

**Branch Tiers:**
```
feature branches → feature-x.example.com  (auto-deploy, security scan)
dev branch       → dev.example.com        (auto-deploy, full scan)
stable branch    → stable.example.com     (manual deploy, approval required)
```

**Deliverables:**

**Branch Classification**
- [x] Branch tier detection (feature/dev/stable)
- [x] Tier-specific deployment rules in .tlc.json
- [x] Protected branch enforcement

**Security Gates per Tier**
- [x] Feature: SAST scan, dependency check
- [x] Dev: SAST + DAST scan, container scan
- [x] Stable: Full security suite + manual approval

**Deployment Controls**
- [x] `/tlc:deploy stable` with 2FA confirmation
- [x] Deployment approval workflow (GitHub/GitLab)
- [x] Rollback to any previous version
- [x] Blue-green deployment for stable
- [x] Deployment audit log (who, when, what)

**Rollback & Recovery**
- [x] Automatic rollback on health check failure
- [x] Database migration rollback support
- [x] State snapshot before deployment
- [x] Recovery playbook generation

**Test Coverage:**
- [x] Branch classification tests (18 tests)
- [x] Deployment rules tests (19 tests)
- [x] Security gate tests (23 tests)
- [x] Deployment approval tests (21 tests)
- [x] Deployment executor tests (17 tests)
- [x] Rollback manager tests (15 tests)
- [x] Deployment audit tests (18 tests)
- [x] Deploy command tests (17 tests)
- Total: 148 tests

**Success Criteria:**
- [x] Stable deployments require explicit approval
- [x] Failed security gates block deployment
- [x] Rollback completes in <2 minutes
- [x] Full audit trail for compliance

---

### Phase 51: Network Security & TLS [x]

**Goal:** A+ SSL Labs rating with defense-in-depth network security.

**Deliverables:**

**TLS Configuration**
- [ ] Let's Encrypt auto-renewal
- [ ] TLS 1.3 only (disable 1.2 for new deployments)
- [ ] Strong cipher suites (ECDHE, AES-GCM)
- [ ] OCSP stapling enabled
- [ ] CAA DNS records

**Security Headers**
- [ ] Content-Security-Policy (strict, no unsafe-inline)
- [ ] Strict-Transport-Security (max-age=31536000, includeSubDomains)
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] Referrer-Policy: strict-origin-when-cross-origin
- [ ] Permissions-Policy (disable unused APIs)
- [ ] Cross-Origin-Opener-Policy
- [ ] Cross-Origin-Embedder-Policy

**Rate Limiting & DDoS**
- [ ] Per-endpoint rate limits (configurable)
- [ ] IP-based throttling
- [ ] Fail2ban integration for VPS
- [ ] Cloudflare/CDN integration option
- [ ] Request size limits

**Firewall & Access**
- [ ] UFW auto-configuration (VPS)
- [ ] Network policies (k8s)
- [ ] IP allowlist for admin endpoints
- [ ] GeoIP blocking option

**Test Coverage:**
- [ ] TLS configuration tests (~20 tests)
- [ ] Header validation tests (~25 tests)
- [ ] Rate limiting tests (~20 tests)
- [ ] Firewall tests (~15 tests)
- Total: ~80 tests

**Success Criteria:**
- [ ] A+ on SSL Labs
- [ ] A+ on securityheaders.com
- [ ] Rate limiting prevents brute force
- [ ] No open ports except 80/443

---

### Phase 52: Health Monitoring & Incident Response [x]

**Goal:** Detect issues before users, respond systematically.

**Deliverables:**

**Health Checks**
- [ ] Liveness probes (is process running?)
- [ ] Readiness probes (can accept traffic?)
- [ ] Deep health checks (DB, cache, deps)
- [ ] Health endpoints don't leak info

**Monitoring**
- [ ] Uptime monitoring (1-minute intervals)
- [ ] Error rate tracking (4xx, 5xx)
- [ ] Response time percentiles (p50, p95, p99)
- [ ] Resource usage (CPU, memory, disk)
- [ ] Log aggregation with structured logging

**Alerting**
- [ ] PagerDuty/Opsgenie/Slack integration
- [ ] Alert severity levels (critical, warning, info)
- [ ] Alert deduplication
- [ ] On-call rotation support

**Incident Response**
- [ ] Incident timeline auto-generation
- [ ] Runbook templates
- [ ] Post-mortem template
- [ ] Status page (Statuspage.io or self-hosted)

**Security Monitoring**
- [ ] Failed auth attempt alerts
- [ ] Unusual traffic pattern detection
- [ ] Log-based anomaly detection
- [ ] SIEM export (JSON, CEF formats)

**Test Coverage:**
- [ ] Health check tests (~20 tests)
- [ ] Monitoring tests (~25 tests)
- [ ] Alerting tests (~20 tests)
- [ ] Incident response tests (~15 tests)
- Total: ~80 tests

**Success Criteria:**
- [ ] Alert within 60 seconds of outage
- [ ] 30-day metrics retention
- [ ] Public status page option
- [ ] Security events logged and alertable

---

### Phase 53: Monolith VPS Deployment [x]

**Goal:** Secure one-command deploy to single VPS.

**Target Users:** Solo devs, small teams, startups

**Deliverables:**

**Server Hardening**
- [ ] Ubuntu 22.04 LTS only (security updates)
- [ ] Automatic security updates enabled
- [ ] SSH key-only auth (disable password)
- [ ] SSH on non-standard port (optional)
- [ ] Fail2ban configured
- [ ] UFW firewall (only 80/443/SSH)

**Deployment**
- [ ] `/tlc:deploy vps` command
- [ ] Zero-downtime deployment (blue-green)
- [ ] Caddy reverse proxy (auto-TLS)
- [ ] Docker Compose orchestration

**Data & Backups**
- [ ] PostgreSQL with encrypted connections
- [ ] Redis with auth enabled
- [ ] Daily encrypted backups to S3/B2
- [ ] Backup verification tests
- [ ] Point-in-time recovery option

**Secrets**
- [ ] Secrets stored in `/etc/tlc/secrets`
- [ ] 600 permissions, root-owned
- [ ] Encrypted at rest option (LUKS)
- [ ] No secrets in git or env vars

**Test Coverage:**
- [ ] Server hardening tests (~20 tests)
- [ ] Deployment tests (~25 tests)
- [ ] Backup/restore tests (~20 tests)
- [ ] Secrets management tests (~15 tests)
- Total: ~80 tests

**Success Criteria:**
- [ ] New VPS → production in <15 minutes
- [ ] Pass Lynis security audit (score >80)
- [ ] Automated daily backups verified
- [ ] SSH key rotation supported

---

### Phase 54: Kubernetes Deployment [x]

**Goal:** Enterprise-grade k8s with Pod Security Standards.

**Target Users:** Companies with k8s clusters, DevOps teams

**Deliverables:**

**Pod Security**
- [ ] Pod Security Standards: restricted
- [ ] No privileged pods
- [ ] No host namespaces
- [ ] Read-only root filesystem
- [ ] Non-root containers
- [ ] Seccomp: RuntimeDefault

**Network Policies**
- [ ] Default deny all ingress/egress
- [ ] Explicit allow rules per service
- [ ] Namespace isolation
- [ ] Egress filtering (no arbitrary internet)

**RBAC & Secrets**
- [ ] Minimal service accounts
- [ ] No cluster-admin for apps
- [ ] Secrets encryption at rest (KMS)
- [ ] External Secrets Operator support
- [ ] Vault integration option

**Resource Management**
- [ ] Resource requests and limits
- [ ] Horizontal Pod Autoscaler
- [ ] Pod Disruption Budgets
- [ ] Priority classes

**Deployment Artifacts**
- [ ] Helm chart with security defaults
- [ ] Kustomize overlays (dev/staging/prod)
- [ ] GitOps ready (ArgoCD/Flux)
- [ ] `/tlc:deploy k8s` command

**Test Coverage:**
- [ ] Pod security tests (~25 tests)
- [ ] Network policy tests (~20 tests)
- [ ] RBAC tests (~20 tests)
- [ ] Deployment tests (~25 tests)
- Total: ~90 tests

**Success Criteria:**
- [ ] Pass kube-bench CIS benchmark
- [ ] Works with GKE, EKS, AKS
- [ ] Zero-downtime rolling updates
- [ ] Pod Security Standards: restricted enforced

---

### Phase 55: Continuous Security Testing [x]

**Goal:** Security testing integrated into every PR and deployment.

**Deliverables:**

**Static Analysis (SAST)**
- [ ] Semgrep rules for OWASP Top 10
- [ ] Custom rules for TLC patterns
- [ ] Pre-commit hooks option
- [ ] PR comments with findings

**Dynamic Analysis (DAST)**
- [ ] OWASP ZAP baseline scan
- [ ] OWASP ZAP full scan (nightly)
- [ ] API security testing
- [ ] Authenticated scanning

**Dependency Scanning (SCA)**
- [ ] npm audit / pip-audit integration
- [ ] Snyk or Trivy for dependencies
- [ ] License compliance checking
- [ ] SBOM generation

**Secret Scanning**
- [ ] GitLeaks integration
- [ ] Pre-commit secret detection
- [ ] Historical scan option
- [ ] Custom pattern support

**Penetration Testing**
- [ ] Nuclei scanner integration
- [ ] Custom nuclei templates
- [ ] SQL injection testing
- [ ] XSS testing
- [ ] Auth bypass testing
- [ ] IDOR testing

**Reporting & Gates**
- [ ] Security report generation (HTML, JSON)
- [ ] Block merge on critical findings
- [ ] Block deploy on high+ findings
- [ ] `/tlc:security scan` command
- [ ] Dashboard SecurityPane

**Test Coverage:**
- [ ] SAST integration tests (~20 tests)
- [ ] DAST integration tests (~20 tests)
- [ ] SCA integration tests (~15 tests)
- [ ] Secret scanning tests (~15 tests)
- [ ] Pentest integration tests (~20 tests)
- Total: ~90 tests

**Success Criteria:**
- [ ] Every PR scanned before merge
- [ ] Critical findings block CI
- [ ] Monthly full pentest automation
- [ ] Security dashboard in TLC

---

### Phase 56: Trust Centre & Multi-Framework Compliance [x]

**Goal:** Public-facing security transparency and enterprise compliance frameworks.

**Integration:** Builds on Phase 31 (SOC 2 tooling) - extends evidence collector and compliance reporter.

**Deliverables:**

**Trust Centre (Public Page)**
- [ ] Security overview page (practices, architecture)
- [ ] Certifications display (SOC 2, ISO 27001 badges)
- [ ] Compliance status dashboard
- [ ] Subprocessor list with DPA links
- [ ] Data residency information
- [ ] Incident history (public summary, not details)
- [ ] Security contact and responsible disclosure
- [ ] `/tlc:trust-centre generate` command

**Multi-Framework Checklists**
- [ ] PCI DSS v4.0 checklist (12 requirements)
- [ ] HIPAA checklist (Administrative, Physical, Technical safeguards)
- [ ] ISO 27001:2022 checklist (Annex A controls)
- [ ] GDPR checklist (Articles 5, 6, 7, 12-22, 25, 32-34)
- [ ] Framework selection in .tlc.json

**Evidence Integration**
- [ ] Security scan results → Evidence collector
- [ ] Deployment audit logs → Evidence collector
- [ ] Access reviews → Evidence collector
- [ ] Penetration test reports → Evidence collector
- [ ] Auto-link evidence to controls across frameworks

**Reporting**
- [ ] Multi-framework readiness report
- [ ] Gap analysis across frameworks
- [ ] Control mapping (SOC 2 ↔ ISO 27001 ↔ PCI)
- [ ] Auditor export packages

**Dashboard**
- [ ] TrustCentrePane component
- [ ] Framework selector
- [ ] Cross-framework coverage view

**Test Coverage:**
- [ ] Trust Centre generation (~25 tests)
- [ ] PCI DSS checklist (~30 tests)
- [ ] HIPAA checklist (~25 tests)
- [ ] ISO 27001 checklist (~30 tests)
- [ ] GDPR checklist (~20 tests)
- [ ] Evidence integration (~20 tests)
- [ ] Multi-framework reporting (~25 tests)
- Total: ~175 tests

**Success Criteria:**
- [ ] Trust Centre page deployable as static site
- [ ] All 4 frameworks have complete checklists
- [ ] Evidence auto-links to relevant controls
- [ ] Single audit package covers multiple frameworks

---

**v2.1 Summary:**

| Phase | Focus | Tests |
|-------|-------|-------|
| 48 | Secure Code Generation | ~90 |
| 49 | Container Security | ~90 |
| 50 | Branch Deployment | ~80 |
| 51 | Network Security & TLS | ~80 |
| 52 | Health Monitoring | ~80 |
| 53 | Monolith VPS | ~80 |
| 54 | Kubernetes | ~90 |
| 55 | Continuous Security Testing | ~90 |
| 56 | Trust Centre & Multi-Framework | ~175 |
| **Total** | | **~855** |

**Key Security Guarantees:**
- A+ SSL Labs rating
- Pass CIS Docker Benchmark Level 1
- Pass kube-bench CIS Kubernetes Benchmark
- OWASP ZAP baseline scan pass
- No critical CVEs in production
- All secrets encrypted, never in code
- Full audit trail for compliance

---

## Milestone: v2.2 - Developer Experience

### Phase 57: Coding Standards Injection [x]

**Goal:** Automatic coding standards enforcement for all TLC projects.

**Deliverables:**
- [x] CLAUDE.md template with code quality rules
- [x] CODING-STANDARDS.md template (entity-based modules, no magic strings)
- [x] Standards injector module (create/append on init)
- [x] `/tlc:audit` command - check compliance, generate report
- [x] `/tlc:cleanup` command - auto-fix all issues with commits
- [x] `/tlc:refactor` command - step-by-step with previews/checkpoints

**Standards Enforced:**
- Entity-based module structure (`src/{entity}/` not flat `services/`)
- No inline interfaces in services
- No hardcoded URLs/ports (use environment)
- No magic strings (use constants)
- JSDoc on all public functions
- Path alias imports (no deep `../../../`)

**Test Progress:**
- 77 tests (standards-injector, audit-checker, cleanup-executor, refactor-stepper)

**Success Criteria:**
- [x] Standards files created on `tlc init`
- [x] Audit detects all architectural violations
- [x] Cleanup fixes issues automatically
- [x] Refactor allows step-by-step review

---

## Milestone: v2.2 (continued) - Design Studio

LiteLLM integration for unified LLM access + Gemini-powered design-to-code workflow.

### Phase 58: LiteLLM Gateway [x]

**Goal:** Centralized LLM access through LiteLLM proxy for unified API, cost tracking, and model switching.

**Why LiteLLM:**
- Single API for Claude, OpenAI, Gemini, DeepSeek, Ollama
- Built-in usage tracking and spend limits
- Load balancing and fallback
- Caching to reduce costs
- No vendor lock-in

**Deliverables:**
- [x] LiteLLM Docker service configuration
- [x] Model alias configuration (map logical names to providers)
- [x] Fallback chains (primary → secondary → tertiary)
- [x] Spend limits per model/user
- [x] Usage dashboard integration
- [x] `/tlc:llm config` command
- [x] `/tlc:llm status` command
- [x] `/tlc:llm models` command

**Implementation:**
- litellm-config.js: Configuration with model aliases, fallbacks, spend limits
- litellm-client.js: Client for proxy (completion, chat, usage, health)
- litellm-command.js: CLI commands (config, status, models, test)

**Test Coverage:** 50 tests

**Success Criteria:**
- [x] All TLC AI operations route through LiteLLM
- [x] Transparent model switching without code changes
- [x] Cost tracking unified across providers
- [x] Fallback works when primary model fails

---

### Phase 59: Gemini Vision Integration [x]

**Goal:** Use Gemini 2.0 Flash for visual understanding - screenshots, mockups, design analysis.

**Why Gemini:**
- Best-in-class vision capabilities
- Fast inference (Flash model)
- Cost-effective for high-volume visual tasks
- Native multimodal (no separate vision API)

**Deliverables:**
- [x] Gemini adapter for LiteLLM
- [x] Screenshot analysis (describe UI, find issues)
- [x] Design comparison (before/after diff)
- [x] Accessibility audit from screenshots
- [x] Component extraction from mockups
- [x] `/tlc:vision analyze <image>` command
- [x] `/tlc:vision compare <before> <after>` command
- [x] `/tlc:vision a11y <image>` command

**Implementation:**
- gemini-vision.js: Visual analysis (analyze, compare, extract, audit, describe, findIssues)
- vision-command.js: CLI interface for all vision operations

**Test Coverage:** 34 tests

**Success Criteria:**
- [x] Analyze screenshot and describe UI elements
- [x] Identify visual regressions between versions
- [x] Detect accessibility issues (contrast, touch targets)

---

### Phase 60: Design-to-Code Pipeline [x]

**Goal:** Convert design mockups (Figma exports, screenshots) to working code.

**Workflow:**
```
Designer uploads mockup (PNG/Figma)
       ↓
Gemini Vision analyzes layout, components, colors
       ↓
Claude generates React/Vue/HTML code
       ↓
Developer reviews and iterates
       ↓
Code committed with design reference
```

**Deliverables:**
- [x] Mockup parser (extract components, layout, colors)
- [x] Design token extractor (colors, spacing, typography)
- [x] Component mapper (mockup element → UI library component)
- [x] Code generator (React, Vue, HTML/Tailwind)
- [x] Design reference linking (comment with mockup source)
- [x] Iteration feedback loop (show generated vs mockup)
- [x] `/tlc:design import <mockup>` command
- [x] `/tlc:design generate <mockup>` command
- [x] `/tlc:design iterate` command
- [ ] Dashboard DesignPane component

**Implementation:**
- design-parser.js: Extract design elements from mockups (layout, colors, typography, components)
- code-generator.js: Generate React/Vue/HTML/Tailwind code from design
- design-command.js: CLI for design workflow (import, generate, tokens, iterate)

**Test Coverage:** 57 tests

**Success Criteria:**
- [x] Generate working component from mockup
- [x] Extract accurate design tokens
- [x] Map to existing UI library components
- [ ] Side-by-side comparison in dashboard

---

### Phase 61: Visual Regression Testing [x]

**Goal:** Automated visual testing with AI-powered diff analysis.

**Deliverables:**
- [x] Screenshot capture automation (configurable capture function)
- [x] Visual diff generation (AI-powered comparison)
- [x] AI-powered diff analysis (meaningful vs noise classification)
- [x] Baseline management (create, update, approve)
- [x] Test runner with pattern filtering
- [x] `/tlc:visual baseline` command
- [x] `/tlc:visual test` command
- [x] `/tlc:visual approve` command
- [x] `/tlc:visual list` command
- [x] `/tlc:visual run` command
- [ ] Dashboard VisualTestPane component
- [ ] CI integration (fail on visual regression)

**Implementation:**
- visual-testing.js: Core testing (capture, compare, baseline management, AI analysis)
- visual-command.js: CLI for visual testing (baseline, test, approve, list, run)

**Test Coverage:** 40 tests

**Success Criteria:**
- [x] Capture screenshots with configurable capture function
- [x] AI filters out meaningless diffs (severity classification)
- [x] Baseline management with metadata tracking
- [ ] Visual regressions block PR merge
- [ ] Easy baseline updates from dashboard

---

## Future Milestones (v3.x)

### v3.0 - Ecosystem
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
