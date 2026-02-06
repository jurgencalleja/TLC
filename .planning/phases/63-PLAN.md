# Phase 63: Tag-Based QA Release Pipeline - Plan

## Overview

Introduce git tag-driven release workflow where developers tag releases, QA reviews deployed previews, and accepted tags are promoted to production. This closes the loop between "code complete" and "production ready" with a formal QA gate.

**Workflow:**
```
Developer pushes tag (v1.1.0-rc.1)
       ↓
TLC detects tag → runs security scan + tests
       ↓
Auto-deploys to qa-v1.1.0.example.com
       ↓
QA task auto-created in dashboard
       ↓
QA reviews live preview + test results
       ↓
QA accepts → tag promoted to production
QA rejects → developer notified with feedback
```

**Builds On:**
- webhook-listener.js (already detects TAG events)
- branch-deployer.js (Docker deployment to subdomains)
- deployment-approval.js (approval workflows with 2FA)
- deployment-audit.js (immutable audit trail)
- QA dashboard components (QATaskQueue, TestReviewPanel)
- VERIFIED.md pattern (phase verification records)

---

## Prerequisites

- [x] Webhook listener handles TAG events (Phase 9)
- [x] Branch deployer generates subdomains (Phase 9)
- [x] Deployment approval workflow (Phase 50)
- [x] QA dashboard components exist (Phase 47)
- [x] Security scanning modules (Phase 48)
- [ ] Phase 62 verified (dashboard assembly)

---

## Tasks

### Task 1: Tag Classifier [ ]

**Goal:** Parse and classify git tags into release tiers with semantic versioning support.

**Files:**
- server/lib/tag-classifier.js
- server/lib/tag-classifier.test.js

**Acceptance Criteria:**
- [ ] Parse semver tags: `v1.0.0`, `v1.0.0-rc.1`, `v1.0.0-beta.2`
- [ ] Classify tiers: `rc` (release candidate → QA), `beta` (internal), `release` (production)
- [ ] Detect tag suffixes: `-rc.N`, `-beta.N`, `-alpha.N`
- [ ] Validate tag format (reject malformed tags)
- [ ] Extract version components (major, minor, patch, prerelease)
- [ ] Compare versions for ordering (v1.1.0-rc.2 > v1.1.0-rc.1)

**Test Cases:**
- Parses `v1.0.0` as release tier
- Parses `v1.0.0-rc.1` as rc tier (QA review required)
- Parses `v1.0.0-beta.2` as beta tier
- Rejects invalid tags (`foo`, `v1`, `1.0.0` without v prefix)
- Compares versions correctly
- Extracts all semver components

---

### Task 2: Release Gate Engine [ ]

**Goal:** Configurable gates that must pass before a tag can be promoted. Gates run in sequence; any failure blocks promotion.

**Files:**
- server/lib/release-gate.js
- server/lib/release-gate.test.js

**Acceptance Criteria:**
- [ ] Gate types: `tests`, `security`, `coverage`, `qa-approval`
- [ ] Gates configurable per tier in `.tlc.json`
- [ ] Gate results stored with pass/fail/skip and details
- [ ] `tests` gate: run test suite, require all passing
- [ ] `security` gate: run secret detection + dependency audit
- [ ] `coverage` gate: enforce coverage threshold
- [ ] `qa-approval` gate: require QA user to approve
- [ ] Gate execution returns structured result with timing

**Test Cases:**
- Tests gate passes when all tests pass
- Tests gate fails when tests fail (with failure details)
- Security gate fails when secrets detected
- Coverage gate fails below threshold
- QA-approval gate stays pending until explicit approval
- Gates run in configured order
- Failed gate blocks subsequent gates
- Gate results include timing and details

---

### Task 3: Tag Release Orchestrator [ ]

**Goal:** Main orchestration module that coordinates the full tag → QA → production flow.

**Files:**
- server/lib/tag-release.js
- server/lib/tag-release.test.js

**Acceptance Criteria:**
- [ ] On tag event: classify → run gates → deploy preview → create QA task
- [ ] Track release state: `pending` → `gates-running` → `deployed` → `qa-review` → `accepted`/`rejected`
- [ ] Store release metadata (tag, commit, gates, QA reviewer, timestamps)
- [ ] On QA accept: promote tag (create production tag or mark in GitHub)
- [ ] On QA reject: notify developer with rejection reason
- [ ] Persist release history to `.tlc/releases/{tag}.json`
- [ ] Support re-running gates after fixes (`/tlc:tag retry v1.1.0-rc.1`)

**Test Cases:**
- Full flow: tag → classify → gates → deploy → QA accept → promote
- Full flow: tag → classify → gates → deploy → QA reject → notify
- Gate failure blocks deployment
- Release state transitions are valid (no skipping states)
- Release history persisted and queryable
- Retry re-runs failed gates only

---

### Task 4: QA Release Task Generator [ ]

**Goal:** Auto-create QA verification tasks when a tag is deployed for review.

**Files:**
- server/lib/qa-release-task.js
- server/lib/qa-release-task.test.js

**Acceptance Criteria:**
- [ ] Create QA task with: tag name, preview URL, gate results, changelog
- [ ] Auto-assign to users with `role: qa` in `.tlc.json`
- [ ] Generate changelog from commits since last tag
- [ ] Include test summary (total, passing, failing, coverage %)
- [ ] Include security scan summary
- [ ] Task appears in dashboard QATaskQueue
- [ ] Link to deployed preview environment

**Test Cases:**
- Creates task with correct tag metadata
- Assigns to QA users from config
- Generates changelog from git log
- Includes test and security summaries
- Task format compatible with QATaskQueue component

---

### Task 5: Tag Release Command [ ]

**Goal:** CLI command `/tlc:tag` for creating, reviewing, accepting, and managing tagged releases.

**Files:**
- server/lib/tag-release-command.js
- server/lib/tag-release-command.test.js

**Acceptance Criteria:**
- [ ] `/tlc:tag create v1.1.0-rc.1` — create tag, trigger gates and deployment
- [ ] `/tlc:tag status [tag]` — show release pipeline status
- [ ] `/tlc:tag accept v1.1.0-rc.1` — QA accepts (requires qa role)
- [ ] `/tlc:tag reject v1.1.0-rc.1 --reason "..."` — QA rejects with feedback
- [ ] `/tlc:tag promote v1.1.0-rc.1` — promote RC to release tag (v1.1.0)
- [ ] `/tlc:tag retry v1.1.0-rc.1` — re-run failed gates
- [ ] `/tlc:tag list` — show all tags with release status
- [ ] `/tlc:tag history` — show release history with QA decisions
- [ ] Validates user role before accept/reject (only QA/admin)
- [ ] Confirms before creating production tags

**Test Cases:**
- `create` creates git tag and triggers pipeline
- `status` shows current gate progress
- `accept` requires qa or admin role
- `reject` stores reason and notifies developer
- `promote` creates clean version tag from RC
- `retry` only re-runs failed gates
- `list` shows tags with status indicators
- `history` shows chronological release decisions
- Rejects unauthorized accept/reject attempts

---

### Task 6: Release Configuration Schema [ ]

**Goal:** Add release pipeline config to `.tlc.json` schema.

**Files:**
- server/lib/release-config.js
- server/lib/release-config.test.js

**Acceptance Criteria:**
- [ ] `.tlc.json` release section with gates, tiers, and notification config
- [ ] Default gates per tier (rc requires all gates, beta skips qa-approval)
- [ ] Configurable coverage threshold per tier
- [ ] Notification channels (slack webhook, email)
- [ ] Preview URL template (`qa-{tag}.{domain}`)
- [ ] Promotion rules (rc → release, manual or auto)
- [ ] Validate config on load (reject invalid gate names, bad URLs)

**Example Config:**
```json
{
  "release": {
    "tagPattern": "v*",
    "previewUrlTemplate": "qa-{tag}.{domain}",
    "tiers": {
      "rc": {
        "gates": ["tests", "security", "coverage", "qa-approval"],
        "coverageThreshold": 80,
        "autoPromote": false
      },
      "beta": {
        "gates": ["tests", "security"],
        "coverageThreshold": 70,
        "autoPromote": false
      },
      "release": {
        "gates": ["tests", "security", "coverage"],
        "requiresPromotion": true
      }
    },
    "notifications": {
      "onDeploy": ["slack"],
      "onAccept": ["slack"],
      "onReject": ["slack"]
    }
  }
}
```

**Test Cases:**
- Loads valid config
- Applies defaults for missing fields
- Rejects unknown gate names
- Validates URL templates
- Returns tier-specific gate list
- Merges with existing .tlc.json without clobbering

---

### Task 7: Release History & Audit [ ]

**Goal:** Immutable release history with full audit trail for compliance.

**Files:**
- server/lib/release-audit.js
- server/lib/release-audit.test.js

**Acceptance Criteria:**
- [ ] Store release events: created, gates-passed, gates-failed, deployed, accepted, rejected, promoted
- [ ] Each event includes: timestamp, user, tag, action, details
- [ ] History stored in `.tlc/releases/` directory
- [ ] Per-tag JSON file with full event timeline
- [ ] Summary file `.tlc/releases/index.json` for quick queries
- [ ] Append-only (never modify past events)
- [ ] Generate release report (markdown) for a tag
- [ ] Query: releases by status, by date range, by QA reviewer

**Test Cases:**
- Records creation event
- Records gate results (pass and fail)
- Records QA decision with reviewer identity
- Records promotion event
- History is append-only (past events immutable)
- Generates markdown report
- Queries filter correctly by status/date/reviewer

---

### Task 8: Webhook Tag Handler [ ]

**Goal:** Wire tag events from webhook-listener.js to the release pipeline.

**Files:**
- server/lib/webhook-tag-handler.js
- server/lib/webhook-tag-handler.test.js

**Acceptance Criteria:**
- [ ] Register `onTag` callback with existing webhook listener
- [ ] Extract tag name, commit SHA, pusher from webhook payload
- [ ] Trigger release pipeline for recognized tag patterns
- [ ] Ignore non-release tags (e.g., `build-123`, `deploy-staging`)
- [ ] Support both GitHub and GitLab tag event formats
- [ ] Rate limit: prevent duplicate triggers for same tag
- [ ] Log webhook events for debugging

**Test Cases:**
- Triggers pipeline for `v1.0.0-rc.1` tag push
- Triggers pipeline for `v1.0.0` tag push
- Ignores `build-123` non-release tags
- Handles GitHub tag push payload
- Handles GitLab tag push payload
- Deduplicates rapid webhook retries
- Extracts correct commit SHA and pusher

---

### Task 9: Dashboard Release Panel [ ]

**Goal:** Dashboard component showing release pipeline status and QA actions.

**Files:**
- dashboard-web/src/components/release/ReleasePanel.tsx
- dashboard-web/src/components/release/ReleasePanel.test.tsx
- dashboard-web/src/components/release/ReleaseTimeline.tsx
- dashboard-web/src/components/release/ReleaseTimeline.test.tsx
- dashboard-web/src/components/release/ReleaseGateStatus.tsx
- dashboard-web/src/components/release/ReleaseGateStatus.test.tsx
- dashboard-web/src/components/release/index.ts

**Acceptance Criteria:**
- [ ] ReleasePanel shows current release candidates with status
- [ ] ReleaseTimeline shows event history (created → gates → deployed → QA decision)
- [ ] ReleaseGateStatus shows each gate with pass/fail/pending indicator
- [ ] Accept/Reject buttons for QA users (hidden for non-QA)
- [ ] Rejection requires reason text
- [ ] Preview URL link opens deployed environment
- [ ] Shows changelog and test summary
- [ ] Loading and empty states

**Test Cases:**
- ReleasePanel renders release candidates list
- ReleasePanel shows Accept/Reject for QA role
- ReleasePanel hides actions for non-QA role
- ReleaseTimeline renders events in chronological order
- ReleaseGateStatus shows pass/fail/pending per gate
- Reject requires reason text before submission
- Empty state shows "No releases pending"
- Preview link renders with correct URL

---

### Task 10: Notification Integration [ ]

**Goal:** Notify team members when releases need QA review or are accepted/rejected.

**Files:**
- server/lib/release-notifier.js
- server/lib/release-notifier.test.js

**Acceptance Criteria:**
- [ ] Slack notification on: tag deployed for QA, QA accepted, QA rejected
- [ ] Notification includes: tag, preview URL, gate summary, changelog snippet
- [ ] Uses existing slack-notifier.js infrastructure
- [ ] Configurable channels per event type
- [ ] Mention QA users when review needed
- [ ] Include Accept/Reject action buttons in Slack (if webhook URL configured)
- [ ] Fallback to console log when no notification channels configured

**Test Cases:**
- Sends Slack notification on deploy
- Sends Slack notification on accept
- Sends Slack notification on reject (includes reason)
- Notification includes preview URL and changelog
- Falls back to console when Slack not configured
- Respects per-event channel config

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | Gates need tag classification for tier-specific config |
| 3 | 1, 2 | Orchestrator uses classifier and gates |
| 4 | 3 | Task generator triggered by orchestrator |
| 5 | 1, 2, 3 | Command wraps all core modules |
| 6 | 1, 2 | Config schema defines gate/tier structure |
| 7 | 3 | Audit records events from orchestrator |
| 8 | 1, 3 | Handler feeds webhooks into orchestrator |
| 9 | — | Dashboard can be built independently with mock data |
| 10 | 3 | Notifier triggered by orchestrator events |

**Parallel groups:**
- Group A: Tasks 1, 6, 9 (independent — classifier, config, dashboard)
- Group B: Task 2 (after Task 1)
- Group C: Tasks 3, 7 (after Tasks 1, 2)
- Group D: Tasks 4, 5, 8, 10 (after Task 3)

---

## Estimated Scope

- Tasks: 10
- New Files: ~20 (10 modules + 10 test files)
- Tests: ~200 (estimated)
- Dashboard Components: 3 (ReleasePanel, ReleaseTimeline, ReleaseGateStatus)
