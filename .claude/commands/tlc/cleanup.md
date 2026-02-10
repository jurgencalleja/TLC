# /tlc:cleanup - Automatic Standards Cleanup

Automatically fix all coding standards violations. No prompts - just fixes everything and commits.

## What This Does

1. Ensures CLAUDE.md and CODING-STANDARDS.md exist
2. Runs full audit to find all issues
3. Fixes each issue automatically:
   - Extracts hardcoded config to environment variables
   - Migrates flat folders to entity-based structure
   - Extracts inline interfaces to types/ files
   - Replaces magic strings with constants
   - Adds missing JSDoc comments
   - **Splits oversized files** (>1000 lines) into focused sub-modules
   - **Organizes overcrowded folders** (>15 files) into domain subfolders
   - **Replaces `any` types** with proper interfaces or `unknown`
   - **Adds missing return types** to exported functions
4. Commits after each module/entity
5. Reports results when done

## Usage

```
/tlc:cleanup
```

## Process

### Step 1: Inject Standards

```javascript
const { injectStandards } = require('./lib/standards/standards-injector');
const results = await injectStandards(projectPath);
```

Creates CLAUDE.md and CODING-STANDARDS.md if missing.

### Step 2: Run Audit

```javascript
const { auditProject } = require('./lib/standards/audit-checker');
const auditResults = await auditProject(projectPath);
```

### Step 3: Fix Issues (No Prompts)

For each issue type, apply fixes automatically:

#### Hardcoded URLs/Ports
```javascript
// Before
fetch('http://localhost:3000/api');

// After
fetch(process.env.API_URL || 'http://localhost:3000' + '/api');
```

#### Flat Folders
```
src/services/user.service.ts → src/user/user.service.ts
src/services/product.service.ts → src/product/product.service.ts
```

All imports are updated automatically.

#### Inline Interfaces
```javascript
// Before (user.service.ts)
interface UserData { id: string; }
export class UserService { }

// After (user.service.ts)
import { UserData } from './types/user-data';
export class UserService { }

// New file (types/user-data.ts)
export interface UserData { id: string; }
```

#### Magic Strings
```javascript
// Before
if (status === 'active') { }

// After
import { STATUS_ACTIVE } from './constants/status';
if (status === STATUS_ACTIVE) { }

// New file (constants/status.ts)
export const STATUS_ACTIVE = 'active';
```

#### Missing JSDoc
```javascript
// Before
export function getUser(id: string): User { }

// After
/**
 * Gets a user by ID
 * @param id - The user ID
 * @returns The user
 */
export function getUser(id: string): User { }
```

#### Oversized Files (>1000 lines)
```
// Before: csp.controller.ts (2,041 lines)
// Analyze the file's responsibilities and split by feature:

// After:
modules/csp/
  controllers/
    policy.controller.ts      # Policy CRUD routes
    report.controller.ts      # Violation report routes
    directive.controller.ts   # Directive management routes
  csp.routes.ts               # Thin route registration
  csp.service.ts              # Shared business logic
```

**Split strategy:**
1. Count exported functions/methods and group by feature
2. Create a controller/service per feature group
3. Keep a thin "facade" file that re-exports or registers all routes
4. Move shared helpers to a utils file within the module

#### Overcrowded Folders (>15 files)
```
// Before: controllers/ with 22 files
// Group by domain:

// After:
modules/
  auth/       # auth.controller.ts, auth.service.ts
  user/       # user.controller.ts, user.service.ts
  billing/    # payment.controller.ts, invoice.controller.ts
  catalog/    # product.controller.ts, category.controller.ts
```

#### `any` Type Replacement
```typescript
// Before
function processData(data: any): any {
  return data.items;
}

// After
interface ProcessInput {
  items: unknown[];
}

function processData(data: ProcessInput): unknown[] {
  return data.items;
}
```

**Strategy:** Read how the variable is used, infer the shape, create an interface.

#### Missing Return Types
```typescript
// Before
export function calculateTotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// After
export function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

### Step 4: Commit After Each Module

After fixing all issues in an entity/module:

```bash
git add src/user/
git commit -m "refactor(user): apply coding standards

- Extract UserData interface to types/
- Replace magic strings with constants
- Add missing JSDoc
"
```

### Step 5: Report Results

```
TLC Cleanup Complete
═══════════════════════════════════════════════════════════════

Standards Injected:
  ✓ CLAUDE.md (created)
  ✓ CODING-STANDARDS.md (created)

Issues Fixed: 11
  - 4 hardcoded URLs extracted to env vars
  - 3 flat folders migrated
  - 2 inline interfaces extracted
  - 2 magic strings replaced

Commits Created: 4
  - refactor(user): apply coding standards
  - refactor(product): apply coding standards
  - refactor(order): apply coding standards
  - refactor(config): extract environment variables

All checks now pass. Run /tlc:audit to verify.
```

## Example

```
> /tlc:cleanup

TLC Cleanup - Automatic Standards Fix
═══════════════════════════════════════════════════════════════

Injecting standards files...
  ✓ Created CLAUDE.md
  ✓ Created CODING-STANDARDS.md

Running audit...
  Found 11 issues to fix

Fixing issues...
  [1/11] Extracting http://localhost:3000 to API_URL...
  [2/11] Extracting port 3000 to PORT...
  [3/11] Migrating src/services/user.service.ts...
  [4/11] Migrating src/services/product.service.ts...
  [5/11] Extracting interface UserData...
  [6/11] Replacing magic string 'active'...
  [7/11] Adding JSDoc to getUser()...
  ...

Committing changes...
  ✓ refactor(user): apply coding standards
  ✓ refactor(product): apply coding standards
  ✓ refactor(config): extract environment variables

═══════════════════════════════════════════════════════════════
CLEANUP COMPLETE - 11 issues fixed, 3 commits created
═══════════════════════════════════════════════════════════════
```

## When to Use

- **New project**: Run once after `tlc init` to establish standards
- **Imported project**: Run after importing a Replit or external project
- **Quick fix**: When you just want everything fixed without reviewing

## See Also

- `/tlc:audit` - Check without fixing
- `/tlc:refactor` - Fix step-by-step with previews
