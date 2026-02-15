# Phase 76: Dashboard That Actually Works - Discussion

## The Problem

E2E audit (2026-02-15) found the dashboard is fundamentally broken:
- **5 of 11 pages render blank** (Settings, Team, Health, Client, Tests)
- **Tasks show zero detail** — all "Phase 0", "0/0", "medium", no descriptions
- **No click-through depth** — phases are flat list, clicking does nothing
- **Wrong navigation model** — 48 repos flat, should be workspace-first
- **No write actions** — POs/QAs can't create tasks, file bugs, or edit anything
- **Tests page route mismatch** — sidebar links to `/test-suite`, page expects `/tests`
- **Logs only show server errors** — no test/git/system log streaming

Screenshots saved: `/tmp/tlc-screenshots/01-landing.png` through `11-client.png`

## Inspiration

- **Kasha-Platform project board** (2026 Q1) — workspace with 33 repos, coverage report, roadmap structure
- **Kasha COVERAGE-REPORT.md** — per-repo test counts, risk levels, service grouping
- **OpenClaw mission control** — kanban, real-time status, priority badges, glassmorphism
- **OpenClaw monitoring dashboard** — 9-panel grid, alert banners, cost cards, progress bars in tables

Pattern: **Kasha's data density + coverage format for overview, OpenClaw's kanban + real-time for tasks/agents**

## Implementation Preferences

| Decision | Choice | Notes |
|----------|--------|-------|
| Navigation model | Workspace-first | Show TLC workspaces, click into workspace → see repos, plans, roadmap |
| Project view | Tabbed detail page | Tabs: Overview, Roadmap, Tasks, Tests, Logs — like Kasha project board |
| Write actions | Full CRUD for PO/QA | Create tasks & bugs, review/approve, plan phases — no CLI needed for PO/QA |
| Phase drill-down | Full detail | Goal, deliverables, every task with acceptance criteria, test results, who claimed what |
| Repo layout in workspace | Card grid with filters | Filterable by type (backend/frontend/library), sortable by coverage/activity |
| Blank pages | Fix everything | All pages must work or be removed. No blank screens |
| Task editing | Full edit in browser | Edit title, description, acceptance criteria, priority, assignee — writes back to PLAN.md |
| Architecture | Keep current (server) | Dashboard connects to TLC server (port 3147). Server must be running |
| Bug workflow | Form + screenshot + URL | QA fills form (title, severity, steps), attaches screenshot, optional URL for context |
| CLI bridge | Deep link protocol | `tlc://` protocol handler opens CLI tool with bug/task context pre-loaded |
| CLI provider | Provider-agnostic | Not Claude-specific — could be TLC standalone, Codex, or any CLI |
| Discussion visibility | Summary only | Show key decisions table from DISCUSSION.md, not full document |
| Theme | System preference | Follow OS dark/light setting automatically |
| UI patterns | Mix Kasha + OpenClaw | Kasha data density for overview, OpenClaw kanban for tasks |

## Edge Cases to Handle

- [ ] Workspace with no repos → show "Add repositories" guidance
- [ ] Repo with no .planning/ → show "Initialize TLC" action on card
- [ ] Phase with no PLAN.md → show "Plan this phase" action
- [ ] Empty task list → show "Create task" CTA, not blank
- [ ] API returns error → toast notification, retry button, not blank screen
- [ ] No TLC server running → clear error message with start instructions
- [ ] Large workspace (33+ repos) → pagination or virtual scroll
- [ ] Task edit conflict (CLI + dashboard editing same file) → last-write-wins with warning
- [ ] Screenshot upload → resize/compress before storing, max 2MB
- [ ] Mobile view → responsive, but primary target is desktop/tablet

## Constraints

- Must not break existing server API backward compatibility
- New API endpoints can be added freely
- Dashboard-web is React + Vite + Tailwind (keep this stack)
- All write operations go through REST API → server writes to .planning/ files
- WebSocket for real-time updates (already working)
- Deep link protocol registration is OS-specific (macOS, Linux, Windows)

## Architecture Notes

### Navigation Hierarchy
```
Landing → Workspace List
             ↓
         Workspace Detail (tabbed)
           ├── Overview (roadmap summary, stats, recent activity)
           ├── Repos (card grid with filters)
           ├── Roadmap (full milestone/phase tree with drill-down)
           ├── Tasks (kanban board, current phase)
           ├── Tests (inventory, grouped by repo/dir)
           ├── Bugs (list with create form)
           └── Settings (workspace config)
                ↓
         Repo Detail (tabbed, within workspace)
           ├── Overview (repo-level stats)
           ├── Tasks (repo-level tasks)
           ├── Tests (repo-level test inventory)
           └── Logs (repo-level logs)
```

### Write API Endpoints Needed
```
POST   /api/workspaces/:id/tasks          → create task in PLAN.md
PUT    /api/workspaces/:id/tasks/:taskId  → update task (status, content)
POST   /api/workspaces/:id/bugs           → create bug in BUGS.md
PUT    /api/workspaces/:id/bugs/:bugId    → update bug status
POST   /api/workspaces/:id/phases         → create new phase skeleton
PUT    /api/workspaces/:id/phases/:num    → update phase (approve/reject)
POST   /api/workspaces/:id/screenshots    → upload screenshot for bug
```

### What "Discuss in CLI" Deep Link Looks Like
```
tlc://discuss?workspace=kasha-platform&bug=BUG-042&context=...

→ Opens preferred CLI tool (Claude Code, TLC Standalone, Codex)
→ Pre-loads bug context: title, description, screenshot URL, reproduction steps
→ Engineer can investigate and fix without leaving terminal
```

### Pages That Must Work (Priority Order)
1. Dashboard/Overview — stats, roadmap summary, recent activity
2. Tasks — kanban with full detail, create/edit
3. Tests — inventory grouped by dir, run tests button
4. Roadmap — full drill-down to task/test level
5. Bugs — list + create form with screenshots
6. Logs — streaming app/test/git/system logs
7. Settings — theme, config, workspace settings
8. Team — presence + activity (VPS mode)
9. Health — server diagnostics
10. Preview — app iframe with device toggle
11. Client — simplified view for external stakeholders

## What Was Lost (Previous Discussion Context)

Previous conversation covered OpenClaw's interface, Kasha 2026 Q1 project board, and dashboard issues. That context was lost to context compaction — the TLC memory system (phases 71-73) was built but never wired to actually capture sessions. This discussion file ensures we don't lose these decisions again.
