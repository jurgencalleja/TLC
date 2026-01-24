# /tdd:new-project - Start a New Project

Initialize a new project with test-led development.

## What This Does

Calls `/gsd:new-project` with TDD conventions automatically added to PROJECT.md.

## Process

1. **Run GSD new-project flow**
   - Questions → Research → Requirements → Roadmap
   
2. **After PROJECT.md is created, append TDD conventions:**

```markdown
## Development Methodology: Test-Led Development

This project uses TDD. All implementation follows Red → Green → Refactor:

1. **Red**: Write failing tests that define expected behavior
2. **Green**: Write minimum code to make tests pass  
3. **Refactor**: Clean up while keeping tests green

Tests are written BEFORE implementation, not after.
```

3. **Detect or set up test framework** based on stack chosen during setup:

| Stack | Framework | Config |
|-------|-----------|--------|
| Next.js / React | Vitest | `vitest.config.ts` |
| Node.js | Vitest or Jest | `vitest.config.ts` |
| Python | pytest | `pytest.ini` or `pyproject.toml` |
| Go | go test | (built-in) |
| Ruby | RSpec | `.rspec`, `spec/spec_helper.rb` |

4. **Create test directory structure** if it doesn't exist:
   - `tests/` or `__tests__/` or `spec/` depending on convention
   - Example test file showing project patterns

5. **Add test script** to package.json / pyproject.toml / Makefile:
   ```json
   "scripts": {
     "test": "vitest run",
     "test:watch": "vitest"
   }
   ```

## Usage

```
/tdd:new-project
```

Same interactive flow as GSD, but you end up with test infrastructure ready to go.
