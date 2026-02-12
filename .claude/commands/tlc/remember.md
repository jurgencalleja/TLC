# /tlc:remember - Permanent Memory Capture

Save important context permanently so it survives context compaction.

## Usage

```
/tlc:remember <text>
```

Or without arguments to capture recent exchanges:
```
/tlc:remember
```

## What This Does

1. Captures the provided text (or recent conversation) as a **permanent memory**
2. Writes it to `memory/conversations/` with `[PERMANENT]` prefix and `permanent: true` frontmatter
3. Indexes it in the vector store for semantic recall
4. Permanent memories are **never pruned** and get a **1.2x boost** in recall scoring

## Process

### Step 1: Determine What to Remember

**With text argument:**
- Use the provided text as the memory content

**Without arguments:**
- Capture the recent conversation exchanges from the current session
- Generate a summary from the exchanges

### Step 2: Write Permanent Memory

1. Create a conversation chunk with `permanent: true`
2. Title prefixed with `[PERMANENT]`
3. Write to `memory/conversations/YYYY-MM-DD-{slug}.md`
4. YAML frontmatter includes `permanent: true`

### Step 3: Index in Vector Store

1. Generate embedding for the memory content
2. Store in vector database with `permanent = 1` flag
3. This memory will be boosted 1.2x in future recall searches

### Step 4: Confirm

```
Remembered permanently: {summary}
File: memory/conversations/2026-02-09-always-use-utc.md
```

## Examples

```
/tlc:remember Always use UTC timestamps in the database, never local time

/tlc:remember The API rate limit is 100 requests per minute per user

/tlc:remember
(captures recent conversation context)
```

## When to Use

- **Architecture decisions** that should never be forgotten
- **Environment gotchas** that are hard to rediscover
- **Team conventions** that must be consistent
- **Critical constraints** from stakeholders
- Any knowledge you want to survive across sessions and context compaction
