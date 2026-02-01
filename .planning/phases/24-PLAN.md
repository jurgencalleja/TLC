# Phase 24: Microservice Templates - Plan

## Overview

Greenfield microservice project scaffolding. Creates complete microservice architecture from scratch with API gateway, shared kernel, messaging, and contract testing.

## Prerequisites

- [x] Phase 23 complete (architecture analysis tools)
- [x] Service scaffold generator exists

## Tasks

### Task 1: Microservice Template Structure

**Goal:** Define base directory structure for microservice projects

**Files:**
- lib/microservice-template.js
- lib/microservice-template.test.js

**Acceptance Criteria:**
- [ ] Generates monorepo structure with services/, shared/, gateway/
- [ ] Creates root package.json with workspaces
- [ ] Creates root docker-compose.yml with all services
- [ ] Includes .env.example with service URLs
- [ ] Generates README with architecture diagram

**Test Cases:**
- Creates correct directory structure
- Root package.json has workspace configuration
- Docker-compose includes all generated services
- Environment template has all service URLs
- README includes Mermaid architecture diagram

---

### Task 2: Traefik Gateway Config

**Goal:** Generate Traefik API gateway configuration

**Files:**
- lib/traefik-config.js
- lib/traefik-config.test.js

**Acceptance Criteria:**
- [ ] Generates traefik.yml with entrypoints
- [ ] Creates dynamic routing config per service
- [ ] Supports path-based routing (/api/users → user-service)
- [ ] Includes health check endpoints
- [ ] Generates TLS configuration (optional)

**Test Cases:**
- Generates valid traefik.yml
- Routes /api/{service} to correct backend
- Health checks configured for each service
- Middleware for rate limiting included
- TLS config generated when enabled

---

### Task 3: Shared Kernel Generator

**Goal:** Create shared code structure between services

**Files:**
- lib/shared-kernel.js
- lib/shared-kernel.test.js

**Acceptance Criteria:**
- [ ] Generates shared/types/ for common interfaces
- [ ] Creates shared/contracts/ for API contracts
- [ ] Includes shared/events/ for event schemas
- [ ] Generates shared/utils/ for common utilities
- [ ] Creates package.json for shared module

**Test Cases:**
- Creates shared directory structure
- Type definitions are valid TypeScript
- Contract schemas are JSON Schema format
- Event schemas include metadata fields
- Shared module is publishable as npm package

---

### Task 4: Messaging Patterns

**Goal:** Inter-service communication setup

**Files:**
- lib/messaging-patterns.js
- lib/messaging-patterns.test.js

**Acceptance Criteria:**
- [ ] Generates event bus configuration (Redis pub/sub)
- [ ] Creates message publisher utility
- [ ] Creates message subscriber utility
- [ ] Includes dead letter queue config
- [ ] Generates event catalog with schemas

**Test Cases:**
- Event bus config connects to Redis
- Publisher serializes messages correctly
- Subscriber handles message deserialization
- Dead letter queue captures failed messages
- Event catalog lists all event types

---

### Task 5: Contract Testing Setup

**Goal:** Enable Pact-style contract testing between services

**Files:**
- lib/contract-testing.js
- lib/contract-testing.test.js

**Acceptance Criteria:**
- [ ] Generates consumer contract test template
- [ ] Generates provider verification test template
- [ ] Creates contract broker config (Pactflow or local)
- [ ] Includes CI workflow for contract verification
- [ ] Supports OpenAPI-based contracts

**Test Cases:**
- Consumer test template is valid test file
- Provider verification loads contracts
- Broker config supports local and cloud modes
- CI workflow runs on PR
- OpenAPI specs converted to contracts

---

### Task 6: Example Service Template

**Goal:** Complete working example service

**Files:**
- lib/example-service.js
- lib/example-service.test.js

**Acceptance Criteria:**
- [ ] Generates fully functional service (user-service example)
- [ ] Includes CRUD endpoints
- [ ] Has database migration setup
- [ ] Includes unit and integration tests
- [ ] Has Dockerfile and service-specific docker-compose

**Test Cases:**
- Service starts without errors
- CRUD endpoints return correct responses
- Database migrations run successfully
- Tests cover happy path and errors
- Docker build succeeds

---

### Task 7: New Project Microservice Command

**Goal:** Integrate with /tlc:new-project --architecture microservice

**Files:**
- lib/new-project-microservice.js
- lib/new-project-microservice.test.js

**Acceptance Criteria:**
- [ ] Extends existing new-project command
- [ ] Prompts for service names interactively
- [ ] Generates complete project structure
- [ ] Runs npm install in monorepo root
- [ ] Provides next steps instructions

**Test Cases:**
- --architecture microservice triggers microservice flow
- Interactive prompts collect service names
- All templates generated correctly
- Dependencies installed successfully
- Next steps shown after generation

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | Gateway needs base structure |
| 3 | 1 | Shared kernel is part of structure |
| 4 | 3 | Messaging uses shared event schemas |
| 5 | 3 | Contract testing uses shared contracts |
| 6 | 1, 2, 3, 4 | Example service uses all components |
| 7 | 1-6 | Command orchestrates all generators |

**Parallel groups:**
- Group A: Task 1 (foundation)
- Group B: Tasks 2, 3 (can work in parallel after Task 1)
- Group C: Tasks 4, 5 (can work in parallel after Task 3)
- Group D: Task 6 (after Groups B, C)
- Group E: Task 7 (after Task 6)

## Estimated Scope

- Tasks: 7
- Files: 14 (7 implementations + 7 tests)
- Tests: ~120 estimated
