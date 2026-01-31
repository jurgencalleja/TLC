# Phase 21: Review Command - Plan

## Overview

Multi-LLM code review command with consensus reporting, confidence scoring, and multiple output formats.

## Tasks

### Task 1: Review report generator [x]

**Goal:** Generate review reports in multiple formats

**Files:**
- server/lib/review-reporter.js
- server/lib/review-reporter.test.js

**Acceptance Criteria:**
- [x] Markdown format with issue tables and confidence scores
- [x] JSON format for programmatic access
- [x] HTML format for browser viewing
- [x] Summary statistics (issues by severity, model agreement)

**Tests:** 29

---

### Task 2: File collector with ignore patterns [x]

**Goal:** Collect files for review respecting .tlcignore

**Files:**
- server/lib/file-collector.js
- server/lib/file-collector.test.js

**Acceptance Criteria:**
- [x] Collect single file
- [x] Collect directory recursively
- [x] Respect .tlcignore patterns (like .gitignore)
- [x] Filter by file extensions
- [x] Skip binary files

**Tests:** 35

---

### Task 3: Review orchestrator [x]

**Goal:** Orchestrate multi-model reviews with consensus

**Files:**
- server/lib/review-orchestrator.js
- server/lib/review-orchestrator.test.js

**Acceptance Criteria:**
- [x] Uses ConsensusEngine for parallel reviews
- [x] Tracks cost per review
- [x] Skips over-budget models
- [x] Aggregates results across files
- [x] Calculates overall confidence

**Tests:** 20

---

### Task 4: Review command [x]

**Goal:** `/tlc:review` command implementation

**Files:**
- server/lib/review-command.js
- server/lib/review-command.test.js

**Acceptance Criteria:**
- [x] `--file` for single file review
- [x] `--dir` for directory review
- [x] `--format` for output format (md, json, html)
- [x] `--output` for output file path
- [x] `--models` to select specific models
- [x] Shows cost summary

**Tests:** 32

---

## Summary

- Tasks: 4 (all complete)
- Files: 8 (4 modules + 4 test files)
- Tests: 116 total
