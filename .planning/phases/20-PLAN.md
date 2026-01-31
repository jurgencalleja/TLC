# Phase 20: Multi-LLM Infrastructure - Plan

## Overview

Create adapter system for multiple AI models (Claude, OpenAI, DeepSeek) with standardized interfaces, budget tracking, and rate limiting.

## Tasks

### Task 1: Model adapter interface [x]

**Goal:** Define common interface for all model adapters

**Files:**
- server/lib/adapters/base-adapter.js
- server/lib/adapters/base-adapter.test.js

**Acceptance Criteria:**
- [x] Abstract base class with review, analyze, getUsage, estimateCost methods
- [x] Standardized response format (issues, suggestions, score, model, tokensUsed, cost)
- [x] Model name and configuration properties

---

### Task 2: Claude adapter [x]

**Goal:** Implement Claude adapter (uses Opus 4.5)

**Files:**
- server/lib/adapters/claude-adapter.js
- server/lib/adapters/claude-adapter.test.js

**Acceptance Criteria:**
- [x] Returns standardized review response
- [x] Optional cost tracking (with BudgetTracker)
- [x] Handles API errors gracefully
- [x] Uses latest model: claude-opus-4-5-20251101

---

### Task 3: OpenAI adapter with budget [x]

**Goal:** Implement OpenAI adapter (o3) with budget and rate limiting

**Files:**
- server/lib/adapters/openai-adapter.js
- server/lib/adapters/openai-adapter.test.js

**Acceptance Criteria:**
- [x] Tracks daily and monthly spending
- [x] Blocks requests when budget exceeded
- [x] Enforces rate limits
- [x] Uses latest model: o3

---

### Task 4: DeepSeek adapter [x]

**Goal:** Implement DeepSeek adapter (R1) with budget tracking

**Files:**
- server/lib/adapters/deepseek-adapter.js
- server/lib/adapters/deepseek-adapter.test.js

**Acceptance Criteria:**
- [x] Standard review interface
- [x] Budget tracking with BudgetTracker
- [x] Cost estimation and comparison to OpenAI
- [x] Uses latest model: deepseek-r1

---

### Task 5: Budget tracker [x]

**Goal:** Persistent budget tracking across sessions

**Files:**
- server/lib/budget-tracker.js
- server/lib/budget-tracker.test.js

**Acceptance Criteria:**
- [x] Persists to .tlc/usage.json
- [x] Daily reset at midnight
- [x] Monthly reset at month start
- [x] Thread-safe writes

---

### Task 6: Consensus engine [x]

**Goal:** Aggregate reviews from multiple models

**Files:**
- server/lib/consensus-engine.js
- server/lib/consensus-engine.test.js

**Acceptance Criteria:**
- [x] Runs reviews in parallel
- [x] Calculates majority consensus
- [x] Handles model failures gracefully
- [x] Respects budget before starting
