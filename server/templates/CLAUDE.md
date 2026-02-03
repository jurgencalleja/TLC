<!-- TLC-STANDARDS -->

## Code Quality (TLC)

This project follows TLC (Test-Led Coding) code quality standards. See [CODING-STANDARDS.md](./CODING-STANDARDS.md) for detailed guidelines.

### Quick Reference

**Module Structure:** Organize by entity, not by type.

```
src/
  user/
    types/
    schemas/
    constants/
    user.service.js
    user.controller.js
  order/
    types/
    schemas/
    constants/
    order.service.js
```

**Never** use flat structures like `services/`, `interfaces/`, `types/` at root level.

### Key Rules

1. **No inline interfaces in services** - All types in separate files under `types/`
2. **No hardcoded URLs or config** - Use environment variables
3. **No magic strings** - Define constants in `constants/` folder
4. **JSDoc required** - Document all public functions, classes, and methods

### Standards Reference

For complete standards including file naming, import rules, error handling patterns, and service design guidelines, see [CODING-STANDARDS.md](./CODING-STANDARDS.md).
