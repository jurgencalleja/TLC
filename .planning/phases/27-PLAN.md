# Phase 27: Workspace Documentation - Plan

## Overview

Auto-generate comprehensive documentation for multi-repo workspaces. Each repo gets a README, cross-repo dependencies are visualized with flow diagrams, and Architecture Decision Records (ADRs) track key decisions.

## Prerequisites

- [x] Phase 26 complete (workspace infrastructure)
- [x] Workspace config and scanner available
- [x] Dependency tracker available

## Tasks

### Task 1: Repo README Generator [ ]

**Goal:** Generate README.md for each repo based on its characteristics

**Files:**
- server/lib/readme-generator.js
- server/lib/readme-generator.test.js

**Acceptance Criteria:**
- [ ] Extracts project name, description from package.json
- [ ] Detects and documents scripts (build, test, start)
- [ ] Lists dependencies (runtime and dev)
- [ ] Documents environment variables from .env.example
- [ ] Includes installation instructions
- [ ] Documents API endpoints (if detected)

**Test Cases:**
- Generates README with project name and description
- Includes npm scripts documentation
- Lists key dependencies
- Documents env vars from .env.example
- Includes installation section
- Skips sections with no content
- Formats markdown correctly

---

### Task 2: Cross-Repo Flow Diagram Generator [ ]

**Goal:** Generate Mermaid diagrams showing data flow between repos

**Files:**
- server/lib/flow-diagram-generator.js
- server/lib/flow-diagram-generator.test.js

**Acceptance Criteria:**
- [ ] Parses import statements to find cross-repo imports
- [ ] Detects API calls between services (fetch, axios, http)
- [ ] Detects message queue producers/consumers
- [ ] Detects database access patterns
- [ ] Generates Mermaid flowchart

**Test Cases:**
- Detects workspace:* imports between repos
- Detects HTTP calls to other services
- Detects message queue patterns (publish/subscribe)
- Generates valid Mermaid syntax
- Groups nodes by repo
- Shows direction of data flow
- Handles repos with no cross-repo communication

---

### Task 3: Service Summary Generator [ ]

**Goal:** Generate "What does this repo do" one-pager

**Files:**
- server/lib/service-summary.js
- server/lib/service-summary.test.js

**Acceptance Criteria:**
- [ ] Analyzes file structure to infer purpose
- [ ] Extracts description from package.json/README
- [ ] Identifies main entry points
- [ ] Lists exposed APIs/exports
- [ ] Identifies consumers (other repos that depend on this)
- [ ] Identifies dependencies (repos this depends on)

**Test Cases:**
- Extracts purpose from package.json description
- Identifies main entry point (index.js, main.ts)
- Lists exported functions/classes
- Shows consumer repos
- Shows dependency repos
- Generates markdown summary
- Handles repo with minimal info

---

### Task 4: Architecture Decision Records (ADR) Generator [ ]

**Goal:** Create and manage ADR documents

**Files:**
- server/lib/adr-generator.js
- server/lib/adr-generator.test.js

**Acceptance Criteria:**
- [ ] ADR template with standard sections (Context, Decision, Consequences)
- [ ] Auto-number ADRs (0001, 0002, etc.)
- [ ] Extract decisions from workspace memory
- [ ] ADR index generator
- [ ] Date and status tracking (proposed, accepted, deprecated)

**Test Cases:**
- Creates ADR with standard template
- Auto-numbers ADRs sequentially
- Extracts architectural decisions from memory
- Generates ADR index (list of all ADRs)
- Updates ADR status
- Stores ADRs in .planning/adr/ directory

---

### Task 5: Service Interaction Diagram Generator [ ]

**Goal:** Generate detailed service interaction diagrams

**Files:**
- server/lib/service-interaction-diagram.js
- server/lib/service-interaction-diagram.test.js

**Acceptance Criteria:**
- [ ] Sequence diagrams for API call chains
- [ ] Component diagrams showing service boundaries
- [ ] Deployment diagrams showing infrastructure
- [ ] Database entity relationship diagrams (from ORM)

**Test Cases:**
- Generates sequence diagram for API flow
- Generates component diagram with services
- Generates deployment diagram from docker-compose
- Generates ER diagram from schema files
- All diagrams valid Mermaid syntax
- Handles missing infrastructure config

---

### Task 6: Workspace Docs Command [ ]

**Goal:** `/tlc:workspace --docs` CLI integration

**Files:**
- server/lib/workspace-docs-command.js
- server/lib/workspace-docs-command.test.js

**Acceptance Criteria:**
- [ ] `--docs readme` - generate READMEs for all repos
- [ ] `--docs flow` - generate cross-repo flow diagrams
- [ ] `--docs summary` - generate service summaries
- [ ] `--docs adr` - create new ADR or list existing
- [ ] `--docs all` - generate all documentation
- [ ] `--output <dir>` - specify output directory

**Test Cases:**
- Generates READMEs for all workspace repos
- Generates flow diagrams
- Generates service summaries
- Creates new ADR with prompts
- Lists existing ADRs
- Generates all docs at once
- Respects output directory option
- Handles empty workspace

---

### Task 7: Docs Integration with Dashboard [ ]

**Goal:** View generated docs in dashboard

**Files:**
- dashboard/src/components/WorkspaceDocsPane.tsx
- dashboard/src/components/WorkspaceDocsPane.test.tsx

**Acceptance Criteria:**
- [ ] Shows list of generated docs
- [ ] Renders markdown content
- [ ] Renders Mermaid diagrams
- [ ] Links between related docs
- [ ] Refresh/regenerate button

**Test Cases:**
- Renders doc list
- Shows markdown content
- Renders Mermaid diagrams
- Shows loading state
- Shows empty state
- Handles doc refresh

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | Flow diagrams reference READMEs |
| 3 | 1, 2 | Summary includes refs to flow and readme |
| 5 | 2 | Service interactions extend flow diagrams |
| 6 | 1-5 | Command orchestrates all generators |
| 7 | 6 | Dashboard displays command output |

**Parallel groups:**
- Group A: Tasks 1, 4 (independent)
- Group B: Task 2 (after Task 1)
- Group C: Tasks 3, 5 (after Task 2)
- Group D: Task 6 (after Tasks 1-5)
- Group E: Task 7 (after Task 6)

## Estimated Scope

- Tasks: 7
- Files: 14 (7 implementations + 7 tests)
- Tests: ~120 estimated
