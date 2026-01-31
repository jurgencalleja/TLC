# /tlc:docs - Documentation Maintenance

Automatically maintain your project's documentation, screenshots, and wiki.

## Usage

```bash
/tlc:docs                    # Full docs update
/tlc:docs setup              # Set up automation (first time)
/tlc:docs screenshots        # Capture app screenshots
/tlc:docs readme             # Update README
/tlc:docs api                # Generate API docs
```

## What This Does

### Setup (`/tlc:docs setup`)

First-time setup for your project:

1. Creates `docs/` directory structure
2. Adds `.github/workflows/docs-sync.yml` for auto-sync on push
3. Adds npm scripts (`npm run docs`, `npm run docs:screenshots`)
4. Creates initial `docs/getting-started.md`

After setup, docs update automatically on every push.

### Full Update (`/tlc:docs`)

1. **Updates version references** in all docs
2. **Generates API docs** (TypeDoc for TypeScript)
3. **Captures screenshots** of running app (via Playwright)
4. **Validates links** in documentation

### Screenshots (`/tlc:docs screenshots`)

Uses Playwright to capture real screenshots:

1. Installs Playwright if not present
2. Launches headless browser
3. Captures pages at common URLs:
   - `localhost:3000` (homepage)
   - `localhost:3000/dashboard`
   - `localhost:5001` (TLC app proxy)
   - `localhost:3147` (TLC dashboard)
4. Saves to `docs/images/`

**Note:** Your app should be running for screenshots to work.

## Automation

Once set up, GitHub Actions automatically:

1. **On every push to main:**
   - Updates version references
   - Syncs to GitHub Wiki
   - Commits any doc changes

2. **You don't need to manually maintain docs.** Just push code.

## Process

### Step 1: Run Setup (Once)

```
/tlc:docs setup

Setting up documentation automation...

  ✓ Created docs/ directory
  ✓ Created docs/images/ directory
  ✓ Created .github/workflows/docs-sync.yml
  ✓ Added docs scripts to package.json
  ✓ Created docs/getting-started.md

✓ Documentation setup complete!

Next steps:
  1. Push to GitHub to enable wiki sync
  2. Run /tlc:docs to update documentation
  3. Run /tlc:docs screenshots to capture app screenshots
```

### Step 2: Update Docs (Anytime)

```
/tlc:docs

TLC Documentation Update
══════════════════════════════════════════════════

Project: my-app v1.2.0

📄 README
  ✓ Updated version references

📚 API Documentation
  Detecting TypeScript, using TypeDoc...
  ✓ Generated API docs in docs/api/

📸 Screenshots
  ✓ homepage.png
  ✓ dashboard.png
  ⚠ app.png (app not running)

══════════════════════════════════════════════════

✓ Documentation updated!
```

### Step 3: Push (Auto-Sync)

```bash
git push
```

GitHub Actions will:
- Sync docs to GitHub Wiki
- Update any version references
- Commit changes back

## Configuration

In `.tlc.json` (optional):

```json
{
  "docs": {
    "dir": "docs",
    "screenshots": {
      "urls": [
        { "url": "http://localhost:3000", "name": "home" },
        { "url": "http://localhost:3000/login", "name": "login" }
      ]
    },
    "api": {
      "enabled": true,
      "output": "docs/api"
    }
  }
}
```

## CLI Usage

Also available as standalone command:

```bash
npx tlc-docs              # Full update
npx tlc-docs setup        # First-time setup
npx tlc-docs screenshots  # Capture screenshots
npx tlc-docs api          # Generate API docs
```

Or add to package.json scripts:

```json
{
  "scripts": {
    "docs": "tlc-docs",
    "docs:screenshots": "tlc-docs screenshots"
  }
}
```

## Requirements

- **Playwright** (auto-installed for screenshots)
- **TypeDoc** (auto-used if TypeScript detected)
- **GitHub repo** (for wiki sync)

## Troubleshooting

### Screenshots not capturing

Make sure your app is running:
```bash
npm start
# In another terminal:
/tlc:docs screenshots
```

### Wiki not syncing

1. Enable GitHub Wiki in repo settings
2. Push to main branch
3. Check Actions tab for workflow status

### API docs not generating

TypeDoc requires TypeScript. Check:
```bash
npm install -D typescript typedoc
```
