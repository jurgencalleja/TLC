# TLC - Test Led Coding

## Overview

TLC is a Claude Code workflow that enforces test-driven development. It provides slash commands (`/tlc`, `/tlc:new-project`, `/tlc:init`, etc.) that guide developers to write tests before implementation.

## Tech Stack

- **Runtime:** Node.js
- **Package:** npm (tlc-claude-code)
- **Dashboard:** React + Ink (terminal UI)
- **Testing:** Vitest
- **Language:** TypeScript

## Project Structure

```
TLC/
├── bin/
│   └── install.js       # CLI installer (npx tlc-claude-code)
├── dashboard/
│   └── src/
│       ├── App.tsx      # Main TUI app
│       ├── index.tsx    # Entry point
│       └── components/  # UI panes (Chat, GitHub, Agents, etc.)
├── *.md                 # Slash command definitions
└── package.json         # npm package config
```

## Development Methodology: Test-Led Development

This project uses TLC. All new implementation follows Red -> Green -> Refactor:

1. **Red**: Write failing tests that define expected behavior
2. **Green**: Write minimum code to make tests pass
3. **Refactor**: Clean up while keeping tests green

Tests are written BEFORE implementation, not after.

## Test Framework

- **Framework:** Vitest
- **Run tests:** `cd dashboard && npm test`
- **Watch mode:** `cd dashboard && npm run test:watch`
- **Test directory:** `dashboard/src/` (co-located with source)
- **Pattern:** `*.test.ts`, `*.test.tsx`
