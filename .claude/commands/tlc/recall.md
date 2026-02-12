# /tlc:recall - Semantic Memory Search

Search your project's memory by meaning. "What did we decide about X?"

## Usage

```
/tlc:recall <query>
```

## What This Does

1. Searches the vector memory store using semantic similarity
2. Ranks results by: similarity (50%) + recency (25%) + project relevance (25%)
3. Returns top-5 results with scores, types, and excerpts
4. Permanent memories get a 1.2x boost in scoring

## Options

```
/tlc:recall database architecture
/tlc:recall --scope workspace authentication approach
/tlc:recall --type decision deployment strategy
/tlc:recall --limit 10 API design
```

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--scope` | `project`, `workspace`, `global` | `project` | Search scope (auto-widens if few results) |
| `--type` | `decision`, `gotcha`, `conversation`, `all` | `all` | Filter by memory type |
| `--limit` | 1-20 | 5 | Maximum results |

## Process

### Step 1: Parse Query

Extract the search query and any flags from the arguments.

### Step 2: Semantic Search

1. Generate embedding for the query
2. Search vector store for nearest neighbors
3. Score results: `similarity * 0.5 + recency * 0.25 + projectRelevance * 0.25`
4. Boost permanent memories by 1.2x
5. Apply scope, type, and limit filters

### Step 3: Display Results

```
## Memory Recall: "database architecture"

1. **Use SQLite for vector storage** (92% match) [decision]
   Date: 2026-02-09
   Zero infrastructure, single file, ships with TLC
   Source: memory/decisions/2026-02-09-use-sqlite-for-vector-storage.md

2. **[PERMANENT] Always use WAL mode** (87% match) [gotcha]
   Date: 2026-02-08
   WAL mode required for concurrent reads during indexing
   Source: memory/gotchas/2026-02-08-always-use-wal-mode.md

3. **Database migration strategy** (81% match) [conversation]
   Date: 2026-02-07
   Discussed migration approach, decided on schema-first
   Source: memory/conversations/2026-02-07-database-migration.md
```

### Step 4: Fallback

If the vector store is unavailable (Ollama not running, no embeddings):
- Falls back to keyword-based text search
- Shows a notice that semantic search is unavailable

## Examples

```
/tlc:recall what database should we use
/tlc:recall deployment strategy --scope global
/tlc:recall --type decision authentication
/tlc:recall testing approach --limit 10
```

## Graceful Degradation

- **No Ollama**: Falls back to text search with keyword matching
- **Empty store**: Shows "No memories indexed yet" with guidance to run `/tlc:remember`
- **No results**: Shows "No matching memories" with search suggestions
