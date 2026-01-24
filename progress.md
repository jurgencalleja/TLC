# /tdd:progress - Where Am I?

Check current project status and what's next.

## What This Does

Calls `/gsd:progress` plus shows test status.

## Usage

```
/tdd:progress
```

## Output Example

```
Project: My App
Milestone: v1.0

Phase 1: User Auth       ✅ Complete (tests: 11/11 passing)
Phase 2: Dashboard       🔄 In Progress (tests: 6/12 passing)
Phase 3: Settings        ⏳ Not Started

Current: Phase 2, implementing task 3 of 5

Next action: /tdd:build 2 (continue implementation)
```
