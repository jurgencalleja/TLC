# Phase 74: Dashboard Memory & Recall UI - Plan

## Overview

Extend the TLC dashboard with memory visualization, recall interface, and conversation history browser. Users can search memory semantically from the UI, view past conversations, see what TLC remembers about each project, and monitor vector DB status.

## Prerequisites

- [x] Phase 70: Workspace Dashboard (multi-project UI)
- [x] Phase 71: Semantic Memory (vector store, recall, capture)
- [x] Phase 72: Infra Repo (workspace structure)
- [x] Phase 73: Memory Hierarchy (inheritance, cascade)

## Tasks

### Task 1: Memory API Endpoints [ ]

**Goal:** Server-side HTTP endpoints for memory data: search, list conversations, view decisions, vector status.

**Files:**
- `server/lib/memory-api.js` (new)
- `server/lib/memory-api.test.js` (new)
- `server/index.js` (modified — mount memory routes)

**Acceptance Criteria:**
- [ ] `GET /api/memory/search?q=<query>&scope=<scope>` — semantic search
- [ ] `GET /api/memory/conversations` — list all conversation chunks (paginated)
- [ ] `GET /api/memory/conversations/:id` — view single conversation detail
- [ ] `GET /api/memory/decisions` — list all decisions
- [ ] `GET /api/memory/gotchas` — list all gotchas
- [ ] `GET /api/memory/stats` — vector DB stats (count, size, last indexed, model)
- [ ] `POST /api/memory/rebuild` — trigger vector index rebuild
- [ ] `POST /api/memory/remember` — manually add permanent memory
- [ ] All endpoints support `?project=<id>` filter for multi-project context
- [ ] Search returns: `[{ id, text, score, type, date, source, permanent }]`

**Test Cases:**
- Search endpoint returns semantic results
- Search with scope parameter filters correctly
- Conversations list returns paginated results
- Conversation detail returns full content
- Decisions endpoint returns all decisions
- Gotchas endpoint returns all gotchas
- Stats endpoint returns vector DB info
- Rebuild endpoint triggers re-indexing
- Remember endpoint stores permanent memory
- Project filter works across all endpoints
- Empty search returns empty results
- 404 for unknown conversation ID

---

### Task 2: Recall Search Panel [ ]

**Goal:** Dashboard component for semantic memory search. Type a question, get ranked results with similarity scores.

**Files:**
- `dashboard-web/src/components/memory/RecallPanel.tsx` (new)
- `dashboard-web/src/components/memory/RecallPanel.test.tsx` (new)

**Acceptance Criteria:**
- [ ] Search input with placeholder "What do you want to recall?"
- [ ] Results displayed as cards: title, excerpt, score (%), type badge, date
- [ ] Score shown as progress bar (0-100%)
- [ ] Type badges: Decision (blue), Gotcha (orange), Conversation (purple), Permanent (gold)
- [ ] Click result to expand full content
- [ ] Scope selector: Project / Workspace / Global
- [ ] Type filter: All / Decisions / Gotchas / Conversations
- [ ] Empty state: "Ask a question to search your memory"
- [ ] Loading state with skeleton cards
- [ ] Keyboard: Enter to search, Escape to clear

**Test Cases:**
- Renders search input
- Submits search on Enter
- Displays results as cards
- Shows similarity score as percentage
- Type badges render with correct colors
- Click expands result
- Scope selector filters results
- Type filter works
- Empty state shown when no query
- Loading skeleton during search
- No results message when nothing matches
- Clears on Escape

---

### Task 3: Conversation History Browser [ ]

**Goal:** Browse all captured conversations chronologically. View the detailed exchanges, decisions made, and related files.

**Files:**
- `dashboard-web/src/components/memory/ConversationBrowser.tsx` (new)
- `dashboard-web/src/components/memory/ConversationBrowser.test.tsx` (new)
- `dashboard-web/src/components/memory/ConversationCard.tsx` (new)
- `dashboard-web/src/components/memory/ConversationCard.test.tsx` (new)

**Acceptance Criteria:**
- [ ] List view: conversation cards sorted by date (newest first)
- [ ] Each card: title, date, project, decisions count, permanent badge
- [ ] Click card to open detail view
- [ ] Detail view: full markdown content rendered
- [ ] Detail view: extracted decisions highlighted
- [ ] Detail view: related files listed
- [ ] Filter by project (dropdown)
- [ ] Filter by date range
- [ ] Search within conversations (text search)
- [ ] Pagination (20 per page)
- [ ] Permanent conversations visually distinct (gold border)

**Test Cases:**
- Renders list of conversation cards
- Cards show title, date, project
- Cards sorted by date (newest first)
- Click opens detail view
- Detail renders markdown content
- Decisions highlighted in detail
- Related files listed
- Project filter works
- Date range filter works
- Text search filters conversations
- Pagination works (next/prev)
- Permanent conversations have gold border
- Empty state when no conversations
- Loading state

---

### Task 4: Memory Dashboard Page [ ]

**Goal:** Dedicated `/memory` page combining recall search, conversation browser, decisions list, and vector stats.

**Files:**
- `dashboard-web/src/pages/MemoryPage.tsx` (new)
- `dashboard-web/src/pages/MemoryPage.test.tsx` (new)
- `dashboard-web/src/stores/memory.store.ts` (new)
- `dashboard-web/src/stores/memory.store.test.ts` (new)
- `dashboard-web/src/hooks/useMemory.ts` (new)
- `dashboard-web/src/hooks/useMemory.test.ts` (new)

**Acceptance Criteria:**
- [ ] Tabbed layout: Recall | Conversations | Decisions | Gotchas
- [ ] Recall tab: RecallPanel component
- [ ] Conversations tab: ConversationBrowser component
- [ ] Decisions tab: list of all decisions with detail view
- [ ] Gotchas tab: list of all gotchas with severity indicators
- [ ] `useMemory()` hook: `{ search, conversations, decisions, gotchas, stats, rebuild }`
- [ ] `memory.store.ts`: search results, conversation list, selected conversation
- [ ] Vector DB status badge in header (indexed count, last rebuild time)
- [ ] "Rebuild Index" button with confirmation
- [ ] Added to sidebar navigation with brain icon
- [ ] Route: `/memory` (global) or `/projects/:id/memory` (per-project)

**Test Cases:**
- Renders tabbed layout
- Recall tab shows RecallPanel
- Conversations tab shows ConversationBrowser
- Decisions tab shows decision list
- Gotchas tab shows gotcha list
- useMemory hook fetches data on mount
- Store holds search results
- Store holds conversation list
- Vector status badge shows count
- Rebuild button triggers API call
- Sidebar shows memory link
- Route renders MemoryPage
- Per-project route scopes data

---

### Task 5: Memory Widget for Dashboard Home [ ]

**Goal:** Compact memory widget on the main dashboard showing recent memories, quick recall, and memory health.

**Files:**
- `dashboard-web/src/components/memory/MemoryWidget.tsx` (new)
- `dashboard-web/src/components/memory/MemoryWidget.test.tsx` (new)

**Acceptance Criteria:**
- [ ] Compact card showing: "X memories indexed", "Last: 5 min ago"
- [ ] Quick search input (mini version of RecallPanel)
- [ ] Last 3 decisions shown as one-liners
- [ ] "View All" link to /memory page
- [ ] Health indicator: green (indexed recently), yellow (stale > 1hr), red (no index)
- [ ] Ollama status: connected / disconnected
- [ ] Fits in dashboard grid alongside other widgets

**Test Cases:**
- Shows indexed memory count
- Shows last indexed time
- Quick search triggers recall
- Last 3 decisions displayed
- "View All" links to memory page
- Health indicator green when recent
- Health indicator yellow when stale
- Health indicator red when no index
- Ollama status shown
- Fits in standard grid layout

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 1 | — | Independent (server endpoints) |
| 2 | 1 | Panel calls search API |
| 3 | 1 | Browser calls conversations API |
| 4 | 1, 2, 3 | Page assembles all components |
| 5 | 1 | Widget calls stats API |

**Parallel groups:**
- Group A: Task 1 (server foundation)
- Group B: Tasks 2, 3, 5 (after Task 1, independent components)
- Group C: Task 4 (after Tasks 1, 2, 3 — page assembly)

## Estimated Scope

- Tasks: 5
- New files: 16 (6 components + 1 page + 1 store + 1 hook + 1 API module + 6 test files)
- Modified files: 3 (server/index.js, App.tsx routing, Sidebar navigation)
- Tests: ~75 (estimated)
