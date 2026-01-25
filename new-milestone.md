# /tdd:new-milestone - Start Next Version

Begin the next milestone after completing the previous one.

## What This Does

1. Gathers requirements for next version
2. Creates new roadmap with phases
3. Prepares for development

## Usage

```
/tdd:new-milestone [name]
```

Example:
```
/tdd:new-milestone v2.0
```

## Process

### Step 1: Check Previous Milestone

Verify previous milestone is complete:
- All phases verified
- Git tag exists
- Files archived

If not complete:
```
Previous milestone not complete.

Run /tdd:complete first.
```

### Step 2: Name the Milestone

If not provided:
```
What's the next version?

1) v2.0 (major - breaking changes)
2) v1.1 (minor - new features)
3) v1.0.1 (patch - bug fixes)
4) Custom name

>
```

### Step 3: Gather Requirements

```
What's new in {version}?

Describe the main goals for this milestone:
>
```

Follow-up questions:
```
Any specific features planned?
-
-
-

Breaking changes from v1.0?

Target timeline?
```

### Step 4: Create Roadmap

Based on requirements, create phases:

```
Milestone: v2.0

Proposed phases:

1. API v2 - New endpoint structure
2. Dashboard Redesign - Updated UI
3. Team Features - Multi-user support
4. Performance - Caching, optimization

Look good? (Y/n/adjust)
```

### Step 5: Save Roadmap

Create `.planning/ROADMAP.md`:

```markdown
# Roadmap - v2.0

## Overview

{Description of milestone goals}

## Phases

### Phase 1: API v2
Restructure API endpoints for v2 compatibility.

### Phase 2: Dashboard Redesign
Update UI with new design system.

### Phase 3: Team Features
Add multi-user support and permissions.

### Phase 4: Performance
Implement caching and optimize queries.

## Timeline

Target: {date}

## Notes

{Any constraints or considerations}
```

### Step 6: Update PROJECT.md

Add new milestone section:
```markdown
## Current Milestone: v2.0

Goal: {description}

Phases: 4
Status: Not started
```

### Step 7: Ready to Build

```
✅ Milestone v2.0 created!

Roadmap: .planning/ROADMAP.md
Phases: 4

Start with /tdd to begin Phase 1.
```

## Example

```
> /tdd:new-milestone

Previous milestone v1.0 complete ✓

Version name? > v2.0

What's new in v2.0?
> Adding team features and redesigning the dashboard

Breaking changes? > API endpoints will change

Proposed phases:
1. API v2 - New structure
2. Dashboard Redesign
3. Team Features
4. Migration Tools

Proceed? (Y/n) > y

✅ v2.0 roadmap created!

Run /tdd to start Phase 1.
```
