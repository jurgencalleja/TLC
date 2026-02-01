# Phase 22: Refactor Command - Discussion

## Overview

Systematic codebase refactoring with safety guarantees, leveraging Multi-LLM infrastructure from Phase 20-21.

## Implementation Preferences

| Decision | Choice | Notes |
|----------|--------|-------|
| Analysis approach | Hybrid | AST for metrics (fast, deterministic) + AI for semantic review (naming, patterns) |
| Checkpoint system | Git stash + branch | Clean history, easy rollback - just delete branch |
| Test generation | Generate alongside refactor | AI understands intent, generates meaningful tests |
| Patterns to detect | All | Structural (complexity, length) + Duplication + Naming/clarity |
| Change reporting | Full hybrid | Plain English summaries + technical diffs + visual diagrams |
| Scope control | All modes | Surgical, codebase-wide sweep, continuous background |
| Multi-model analysis | Always ask | User decides based on scope/budget each time |
| Prioritization | Impact score | Complexity reduction + blast radius + frequency + risk = score |

## Permanent Refactor Backlog

Create `.planning/REFACTOR-CANDIDATES.md` - a living document auto-populated during:
- `/tlc:build` (while writing code)
- `/tlc:review` (during code reviews)
- PR analysis (continuous mode)

Format:
```markdown
## Refactor Candidates (Auto-detected)

### High Priority (Impact 80+)
- [ ] src/api/handlers.js:45-120 - Extract 3 functions (Impact: 87)

### Medium Priority (Impact 50-79)
- [ ] src/services/payment.js:processPayment - 78 lines (Impact: 62)

### Low Priority (Impact <50)
- [ ] src/components/Form.tsx - could use pattern (Impact: 34)
```

## Edge Case Handling

| Scenario | Behavior |
|----------|----------|
| Refactoring fails mid-way | Auto-rollback to checkpoint + ask if retry |
| Tests fail after refactor | Try auto-fix (3 attempts), then rollback if still failing |
| Conflicting model suggestions | Show disagreement, let user pick |
| Large codebase (10k+ files) | Full scan with progress indicator + ETA |

## Constraints

| Constraint | Value |
|------------|-------|
| Language support | Based on project detection (auto) |
| Minimum test coverage | Use project default (80% from .tlc.json) |
| Budget limit | $5/session default (configurable) |
| Budget warning | At 80% of limit |

## Performance Targets

### Analysis Phase
- AST parsing: ~500ms per file
- AI semantic review: ~2-3s per file
- Full codebase (1000 files): ~30-45 min with multi-model
- Progress indicator with ETA

### Execution Phase
- Checkpoint creation: <5s
- Per-refactor apply: <10s
- Test run after each change

### Caching
- Cache AST analysis for unchanged files
- Cache AI results for 24hrs (same file hash)
- Skip re-analysis unless file modified

## Command Interface

```bash
# Analyze entire codebase
/tlc:refactor --analyze

# Analyze with multi-model consensus
/tlc:refactor --analyze --models

# Generate refactoring plan
/tlc:refactor --plan

# Execute refactoring (interactive)
/tlc:refactor --execute

# Target specific path
/tlc:refactor src/api/ --analyze

# Filter by severity
/tlc:refactor --analyze --severity high

# Filter by issue type
/tlc:refactor --analyze --issue "duplication"
```

## Reporting Outputs

1. **Plain English Summary** (for PO/QA)
   - "Extracted 'validateEmail' from 'createUser' - was 45 lines, now 12"
   - "Renamed 'x' to 'userCount' in 3 places for clarity"

2. **Technical Diff** (collapsible, for developers)
   - Standard unified diff format
   - Before/after code blocks

3. **Visual Diagrams** (for architecture changes)
   - Mermaid diagrams showing file/function relationships
   - Before/after comparison

## Dependencies

- Phase 20: Multi-LLM Infrastructure (model adapters, consensus engine)
- Phase 21: Review Command (file collector, review orchestrator patterns)

## Notes

- Auto-population of REFACTOR-CANDIDATES.md happens silently during normal TLC operations
- Users can run `/tlc:refactor` anytime to process the backlog
- Codebase-wide sweep is the primary use case for teams with accumulated tech debt
