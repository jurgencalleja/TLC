# Phase 38: Dashboard Completion - Plan

## Overview

Complete the Dashboard Refresh milestone by implementing missing components identified in the gap analysis: Modal, Dropdown, Toast, Skeleton, MobileNav, hooks, and stores.

## Prerequisites

- [x] Phase 14-19 completed (design system foundation)
- [x] Design tokens in place (dashboard/src/styles/tokens.ts)
- [x] Core UI components working

## Tasks

### Task 1: Modal Component [x]

**Goal:** Create accessible modal dialog component

**Files:**
- dashboard/src/components/ui/Modal.tsx
- dashboard/test/components/ui/Modal.test.tsx

**Acceptance Criteria:**
- [ ] Focus trap when open (Tab cycles within modal)
- [ ] Escape key closes modal
- [ ] Click outside closes (when closeable=true)
- [ ] Animated entrance/exit (fade + scale)
- [ ] Portal rendering (renders at document root)
- [ ] ARIA attributes (role="dialog", aria-modal, aria-labelledby)
- [ ] onClose callback
- [ ] Prevent body scroll when open

**Test Cases:**
- Modal renders children when open
- Modal doesn't render when closed
- Escape key triggers onClose
- Click overlay triggers onClose when closeable
- Focus moves to modal on open
- Focus returns to trigger on close
- Tab key cycles within modal content

---

### Task 2: Dropdown Component [x]

**Goal:** Create dropdown/select component with keyboard navigation

**Files:**
- dashboard/src/components/ui/Dropdown.tsx
- dashboard/test/components/ui/Dropdown.test.tsx

**Acceptance Criteria:**
- [ ] Opens on click or Enter/Space
- [ ] Arrow keys navigate options
- [ ] Enter selects highlighted option
- [ ] Escape closes dropdown
- [ ] Type-ahead search (type to filter)
- [ ] Multi-select variant with checkboxes
- [ ] Customizable option rendering
- [ ] Max height with scroll

**Test Cases:**
- Dropdown opens on click
- Arrow down moves highlight
- Arrow up moves highlight
- Enter selects option
- Escape closes without selection
- Type filters options
- Multi-select allows multiple selections
- Disabled options are skipped

---

### Task 3: Toast Component [x]

**Goal:** Create toast notification system

**Files:**
- dashboard/src/components/ui/Toast.tsx
- dashboard/src/components/ui/ToastContainer.tsx
- dashboard/src/hooks/useToast.ts
- dashboard/test/components/ui/Toast.test.tsx

**Acceptance Criteria:**
- [ ] Toast variants: success, error, warning, info
- [ ] Auto-dismiss with configurable duration
- [ ] Manual dismiss with X button
- [ ] Stack multiple toasts
- [ ] Position options (top-right, top-left, bottom-right, bottom-left)
- [ ] Entrance/exit animations
- [ ] useToast hook for triggering

**Test Cases:**
- Toast renders with correct variant styling
- Toast auto-dismisses after duration
- Toast can be manually dismissed
- Multiple toasts stack correctly
- useToast.success() shows success toast
- useToast.error() shows error toast
- Position changes toast placement

---

### Task 4: Skeleton Component [x]

**Goal:** Create loading placeholder components

**Files:**
- dashboard/src/components/ui/Skeleton.tsx
- dashboard/test/components/ui/Skeleton.test.tsx

**Acceptance Criteria:**
- [ ] Pulse animation
- [ ] Variants: text, card, avatar, button, table-row
- [ ] Customizable width/height
- [ ] Rounded corners option
- [ ] Multiple lines for text variant

**Test Cases:**
- Skeleton renders with pulse animation class
- Skeleton.Text renders line placeholder
- Skeleton.Avatar renders circle placeholder
- Skeleton.Card renders card-shaped placeholder
- Custom dimensions applied correctly
- Multiple lines render for multi-line text

---

### Task 5: MobileNav Component [x]

**Goal:** Create bottom navigation bar for mobile devices

**Files:**
- dashboard/src/components/layout/MobileNav.tsx
- dashboard/test/components/layout/MobileNav.test.tsx

**Acceptance Criteria:**
- [ ] Fixed to bottom of screen
- [ ] Shows only below 768px viewport
- [ ] Tab items match sidebar navigation
- [ ] Active indicator on current tab
- [ ] Icons + labels (truncated on very small screens)
- [ ] Smooth tab transitions
- [ ] Safe area padding for notched phones

**Test Cases:**
- MobileNav renders navigation items
- Active tab shows indicator
- Tab click calls onNavigate
- Items have icons and labels
- Component hidden on desktop viewport

---

### Task 6: State Management Stores [x]

**Goal:** Create Zustand stores for application state

**Files:**
- dashboard/src/stores/uiStore.ts
- dashboard/src/stores/projectStore.ts
- dashboard/src/stores/taskStore.ts
- dashboard/src/stores/logStore.ts
- dashboard/test/stores/uiStore.test.ts
- dashboard/test/stores/projectStore.test.ts

**Acceptance Criteria:**
- [ ] uiStore: theme, sidebar open, active view, command palette open
- [ ] projectStore: projects list, selected project, loading state
- [ ] taskStore: tasks list, filters, selected task
- [ ] logStore: logs buffer, filters, search query
- [ ] Persist theme preference to localStorage
- [ ] TypeScript types for all state

**Test Cases:**
- uiStore toggles theme
- uiStore toggles sidebar
- projectStore sets projects
- projectStore selects project by ID
- taskStore filters tasks by status
- logStore appends logs with buffer limit
- Theme persists across sessions

---

### Task 7: Custom Hooks [x]

**Goal:** Create React hooks for data fetching and real-time

**Files:**
- dashboard/src/hooks/useWebSocket.ts
- dashboard/src/hooks/useProjects.ts
- dashboard/src/hooks/useTasks.ts
- dashboard/src/hooks/useLogs.ts
- dashboard/src/hooks/useTheme.ts
- dashboard/test/hooks/useWebSocket.test.ts
- dashboard/test/hooks/useTheme.test.ts

**Acceptance Criteria:**
- [ ] useWebSocket: connect, subscribe, send, reconnect
- [ ] useProjects: fetch projects, loading/error states
- [ ] useTasks: fetch tasks by project, filter, update
- [ ] useLogs: subscribe to log stream, filter, search
- [ ] useTheme: get/set theme, system preference detection

**Test Cases:**
- useWebSocket connects on mount
- useWebSocket reconnects on disconnect
- useProjects fetches and returns projects
- useTasks filters by status
- useLogs subscribes to WebSocket channel
- useTheme detects system preference
- useTheme toggles and persists

---

### Task 8: Accessibility Audit & Fixes [x]

**Goal:** Ensure WCAG 2.1 AA compliance

**Files:**
- Multiple component files (as needed)
- dashboard/test/accessibility.test.tsx

**Acceptance Criteria:**
- [ ] All interactive elements focusable
- [ ] Focus visible indicators
- [ ] Color contrast meets 4.5:1 ratio
- [ ] Screen reader announcements for dynamic content
- [ ] Skip links for keyboard navigation
- [ ] ARIA labels on icon-only buttons
- [ ] Reduced motion support (@prefers-reduced-motion)

**Test Cases:**
- All buttons are keyboard accessible
- Modal announces to screen readers
- Toast announces to screen readers
- Color contrast passes automated checks
- Tab order is logical
- Focus returns after modal close

---

### Task 9: Mobile Responsiveness [x]

**Goal:** Ensure tablet and phone layouts work correctly

**Files:**
- Multiple component files (CSS adjustments)
- dashboard/test/responsive.test.tsx

**Acceptance Criteria:**
- [ ] Tablet (768px-1024px): sidebar collapsible, two-column layouts
- [ ] Phone (<768px): single column, bottom nav, stacked views
- [ ] Touch targets minimum 44x44px
- [ ] No horizontal scroll
- [ ] Font sizes readable without zoom

**Test Cases:**
- Layout adapts at 768px breakpoint
- Layout adapts at 1024px breakpoint
- Touch targets meet minimum size
- Content fits viewport without scroll

---

### Task 10: Performance Optimization [x]

**Goal:** Meet <2s load time on 3G

**Files:**
- dashboard/vite.config.ts
- dashboard/src/components (lazy loading)

**Acceptance Criteria:**
- [ ] Code splitting by route
- [ ] Lazy load non-critical components
- [ ] Bundle size <200KB gzipped
- [ ] First contentful paint <1.5s
- [ ] Lighthouse performance score >90

**Test Cases:**
- Bundle analyzer shows expected chunk sizes
- Lazy components load on demand
- No render-blocking resources
- Images optimized (if any)

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 3 | - | Toast needs useToast hook, but can co-create |
| 6 | - | Independent |
| 7 | 6 | Hooks use stores |
| 8 | 1-5 | Audit needs components to exist |
| 9 | 5 | Mobile responsiveness needs MobileNav |
| 10 | 1-9 | Performance after all components |

**Parallel groups:**
- Group A: Tasks 1, 2, 3, 4, 5, 6 (can work simultaneously)
- Group B: Task 7 (after stores)
- Group C: Tasks 8, 9 (after components)
- Group D: Task 10 (after all)

## Estimated Scope

- Tasks: 10
- Files: ~30
- Tests: 188 (actual)
