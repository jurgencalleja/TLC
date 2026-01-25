# /tlc:quick - Quick Task with Tests

For ad-hoc tasks that don't need full phase planning, but still deserve tests.

## What This Does

1. **Ask what you want to do**
2. **Write a failing test** for it
3. **Implement** to pass the test
4. **Verify** test passes

Lighter weight than `/tlc:build`, but still test-first.

## Usage

```
/tlc:quick
```

## Example

```
User: /tlc:quick

Claude: What do you want to do?

User: Add a dark mode toggle to settings

Claude: Writing test...

Created: tests/settings/dark-mode.test.ts
- toggles dark mode on click
- persists preference to localStorage
- applies dark class to document

Running test... ❌ Failing (expected)

Implementing...

Running test... ✅ Passing

Done. Dark mode toggle added with test coverage.
```

## When to Use

- Bug fixes
- Small features
- Config changes
- One-off tasks

For anything bigger, use the full flow: `/tlc:plan` → `/tlc:build` → `/tlc:verify`
