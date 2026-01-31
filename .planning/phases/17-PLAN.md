# Phase 17: Logs & Preview - Plan

## Overview

Enhance log viewing with virtualization/pagination for large log sets, add text search, and add device size toggle for preview URLs.

**Note:** Dashboard uses Ink (terminal-based React). "Virtualization" means windowed pagination, not DOM virtualization.

## Tasks

### Task 1: LogStream component [x]

**Goal:** Enhanced log viewer with pagination and search

**Files:**
- dashboard/src/components/LogStream.tsx
- dashboard/src/components/LogStream.test.tsx

**Acceptance Criteria:**
- [x] Windowed display (configurable page size)
- [x] Page navigation (PgUp/PgDn or g/G)
- [x] Text search with highlighting
- [x] Jump to top/bottom
- [x] Shows position indicator (line X of Y)
- [x] Auto-scroll toggle with visual indicator

---

### Task 2: LogSearch component [x]

**Goal:** Search input for filtering logs by text

**Files:**
- dashboard/src/components/LogSearch.tsx
- dashboard/src/components/LogSearch.test.tsx

**Acceptance Criteria:**
- [x] Text input for search query
- [x] Match count display
- [x] Next/prev match navigation (n/N)
- [x] Clear search (Esc)
- [x] Case-insensitive by default

---

### Task 3: DeviceFrame component [x]

**Goal:** Device size selector for preview URLs

**Files:**
- dashboard/src/components/DeviceFrame.tsx
- dashboard/src/components/DeviceFrame.test.tsx

**Acceptance Criteria:**
- [x] Device presets (phone/tablet/desktop)
- [x] Shows dimensions for each device
- [x] Generates URL with viewport params
- [x] Keyboard selection (1/2/3)
- [x] Custom dimensions option

---

### Task 4: PreviewPanel component [x]

**Goal:** Combined preview with device toggle and QR code

**Files:**
- dashboard/src/components/PreviewPanel.tsx
- dashboard/src/components/PreviewPanel.test.tsx

**Acceptance Criteria:**
- [x] Service selector from AppPreview
- [x] Device size toggle
- [x] Shows URL for selected device
- [x] QR code hint for mobile testing
- [x] Error state handling

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 4 | 3 | PreviewPanel uses DeviceFrame |

## Scope

- Tasks: 4/4 complete
- Files: 8 (4 components + 4 test files)
- Tests: 86 passing
