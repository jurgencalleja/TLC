# Phase 14: Design System Foundation - Plan

## Overview

Establish design tokens, core UI components, and layout system for TLC dashboard.

## Tasks

### Task 1: Design tokens [ ]

**Goal:** Create design tokens for colors, spacing, typography, themes

**Files:**
- dashboard/src/styles/tokens.ts
- dashboard/src/styles/tokens.test.ts

**Acceptance Criteria:**
- [ ] Color palette (primary, secondary, status colors)
- [ ] Spacing scale (0-64px in consistent steps)
- [ ] Typography scale (font sizes, weights, line heights)
- [ ] Dark/light theme token sets
- [ ] CSS custom properties generated

---

### Task 2: Core Button component [ ]

**Goal:** Create accessible Button component with variants

**Files:**
- dashboard/src/components/ui/Button.tsx
- dashboard/src/components/ui/Button.test.tsx

**Acceptance Criteria:**
- [ ] Variants: primary, secondary, ghost, danger
- [ ] Sizes: sm, md, lg
- [ ] States: loading, disabled
- [ ] Accessible (keyboard nav, focus styles)

---

### Task 3: Core Card component [ ]

**Goal:** Create Card component with header/body/footer

**Files:**
- dashboard/src/components/ui/Card.tsx
- dashboard/src/components/ui/Card.test.tsx

**Acceptance Criteria:**
- [ ] Card wrapper with padding/border
- [ ] CardHeader, CardBody, CardFooter subcomponents
- [ ] Variants: default, elevated, outlined
- [ ] Hover states

---

### Task 4: Badge component [ ]

**Goal:** Create Badge component for status indicators

**Files:**
- dashboard/src/components/ui/Badge.tsx
- dashboard/src/components/ui/Badge.test.tsx

**Acceptance Criteria:**
- [ ] Variants: success, warning, error, info, neutral
- [ ] Sizes: sm, md
- [ ] Optional dot indicator
- [ ] Text overflow handling

---

### Task 5: Input component [ ]

**Goal:** Create Input component with validation

**Files:**
- dashboard/src/components/ui/Input.tsx
- dashboard/src/components/ui/Input.test.tsx

**Acceptance Criteria:**
- [ ] Text, password, search types
- [ ] Error state with message
- [ ] Helper text support
- [ ] Leading/trailing icons
- [ ] Accessible labels

---

### Task 6: Layout Shell [ ]

**Goal:** Create layout components (Sidebar, Header, Shell)

**Files:**
- dashboard/src/components/layout/Shell.tsx
- dashboard/src/components/layout/Shell.test.tsx
- dashboard/src/components/layout/Sidebar.tsx
- dashboard/src/components/layout/Sidebar.test.tsx
- dashboard/src/components/layout/Header.tsx
- dashboard/src/components/layout/Header.test.tsx

**Acceptance Criteria:**
- [ ] Shell with sidebar + main content area
- [ ] Collapsible sidebar
- [ ] Header with breadcrumbs and actions
- [ ] Mobile responsive (hamburger menu)
- [ ] Theme toggle in header
