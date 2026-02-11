# Phase 70: Workspace-Level Dashboard - Discussion

## Implementation Preferences

| Decision | Choice | Notes |
|----------|--------|-------|
| Root folder persistence | `~/.tlc/config.json` | Survives reinstalls, decoupled from cwd |
| First-run experience | Setup screen in dashboard | "Where are your projects?" folder input |
| Discovery markers | `.tlc.json` or `.planning/` | Recursive scan, configurable depth |
| Refresh strategy | Manual button + optional watcher | Watcher optional to avoid resource overhead |
| Server architecture | Config-driven (not cwd-based) | Server reads root from `~/.tlc/config.json` |
| API shape | `/api/workspace/*` + `/api/projects/:id/*` | RESTful, backward compatible |
| Dashboard layout | Grid home → drill-down detail | Existing ProjectGrid/ProjectCard components |
| Non-TLC projects | Show with "Initialize TLC" action | Discoverable by `package.json` + `.git/` |
| Multiple roots | Yes, array of root paths | Work + personal projects |
| Scan depth | Configurable, default 5 levels | Prevent scanning massive trees |

## Edge Cases to Handle

- [ ] Root folder doesn't exist or is deleted → show warning, prompt reconfigure
- [ ] Project folder moves/renames between scans → stale project removed from list
- [ ] Very large root folder (1000+ subdirectories) → depth limit + progress indicator
- [ ] Multiple root folders (work + personal) → array of roots in config
- [ ] Partially initialized project (`.tlc.json` but no `.planning/`) → show with warning
- [ ] Permission errors on subdirectories → skip silently, log warning
- [ ] Server starts before config exists → show setup screen
- [ ] Cached projects shown immediately → background refresh updates list

## Constraints

- Must not break single-project mode (backward compatible)
- Scan should complete in <5 seconds for typical setups
- Dashboard loads cached projects immediately, refreshes in background
- Root folder config survives `npm update -g tlc-claude-code`
- WebSocket messages must include projectId for multi-project context

## Architecture Notes

### Existing Infrastructure to Leverage
- `workspace-config.js` — already loads/saves `.tlc-workspace.json`, discovers repos
- `workspace-scanner.js` — scans repos, builds dependency graphs
- `ProjectGrid` / `ProjectCard` — already support multiple projects in UI
- `useProjects()` hook — returns array, currently wraps single project

### Key Changes Required
1. **Server**: Add workspace API endpoints, decouple from `process.cwd()`
2. **Config**: New `~/.tlc/config.json` for global TLC settings (root paths)
3. **Scanner**: Recursive discovery with depth limit and progress
4. **Dashboard**: Setup screen, project selector, per-project routing
5. **WebSocket**: Project-scoped messages

### API Design
```
GET  /api/workspace/config          → { roots: [...], lastScan: "..." }
POST /api/workspace/config          → { roots: ["/path/to/projects"] }
POST /api/workspace/scan            → trigger re-scan, return project list
GET  /api/projects                  → [{ id, name, path, phase, tests }]
GET  /api/projects/:id              → full project detail
GET  /api/projects/:id/status       → { phase, tasks, bugs, coverage }
GET  /api/projects/:id/tasks        → [{ num, title, status, owner }]
GET  /api/projects/:id/bugs         → [{ id, title, severity, status }]
```
