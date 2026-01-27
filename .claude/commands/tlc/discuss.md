# /tlc:discuss - Discuss Phase Implementation

Capture implementation preferences before planning.

## What This Does

Gathers your preferences for HOW a phase should be built through adaptive questioning. Saves decisions to guide planning and test writing.

## Usage

```
/tlc:discuss [phase_number]
```

If no phase number, auto-detect current phase from ROADMAP.md.

## Process

### Step 1: Load Phase Context

Read from `.planning/ROADMAP.md` to get:
- Phase name and goal
- What comes before (context)
- What comes after (constraints)

### Step 2: Adaptive Questioning

Ask about implementation preferences. Adapt questions based on phase type.

**For UI/Frontend phases:**
```
Layout approach?
1) Component library (shadcn, MUI, etc.)
2) Custom components
3) Minimal styling (Tailwind only)

State management?
1) React state + context
2) Zustand / Jotai
3) Redux
4) Server state only (React Query)

Form handling?
1) React Hook Form
2) Formik
3) Native forms
```

**For API/Backend phases:**
```
API style?
1) REST
2) tRPC
3) GraphQL

Validation approach?
1) Zod schemas
2) Yup
3) Manual validation

Error handling?
1) Return error objects
2) Throw exceptions
3) Result types (Ok/Err)
```

**For Data/Database phases:**
```
Query approach?
1) Raw SQL
2) Query builder (Kysely, Knex)
3) ORM (Prisma, Drizzle)

Migration strategy?
1) Schema-first (Prisma migrate)
2) Code-first
3) Manual SQL migrations
```

**For Auth phases:**
```
Auth provider?
1) Custom (JWT + bcrypt)
2) NextAuth / Auth.js
3) Clerk / Auth0 / Supabase Auth

Session storage?
1) JWT in httpOnly cookie
2) Database sessions
3) Redis sessions
```

### Step 3: Capture Edge Cases

```
What edge cases should we handle?

- Empty states?
- Error states?
- Loading states?
- Offline behavior?
- Rate limiting?
```

### Step 4: Capture Constraints

```
Any constraints or requirements?

- Performance targets?
- Accessibility requirements?
- Browser support?
- Mobile considerations?
```

### Step 5: Save Discussion

Create `.planning/phases/{N}-DISCUSSION.md`:

```markdown
# Phase {N}: {Name} - Discussion

## Implementation Preferences

| Decision | Choice | Notes |
|----------|--------|-------|
| State management | Zustand | Simple, minimal boilerplate |
| Form handling | React Hook Form | Good validation support |
| API style | tRPC | Type-safe, good DX |

## Edge Cases to Handle

- [ ] Empty state when no data
- [ ] Error toast on API failure
- [ ] Optimistic updates for better UX

## Constraints

- Must work on mobile
- Target 100ms API response time

## Notes

[Any additional context from discussion]
```

### Step 6: Confirm and Continue

```
Discussion saved to .planning/phases/{N}-DISCUSSION.md

Ready to plan this phase?
1) Yes, continue to /tlc:plan
2) No, I'll plan later
```

## Example

```
> /tlc:discuss 2

Phase 2: User Dashboard

Let's discuss how to build this.

State management approach?
1) React state + context
2) Zustand
3) Server state only (React Query)

> 3

Data fetching?
1) REST + fetch
2) tRPC
3) React Query + REST

> 2

[...continues until preferences captured...]

Discussion saved.

Ready to plan? (Y/n)
```
