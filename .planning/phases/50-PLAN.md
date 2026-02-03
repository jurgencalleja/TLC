# Phase 50: Branch Deployment Strategy - Plan

## Overview

Differentiate deployment behavior with security gates at each tier.

## Branch Tiers

```
feature branches → feature-x.example.com  (auto-deploy, security scan)
dev branch       → dev.example.com        (auto-deploy, full scan)
stable branch    → stable.example.com     (manual deploy, approval required)
```

## Tasks

### Task 1: Branch Classifier [ ]

**Goal:** Detect branch tier from name patterns

**File:** `server/lib/deploy/branch-classifier.js`

**Acceptance Criteria:**
- Classify branches as feature/dev/stable/unknown
- Support configurable patterns in .tlc.json
- Handle edge cases (main, master, release/*)

### Task 2: Deployment Rules [ ]

**Goal:** Load and validate tier-specific deployment rules

**File:** `server/lib/deploy/deployment-rules.js`

**Acceptance Criteria:**
- Load rules from .tlc.json
- Default rules when not configured
- Validate rule schema

### Task 3: Security Gates [ ]

**Goal:** Run security checks based on tier

**File:** `server/lib/deploy/security-gates.js`

**Acceptance Criteria:**
- Feature: SAST + dependency check
- Dev: SAST + DAST + container scan
- Stable: Full suite + manual approval
- Block deployment on gate failure

### Task 4: Deployment Approval [ ]

**Goal:** Approval workflow for protected deployments

**File:** `server/lib/deploy/deployment-approval.js`

**Acceptance Criteria:**
- Request approval from configured approvers
- 2FA confirmation for stable deployments
- Timeout and expiry handling
- Approval audit trail

### Task 5: Deployment Executor [ ]

**Goal:** Execute deployments with blue-green strategy

**File:** `server/lib/deploy/deployment-executor.js`

**Acceptance Criteria:**
- Blue-green deployment for stable
- Rolling deployment for dev/feature
- Health check validation
- Deployment state machine

### Task 6: Rollback Manager [ ]

**Goal:** Handle rollback and recovery

**File:** `server/lib/deploy/rollback-manager.js`

**Acceptance Criteria:**
- Auto-rollback on health check failure
- Manual rollback to any version
- State snapshots before deployment
- Recovery playbook generation

### Task 7: Deployment Audit [ ]

**Goal:** Complete audit trail for deployments

**File:** `server/lib/deploy/deployment-audit.js`

**Acceptance Criteria:**
- Log who, when, what, why
- Immutable append-only log
- Query by date/user/branch
- Export for compliance

### Task 8: Deploy Command [ ]

**Goal:** CLI command for branch deployments

**File:** `server/commands/deploy-branch.js`

**Acceptance Criteria:**
- `/tlc:deploy <branch>` triggers deployment
- Show security gate status
- Require confirmation for stable
- Display deployment progress

## Estimated Tests: ~80
