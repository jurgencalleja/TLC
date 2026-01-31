# Phase 14: Design System Foundation - Plan

## Overview

Establish design tokens, core UI components, and layout system for TLC dashboard.

## Tasks

### Task 1: Design tokens [x]

**Goal:** Create design tokens for colors, spacing, typography, themes

**Files:**
- dashboard/src/styles/tokens.ts

**Acceptance Criteria:**
- [x] Color palette (primary, secondary, status colors)
- [x] Spacing scale
- [x] Typography scale
- [x] Dark/light theme token sets

**Tests:** 6

---

### Task 2: Core Button component [x]

**Goal:** Create accessible Button component with variants

**Files:**
- dashboard/src/components/ui/Button.tsx
- dashboard/src/components/ui/Button.test.tsx

**Acceptance Criteria:**
- [x] Variants: primary, secondary, ghost, danger
- [x] Sizes: sm, md, lg
- [x] States: loading, disabled
- [x] Ink-compatible (terminal rendering)

**Tests:** 10

---

### Task 3: Core Card component [x]

**Goal:** Create Card component with header/body/footer

**Files:**
- dashboard/src/components/ui/Card.tsx
- dashboard/src/components/ui/Card.test.tsx

**Acceptance Criteria:**
- [x] Card wrapper with border styles
- [x] Variants: default, elevated, outlined
- [x] Ink-compatible

**Tests:** 8

---

### Task 4: Badge component [x]

**Goal:** Create Badge component for status indicators

**Files:**
- dashboard/src/components/ui/Badge.tsx
- dashboard/src/components/ui/Badge.test.tsx

**Acceptance Criteria:**
- [x] Variants: success, warning, error, info, neutral
- [x] Sizes: sm, md
- [x] Ink-compatible

**Tests:** 9

---

### Task 5: Input component [x]

**Goal:** Create Input component with validation

**Files:**
- dashboard/src/components/ui/Input.tsx
- dashboard/src/components/ui/Input.test.tsx

**Acceptance Criteria:**
- [x] Text input with placeholder
- [x] Error state with message
- [x] Ink-compatible

**Tests:** 7

---

### Task 6: Layout Shell [x]

**Goal:** Create layout components (Sidebar, Header, Shell)

**Files:**
- dashboard/src/components/layout/Shell.tsx
- dashboard/src/components/layout/Sidebar.tsx
- dashboard/src/components/layout/Header.tsx

**Acceptance Criteria:**
- [x] Shell with sidebar + main content area
- [x] Header with breadcrumbs
- [x] Ink-compatible terminal layout

**Tests:** 18 (Shell: 6, Sidebar: 6, Header: 6)

---

## Summary

- Tasks: 6 (all complete)
- Tests: ~58 UI component tests
- Note: Dashboard uses Ink (terminal-based React), not web React
