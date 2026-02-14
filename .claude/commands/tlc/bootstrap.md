# /tlc:bootstrap - Workspace Bootstrap

Clone all repos and set up a workspace on a new machine.

## Usage

```
/tlc:bootstrap
/tlc:bootstrap --dry-run
/tlc:bootstrap --skip-install
/tlc:bootstrap --parallel 5
```

## What This Does

1. Reads `projects.json` from the workspace root
2. Clones all repos that aren't already present
3. Checks out the correct branch per repo
4. Installs dependencies (npm install, pip install, etc.)
5. Rebuilds vector indexes from memory text files
6. Reports summary

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `--dry-run` | false | Show what would be cloned without doing it |
| `--skip-install` | false | Skip dependency installation |
| `--parallel N` | 3 | Number of concurrent clones |

## Process

### Step 1: Read Registry

Load `projects.json` from workspace root. If it doesn't exist:
```
No projects.json found.

Run /tlc:init to initialize this workspace, or create projects.json manually.
```

### Step 2: Clone Repos

For each project in the registry:
- If directory already exists with `.git/` → skip
- Otherwise → `git clone <url> <path>`
- Checkout the `defaultBranch`

### Step 3: Install Dependencies

For each cloned repo (unless `--skip-install`):
- Node.js (`package.json`) → `npm install`
- Python (`requirements.txt`) → `pip install -r requirements.txt`
- Go (`go.mod`) → `go mod download`

### Step 4: Rebuild Vectors

If Ollama is available:
- Pull embedding model: `ollama pull mxbai-embed-large`
- Rebuild vector indexes from memory text files

### Step 5: Summary

```
Workspace bootstrap complete:
  Cloned: 3 repos
  Skipped: 1 (already present)
  Failed: 0

All repos ready. Run /tlc:progress to see project status.
```

## Related Commands

- `/tlc:init` — Initialize TLC in an existing project
- `/tlc:recall` — Search workspace memory
- `/tlc:progress` — Check project status
