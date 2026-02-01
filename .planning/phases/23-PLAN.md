# Phase 23: Architecture Commands - Plan

## Overview

Architecture analysis and microservice conversion tools. Provides dependency graphs, coupling/cohesion metrics, service boundary detection, and migration planning.

## Prerequisites

- [x] Phase 22: Refactor Command (AST analysis utilities)

## Tasks

### Task 1: Dependency Graph Builder [ ]

**Goal:** Build file dependency graph from import/require statements

**Files:**
- server/lib/dependency-graph.js
- server/lib/dependency-graph.test.js

**Acceptance Criteria:**
- [ ] Parse ES6 imports (import x from 'y')
- [ ] Parse CommonJS requires (const x = require('y'))
- [ ] Parse dynamic imports (import('x'))
- [ ] Resolve relative paths to absolute
- [ ] Handle node_modules (mark as external)
- [ ] Support TypeScript path aliases

**Test Cases:**
- Parses ES6 default import
- Parses ES6 named imports
- Parses CommonJS require
- Parses dynamic import
- Resolves relative paths
- Marks node_modules as external
- Handles circular references without infinite loop
- Supports tsconfig paths

---

### Task 2: Coupling Calculator [ ]

**Goal:** Calculate afferent and efferent coupling metrics

**Files:**
- server/lib/coupling-calculator.js
- server/lib/coupling-calculator.test.js

**Acceptance Criteria:**
- [ ] Calculate afferent coupling (files that depend on this file)
- [ ] Calculate efferent coupling (files this file depends on)
- [ ] Calculate instability (Ce / (Ca + Ce))
- [ ] Identify highly coupled modules
- [ ] Generate coupling matrix

**Test Cases:**
- Calculates afferent coupling correctly
- Calculates efferent coupling correctly
- Calculates instability ratio
- Identifies hub files (high afferent)
- Identifies dependent files (high efferent)
- Handles isolated files (no coupling)

---

### Task 3: Cohesion Analyzer [ ]

**Goal:** Measure how related files within a module are

**Files:**
- server/lib/cohesion-analyzer.js
- server/lib/cohesion-analyzer.test.js

**Acceptance Criteria:**
- [ ] Group files by directory
- [ ] Calculate internal vs external dependencies
- [ ] Score cohesion (0-1, higher = more cohesive)
- [ ] Identify low-cohesion modules
- [ ] Suggest file moves for better cohesion

**Test Cases:**
- Groups files by directory correctly
- High cohesion when files only import each other
- Low cohesion when files mostly import external
- Suggests moving outlier files
- Handles single-file modules

---

### Task 4: Circular Dependency Detector [ ]

**Goal:** Find and report dependency cycles

**Files:**
- server/lib/circular-detector.js
- server/lib/circular-detector.test.js

**Acceptance Criteria:**
- [ ] Detect direct circular dependencies (A → B → A)
- [ ] Detect indirect cycles (A → B → C → A)
- [ ] Report all cycles found
- [ ] Suggest breaking points
- [ ] Visualize cycles in output

**Test Cases:**
- Detects direct A → B → A cycle
- Detects indirect A → B → C → A cycle
- Finds multiple cycles
- Reports cycle paths clearly
- Suggests file to break cycle
- No false positives on DAGs

---

### Task 5: Mermaid Diagram Generator [ ]

**Goal:** Generate Mermaid diagrams from dependency data

**Files:**
- server/lib/mermaid-generator.js
- server/lib/mermaid-generator.test.js

**Acceptance Criteria:**
- [ ] Generate flowchart from dependency graph
- [ ] Generate subgraphs for directories/modules
- [ ] Highlight circular dependencies in red
- [ ] Highlight high-coupling nodes
- [ ] Support filtering by module
- [ ] Valid Mermaid syntax output

**Test Cases:**
- Generates valid flowchart syntax
- Creates subgraphs for directories
- Highlights cycles with red styling
- Filters to specific module
- Handles large graphs (truncation)
- Escapes special characters in filenames

---

### Task 6: Service Boundary Detector [ ]

**Goal:** Identify natural service boundaries using clustering

**Files:**
- server/lib/boundary-detector.js
- server/lib/boundary-detector.test.js

**Acceptance Criteria:**
- [ ] Cluster files by shared dependencies
- [ ] Detect bounded contexts (user, auth, etc.)
- [ ] Score boundary quality
- [ ] Suggest service splits
- [ ] Identify shared kernel (common code)

**Test Cases:**
- Clusters related files together
- Detects obvious boundaries (auth/, users/)
- Identifies shared utilities
- Scores boundary on coupling
- Handles overlapping concerns

---

### Task 7: Architecture Command [ ]

**Goal:** Main `/tlc:architecture` command orchestrating analysis

**Files:**
- server/lib/architecture-command.js
- server/lib/architecture-command.test.js

**Acceptance Criteria:**
- [ ] `--analyze` runs full architecture analysis
- [ ] `--boundaries` suggests service boundaries
- [ ] `--diagram` outputs Mermaid graph
- [ ] `--metrics` outputs coupling/cohesion scores
- [ ] `--circular` finds dependency cycles
- [ ] Path targeting for specific modules

**Test Cases:**
- --analyze produces full report
- --boundaries lists suggested services
- --diagram outputs valid Mermaid
- --metrics shows coupling matrix
- --circular lists all cycles
- Path targeting limits scope

---

### Task 8: Conversion Planner [ ]

**Goal:** Generate microservice conversion plan

**Files:**
- server/lib/conversion-planner.js
- server/lib/conversion-planner.test.js

**Acceptance Criteria:**
- [ ] Generate phased extraction plan
- [ ] Order by dependency (extract leaves first)
- [ ] Create API contracts between services
- [ ] Generate migration tests
- [ ] Estimate effort per service

**Test Cases:**
- Orders extraction by dependencies
- Generates API contract stubs
- Creates migration test templates
- Estimates based on file count
- Handles circular dependencies in plan

---

### Task 9: Service Scaffold Generator [ ]

**Goal:** Generate service boilerplate from extraction plan

**Files:**
- server/lib/service-scaffold.js
- server/lib/service-scaffold.test.js

**Acceptance Criteria:**
- [ ] Generate service directory structure
- [ ] Create package.json with dependencies
- [ ] Create Dockerfile
- [ ] Create docker-compose entry
- [ ] Generate API client for consumers

**Test Cases:**
- Creates service directory
- Package.json has correct deps
- Dockerfile follows best practices
- Docker-compose has correct config
- API client matches contract

---

### Task 10: Convert Command [ ]

**Goal:** `/tlc:convert microservice` command

**Files:**
- server/lib/convert-command.js
- server/lib/convert-command.test.js

**Acceptance Criteria:**
- [ ] `microservice` generates conversion plan
- [ ] `--service NAME` extracts specific service
- [ ] `--dry-run` shows what would happen
- [ ] `--scaffold` generates service boilerplate
- [ ] Interactive confirmation for changes

**Test Cases:**
- microservice generates full plan
- --service extracts single service
- --dry-run doesn't modify files
- --scaffold creates directories
- Confirms before destructive changes

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | Needs dependency graph |
| 3 | 1 | Needs dependency graph |
| 4 | 1 | Needs dependency graph |
| 5 | 1, 4 | Needs graph + cycles |
| 6 | 2, 3 | Needs coupling + cohesion |
| 7 | 1-6 | Orchestrates all |
| 8 | 6 | Needs boundaries |
| 9 | 8 | Needs plan |
| 10 | 7, 8, 9 | Orchestrates conversion |

**Parallel Groups:**
- Group A: Task 1 (foundation)
- Group B: Tasks 2, 3, 4 (after 1, independent)
- Group C: Tasks 5, 6 (after Group B)
- Group D: Task 7 (after all analysis)
- Group E: Task 8 (after 6)
- Group F: Task 9 (after 8)
- Group G: Task 10 (final orchestrator)

## Estimated Scope

- Tasks: 10
- Files: 20 (10 modules + 10 test files)
- Tests: ~200 (estimated 20 per module)
