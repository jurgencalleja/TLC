# Phase 38 Test Plan

Generated: 2026-02-02
Status: ❌ Tests failing (Red) - Implementation needed

## Test Files

| File | Tests | Status |
|------|-------|--------|
| src/components/ui/Modal.test.tsx | 15 | ❌ File not found |
| src/components/ui/Dropdown.test.tsx | 14 | ❌ File not found |
| src/components/ui/Toast.test.tsx | 15 | ❌ File not found |
| src/components/ui/Skeleton.test.tsx | 18 | ❌ File not found |
| src/components/layout/MobileNav.test.tsx | 12 | ❌ File not found |
| src/stores/uiStore.test.ts | 12 | ❌ File not found |
| src/stores/projectStore.test.ts | 14 | ❌ File not found |
| src/hooks/useTheme.test.ts | 12 | ❌ File not found |
| src/hooks/useWebSocket.test.ts | 14 | ❌ File not found |

## Coverage Map

| Test | Task |
|------|------|
| Modal renders children when open | Task 1 |
| Modal doesn't render when closed | Task 1 |
| Escape key triggers onClose | Task 1 |
| Focus trap within modal | Task 1 |
| Dropdown opens on click | Task 2 |
| Arrow keys navigate options | Task 2 |
| Multi-select allows multiple | Task 2 |
| Toast renders variants | Task 3 |
| Toast auto-dismisses | Task 3 |
| ToastContainer stacks toasts | Task 3 |
| Skeleton renders placeholder | Task 4 |
| Skeleton variants (text, avatar, card) | Task 4 |
| MobileNav renders items | Task 5 |
| MobileNav shows active indicator | Task 5 |
| uiStore toggles theme | Task 6 |
| projectStore manages selection | Task 6 |
| useTheme provides colors | Task 7 |
| useWebSocket connects | Task 7 |

## Implementation Order

1. **Task 1: Modal** - Foundation for dialogs
2. **Task 2: Dropdown** - Foundation for selects
3. **Task 3: Toast** - Notifications (includes useToast hook)
4. **Task 4: Skeleton** - Loading states
5. **Task 5: MobileNav** - Mobile navigation
6. **Task 6: Stores** - State management
7. **Task 7: Hooks** - Data fetching hooks

## Notes

- All tests written using Vitest + ink-testing-library pattern
- Tests follow existing project conventions
- Components will be Ink-based for terminal rendering
