# /tdd:plan - Plan a Phase

Research and create implementation plans for a phase.

## What This Does

Calls `/gsd:plan-phase` — no TDD-specific logic needed here.

Plans are created as usual. Tests get written when you run `/tdd:build`.

## Usage

```
/tdd:plan [phase_number]
```

## Example

```
/tdd:plan 1
```

Creates `{phase}-RESEARCH.md` and `{phase}-*-PLAN.md` files with task breakdowns.
