# TLC Troubleshooting Guide

Common issues and solutions.

## Installation Issues

### "tlc: command not found"

**Cause:** Global npm bin not in PATH.

**Solution:**
```bash
# Find npm global bin
npm config get prefix

# Add to PATH (bash)
export PATH="$PATH:$(npm config get prefix)/bin"

# Or use npx
npx tlc-claude-code
```

### Commands not appearing in Claude Code

**Cause:** Commands installed to wrong location.

**Solution:**
```bash
# Reinstall with --global flag
npx tlc-claude-code --global

# Verify installation
ls ~/.claude/commands/tlc/
```

### Permission denied on install

**Cause:** npm global directory permissions.

**Solution:**
```bash
# Option 1: Fix permissions
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# Option 2: Use nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v2.0.1/install.sh | bash
nvm install node
```

## Test Framework Issues

### "No test framework detected"

**Cause:** TLC can't find test configuration.

**Solution:**
```bash
# Run config wizard
/tlc:config

# Or manually create .tlc.json
{
  "testFrameworks": {
    "primary": "mocha",
    "installed": ["mocha", "chai"],
    "run": ["mocha"]
  }
}
```

### Tests pass but TLC says failing

**Cause:** Test command mismatch.

**Solution:**
Check `.tlc.json` commands:
```json
{
  "commands": {
    "test": "npm test"  // Must match your actual test command
  }
}
```

### Coverage not detected

**Cause:** Coverage reporter not configured.

**Solution:**

For Mocha:
```bash
npm install -D nyc
# package.json
"scripts": {
  "coverage": "nyc npm test"
}
```

For Vitest:
```javascript
// vitest.config.js
export default {
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['json', 'text']
    }
  }
}
```

## Build Issues

### "Cannot read plan file"

**Cause:** Plan file doesn't exist or wrong phase number.

**Solution:**
```bash
# Check what plans exist
ls .planning/phases/

# Create plan first
/tlc:plan 1
```

### Tests error instead of fail

**Cause:** Import/require errors in test files.

**Solution:**
1. Check imports point to correct paths
2. Add mocks for external dependencies
3. Ensure test framework is properly configured

```javascript
// Add mock for dependency
const proxyquire = require('proxyquire');
const myModule = proxyquire('../src/module', {
  'external-dep': { method: () => 'mocked' }
});
```

### Overdrive spawning too many agents

**Cause:** Default agent count too high.

**Solution:**
```bash
# Limit agents
/tlc:build 1 --agents 3

# Or force sequential
/tlc:build 1 --sequential
```

## Team Collaboration Issues

### "Task already claimed"

**Cause:** Another team member claimed the task.

**Solution:**
```bash
# Check who has it
/tlc:who

# Pick a different task
/tlc:claim 3
```

### Git conflicts on claim

**Cause:** Multiple people modified PLAN.md.

**Solution:**
```bash
# Pull latest
git pull --rebase

# Resolve conflicts in PLAN.md
# Keep both claims if different tasks

# Push
git push
```

### Username not detected

**Cause:** Git user.name not set.

**Solution:**
```bash
# Set git username
git config user.name "Your Name"

# Or use TLC_USER env var
export TLC_USER="yourname"
```

## Dev Server Issues

### "Docker not found"

**Cause:** Docker not installed or not in PATH.

**Solution:**
1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Ensure Docker daemon is running
3. Verify: `docker --version`

### Port already in use

**Cause:** Another process using port 3147, 5001, or 5433.

**Solution:**
```bash
# Find process using port
lsof -i :3147

# Kill it
kill -9 <PID>

# Or change port in .tlc.json
{
  "devServer": {
    "port": 3148
  }
}
```

### Container fails to start

**Cause:** Docker build error or missing dependencies.

**Solution:**
```bash
# Rebuild containers
tlc rebuild

# Check logs
docker-compose -f docker-compose.dev.yml logs

# Clean slate
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up --build
```

### Hot reload not working

**Cause:** File watcher not detecting changes.

**Solution:**
1. Check if file is in mounted volume
2. Increase file watcher limit (Linux):
```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Review Issues

### "No changed files found"

**Cause:** Comparing wrong branches.

**Solution:**
```bash
# Specify base branch
/tlc:review --base develop

# Check current branch
git branch
```

### PR review not posting

**Cause:** Missing GitHub token.

**Solution:**
```bash
# Set token
export GITHUB_TOKEN=ghp_xxxxx

# Or use gh CLI auth
gh auth login
```

### Security false positives

**Cause:** Pattern matching too aggressive.

**Solution:**
Add to `.tlc.json`:
```json
{
  "review": {
    "ignorePatterns": [
      "test/fixtures/",
      "*.example.js"
    ]
  }
}
```

## CI/CD Issues

### "Coverage below threshold"

**Cause:** New code not tested.

**Solution:**
1. Check which files need tests:
   ```bash
   /tlc:coverage
   ```
2. Add missing tests
3. Or lower threshold temporarily:
   ```bash
   /tlc:ci --threshold 70
   ```

### Workflow file not generated

**Cause:** Can't detect CI provider.

**Solution:**
```bash
# Specify provider
/tlc:ci --provider github

# Or set in .tlc.json
{
  "ci": {
    "provider": "github"
  }
}
```

## Performance Issues

### TLC commands slow

**Cause:** Large codebase or many tests.

**Solution:**
1. Use Overdrive for parallel execution
2. Run specific test files:
   ```bash
   npm test -- tests/specific.test.js
   ```
3. Increase Node memory:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" /tlc:build 1
   ```

### Dashboard loading slowly

**Cause:** Large log files or many tasks.

**Solution:**
1. Clear old logs:
   ```bash
   rm .planning/phases/*-TESTS.md
   ```
2. Archive completed phases
3. Use pagination in dashboard

## Getting Help

If you can't find a solution:

1. **Check logs:**
   ```bash
   TLC_DEBUG=true /tlc:build 1
   ```

2. **Report issue:**
   [GitHub Issues](https://github.com/jurgencalleja/TLC/issues)

3. **Include:**
   - TLC version (`tlc --version`)
   - Node version (`node --version`)
   - OS and version
   - Error message
   - Steps to reproduce
