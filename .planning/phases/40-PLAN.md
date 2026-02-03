# Phase 40: Design System Foundation - Plan

## Overview

Ground-up rebuild of TLC Dashboard starting with design tokens, core UI components, and layout system. This replaces the broken prototype with a properly architected React + Vite + Tailwind application.

## Prerequisites

- [ ] Delete old dashboard directory (backup if needed)
- [ ] Create new dashboard scaffold with Vite + React + TypeScript
- [ ] Install dependencies (Tailwind, Zustand, Lucide, Framer Motion)

## Tech Stack

| Choice | Rationale |
|--------|-----------|
| React 18 | Already in TLC, team knows it |
| Tailwind CSS | Utility-first, easy to customize |
| Zustand | Simple state, no boilerplate |
| Vite | Fast builds, good DX |
| Lucide | Clean icons, matches Coolify |
| Vitest | Fast, Vite-native testing |

## Tasks

### Task 1: Project Scaffold [ ]

**Goal:** Create new dashboard project with proper tooling

**Files:**
- dashboard/package.json
- dashboard/vite.config.ts
- dashboard/tsconfig.json
- dashboard/tailwind.config.js
- dashboard/postcss.config.js
- dashboard/index.html
- dashboard/src/main.tsx
- dashboard/src/App.tsx

**Acceptance Criteria:**
- [ ] `npm run dev` starts dev server
- [ ] `npm run build` produces dist/
- [ ] `npm test` runs Vitest
- [ ] Tailwind classes work

**Test Cases:**
- Dev server starts on configured port
- Production build succeeds
- Test runner executes

---

### Task 2: Design Tokens [ ]

**Goal:** Define CSS custom properties for colors, spacing, typography

**Files:**
- dashboard/src/styles/tokens.css
- dashboard/src/styles/reset.css

**Acceptance Criteria:**
- [ ] Dark theme colors defined (--color-bg-primary, etc.)
- [ ] Light theme via [data-theme="light"]
- [ ] Spacing scale (--space-1 through --space-12)
- [ ] Typography scale (--text-xs through --text-xl)
- [ ] Radius, shadows, transitions defined

**Test Cases:**
- CSS variables resolve to expected values
- Theme switching changes variables
- Spacing scale follows 0.25rem increments

---

### Task 3: Button Component [ ]

**Goal:** Reusable button with variants and states

**Files:**
- dashboard/src/components/ui/Button.tsx
- dashboard/src/components/ui/Button.test.tsx

**Acceptance Criteria:**
- [ ] Variants: primary, secondary, ghost, danger
- [ ] Sizes: sm, md, lg
- [ ] Loading state with spinner
- [ ] Disabled state
- [ ] Renders as link when href provided

**Test Cases:**
- Renders with default variant (primary)
- Renders all variants with correct classes
- Shows spinner when loading
- Disabled when loading
- Renders as anchor when href provided
- Calls onClick handler

---

### Task 4: Card Component [ ]

**Goal:** Container component with optional status indicator

**Files:**
- dashboard/src/components/ui/Card.tsx
- dashboard/src/components/ui/Card.test.tsx

**Acceptance Criteria:**
- [ ] Optional status indicator (success, warning, error, info)
- [ ] Optional header and footer slots
- [ ] Clickable variant with hover state
- [ ] Padding variants

**Test Cases:**
- Renders children
- Shows status indicator with correct color
- Clickable card has button role
- Fires onClick when clicked
- Header/footer slots render correctly

---

### Task 5: Badge Component [ ]

**Goal:** Status badges for displaying state

**Files:**
- dashboard/src/components/ui/Badge.tsx
- dashboard/src/components/ui/Badge.test.tsx

**Acceptance Criteria:**
- [ ] Status variants: running, stopped, building, error, pending
- [ ] Size variants: sm, md
- [ ] Optional dot indicator
- [ ] Optional icon

**Test Cases:**
- Renders text content
- Status colors map correctly (running=green, error=red, etc.)
- Dot indicator shows when enabled
- Icon renders when provided

---

### Task 6: Input Component [ ]

**Goal:** Text input with variants and states

**Files:**
- dashboard/src/components/ui/Input.tsx
- dashboard/src/components/ui/Input.test.tsx

**Acceptance Criteria:**
- [ ] Text input with label
- [ ] Search variant with clear button
- [ ] Error state with message
- [ ] Disabled state
- [ ] Icon prefix/suffix

**Test Cases:**
- Renders with label
- Search clear button clears value
- Error message displays
- Disabled prevents input
- Icons render in correct position

---

### Task 7: Modal Component [ ]

**Goal:** Dialog with focus trap and backdrop

**Files:**
- dashboard/src/components/ui/Modal.tsx
- dashboard/src/components/ui/Modal.test.tsx

**Acceptance Criteria:**
- [ ] Opens/closes with controlled state
- [ ] Closes on backdrop click
- [ ] Closes on Escape key
- [ ] Focus trapped inside modal
- [ ] Renders in portal
- [ ] Accessible (role="dialog", aria-modal)

**Test Cases:**
- Opens when open prop is true
- Closes when backdrop clicked
- Closes on Escape key press
- Focus moves to first focusable element
- Focus returns on close
- Has correct ARIA attributes

---

### Task 8: Toast Component [ ]

**Goal:** Notification toasts with auto-dismiss

**Files:**
- dashboard/src/components/ui/Toast.tsx
- dashboard/src/components/ui/Toast.test.tsx
- dashboard/src/components/ui/ToastProvider.tsx

**Acceptance Criteria:**
- [ ] Variants: success, error, warning, info
- [ ] Auto-dismiss after configurable duration
- [ ] Manual dismiss button
- [ ] Stacks multiple toasts
- [ ] Animation on enter/exit

**Test Cases:**
- Renders message
- Auto-dismisses after duration
- Manual dismiss works
- Multiple toasts stack vertically
- Correct variant styling

---

### Task 9: Skeleton Component [ ]

**Goal:** Loading placeholder components

**Files:**
- dashboard/src/components/ui/Skeleton.tsx
- dashboard/src/components/ui/Skeleton.test.tsx

**Acceptance Criteria:**
- [ ] Text skeleton (single line)
- [ ] Paragraph skeleton (multiple lines)
- [ ] Avatar skeleton (circle)
- [ ] Card skeleton (full card placeholder)
- [ ] Animated shimmer effect

**Test Cases:**
- Renders with correct dimensions
- Circle variant is circular
- Multiple lines render for paragraph
- Animation class applied

---

### Task 10: Dropdown Component [ ]

**Goal:** Dropdown menu with keyboard navigation

**Files:**
- dashboard/src/components/ui/Dropdown.tsx
- dashboard/src/components/ui/Dropdown.test.tsx

**Acceptance Criteria:**
- [ ] Opens on trigger click
- [ ] Closes on outside click
- [ ] Closes on Escape
- [ ] Keyboard navigation (up/down/enter)
- [ ] Type-ahead search
- [ ] Multi-select option

**Test Cases:**
- Opens when trigger clicked
- Closes on outside click
- Arrow keys navigate items
- Enter selects focused item
- Type-ahead filters options
- Multi-select shows checkboxes

---

### Task 11: Sidebar Component [ ]

**Goal:** Collapsible navigation sidebar

**Files:**
- dashboard/src/components/layout/Sidebar.tsx
- dashboard/src/components/layout/Sidebar.test.tsx

**Acceptance Criteria:**
- [ ] Navigation items with icons
- [ ] Active state for current route
- [ ] Collapsible (icons only mode)
- [ ] Keyboard navigation
- [ ] Mobile: hidden by default

**Test Cases:**
- Renders navigation items
- Active item highlighted
- Collapse button toggles width
- Keyboard tab navigates items
- Hidden on mobile viewport

---

### Task 12: Header Component [ ]

**Goal:** Top header with breadcrumbs and actions

**Files:**
- dashboard/src/components/layout/Header.tsx
- dashboard/src/components/layout/Header.test.tsx

**Acceptance Criteria:**
- [ ] Breadcrumb navigation
- [ ] Search input (Cmd+K trigger)
- [ ] Theme toggle button
- [ ] User menu dropdown
- [ ] Mobile menu button

**Test Cases:**
- Renders breadcrumbs
- Search input visible
- Theme toggle switches theme
- User menu opens on click
- Mobile menu button shows on small screens

---

### Task 13: MobileNav Component [ ]

**Goal:** Bottom navigation for mobile devices

**Files:**
- dashboard/src/components/layout/MobileNav.tsx
- dashboard/src/components/layout/MobileNav.test.tsx

**Acceptance Criteria:**
- [ ] Fixed to bottom on mobile
- [ ] 4-5 primary navigation items
- [ ] Touch-friendly tap targets (44px minimum)
- [ ] Active state indicator
- [ ] Hidden on desktop

**Test Cases:**
- Fixed position at bottom
- Items have minimum 44px height
- Active item shows indicator
- Hidden when viewport > 768px

---

### Task 14: Shell Component [ ]

**Goal:** Main layout composition

**Files:**
- dashboard/src/components/layout/Shell.tsx
- dashboard/src/components/layout/Shell.test.tsx

**Acceptance Criteria:**
- [ ] Composes Sidebar + Header + content area
- [ ] Responsive: sidebar collapses on tablet, bottom nav on mobile
- [ ] Content area scrollable
- [ ] Skip link for accessibility

**Test Cases:**
- Renders sidebar and header
- Content renders in main area
- Layout adapts to viewport
- Skip link jumps to main content

---

### Task 15: UI Component Index [ ]

**Goal:** Export all components from single entry point

**Files:**
- dashboard/src/components/ui/index.ts
- dashboard/src/components/layout/index.ts

**Acceptance Criteria:**
- [ ] All UI components exported from ui/index.ts
- [ ] All layout components exported from layout/index.ts
- [ ] TypeScript types exported

**Test Cases:**
- Import { Button, Card, Badge } from './ui' works
- Import { Shell, Sidebar } from './layout' works

---

### Task 16: Dockerfile [ ]

**Goal:** Docker image for dashboard

**Files:**
- dashboard/Dockerfile
- dashboard/.dockerignore

**Acceptance Criteria:**
- [ ] Multi-stage build (node for build, nginx for serve)
- [ ] Production optimized
- [ ] Nginx config for SPA routing
- [ ] Health check endpoint

**Test Cases:**
- docker build succeeds
- Container starts and serves app
- Health check returns 200
- SPA routing works (refresh on /tasks)

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 3-15 | 1, 2 | Need project scaffold and tokens first |
| 11-14 | 3-10 | Layout uses UI components |
| 15 | 3-14 | Index exports all components |
| 16 | 1 | Dockerfile needs package.json |

**Parallel groups:**
- Group A: Tasks 1-2 (sequential, scaffold then tokens)
- Group B: Tasks 3-10 (can work in parallel after Group A)
- Group C: Tasks 11-14 (can work in parallel after Group B)
- Group D: Tasks 15-16 (after all components)

## Estimated Scope

- Tasks: 16
- Files: ~40
- Tests: ~150 (estimated)
