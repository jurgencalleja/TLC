# Phase 19: Settings & Polish - Plan

## Overview

Final polish for the dashboard: settings management, command palette, keyboard shortcuts help, and connection status. Focus on quality UX patterns.

**Note:** Dashboard uses Ink (terminal-based React). Accessibility means keyboard navigation and clear visual hierarchy.

## Tasks

### Task 1: SettingsPanel component [x]

**Goal:** View and edit TLC configuration

**Files:**
- dashboard/src/components/SettingsPanel.tsx
- dashboard/src/components/SettingsPanel.test.tsx

**Acceptance Criteria:**
- [x] Shows current config values
- [x] Grouped by category (quality, git, paths, team)
- [x] Edit mode with validation
- [x] Save/cancel actions
- [x] Shows config file path
- [x] Handles missing config gracefully

---

### Task 2: CommandPalette component [x]

**Goal:** Quick command search and execution (Cmd+K style)

**Files:**
- dashboard/src/components/CommandPalette.tsx
- dashboard/src/components/CommandPalette.test.tsx

**Acceptance Criteria:**
- [x] Fuzzy search commands
- [x] Shows command description
- [x] Keyboard shortcut hints
- [x] Recent commands section
- [x] Category grouping
- [x] Execute on Enter

---

### Task 3: KeyboardHelp component [x]

**Goal:** Show all available keyboard shortcuts

**Files:**
- dashboard/src/components/KeyboardHelp.tsx
- dashboard/src/components/KeyboardHelp.test.tsx

**Acceptance Criteria:**
- [x] Grouped by context (global, navigation, actions)
- [x] Shows key combinations clearly
- [x] Searchable
- [x] Dismissible overlay
- [x] Shows current context shortcuts

---

### Task 4: ConnectionStatus component [x]

**Goal:** WebSocket connection indicator with auto-reconnect

**Files:**
- dashboard/src/components/ConnectionStatus.tsx
- dashboard/src/components/ConnectionStatus.test.tsx

**Acceptance Criteria:**
- [x] Shows connected/connecting/disconnected states
- [x] Auto-reconnect countdown
- [x] Manual reconnect action
- [x] Last connected timestamp
- [x] Error message display

---

### Task 5: StatusBar component [x]

**Goal:** Bottom status bar with key info

**Files:**
- dashboard/src/components/StatusBar.tsx
- dashboard/src/components/StatusBar.test.tsx

**Acceptance Criteria:**
- [x] Shows current branch
- [x] Shows environment
- [x] Shows connection status
- [x] Shows keyboard hint (? for help)
- [x] Compact single-line display

---

### Task 6: FocusIndicator component [x]

**Goal:** Visual focus management for accessibility

**Files:**
- dashboard/src/components/FocusIndicator.tsx
- dashboard/src/components/FocusIndicator.test.tsx

**Acceptance Criteria:**
- [x] Shows current focus area
- [x] Tab navigation between panels
- [x] Focus trap in modals
- [x] Skip links for screen readers
- [x] High contrast mode support

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 5 | 4 | StatusBar includes ConnectionStatus |

## Quality Checklist

- [x] All components have comprehensive tests
- [x] Error states handled gracefully
- [x] Loading states where appropriate
- [x] Consistent keyboard patterns across components
- [x] Clear visual hierarchy
- [x] Helpful empty states with guidance

## Scope

- Tasks: 6/6 complete
- Files: 12 (6 components + 6 test files)
- Tests: 139 passing
