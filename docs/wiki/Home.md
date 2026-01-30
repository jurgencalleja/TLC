# TLC Documentation

**Test-Led Coding for Claude Code. Tests before code. Automatically.**

---

## Start Here

| Your Experience | Start With |
|-----------------|------------|
| **Never coded before?** | [Noob Guide](noob.md) - Complete setup from zero |
| **Know how to code?** | [Skip Manual - Start](skip-manual-start.md) - 30-second setup |

---

## Quick Links

| Getting Started | Reference | Tutorials |
|-----------------|-----------|-----------|
| [Noob Guide](noob.md) | [All Commands](command-reference.md) | [Solo Developer](../tutorials/solo-developer.md) |
| [Quick Start](skip-manual-start.md) | [Configuration](configuration.md) | [Team Setup](../tutorials/team-setup.md) |
| [Core Workflow](getting-started.md#core-workflow) | [Troubleshooting](troubleshooting.md) | |

## What is TLC?

TLC enforces test-first development with AI coding assistants:

```
You describe → Tests written → Code implemented → Tests pass → Done
```

No manual testing. No "does this work?" No vibes.

## Installation

```bash
npm install -g tlc-claude-code
tlc
```

## Core Commands

| Command | Description |
|---------|-------------|
| `/tlc` | Smart entry point - knows what's next |
| `/tlc:plan` | Plan a phase |
| `/tlc:build` | Build phase (test-first) |
| `/tlc:verify` | Human verification |
| `/tlc:status` | Check test status |

## For Teams

| Command | Description |
|---------|-------------|
| `/tlc:claim` | Claim a task |
| `/tlc:who` | See team status |
| `/tlc:bug` | Report a bug |
| `tlc init` | Set up dev server |

## Documentation

### Wiki

- [Getting Started](getting-started.md) - Installation and first steps
- [Command Reference](command-reference.md) - All commands explained
- [Configuration](configuration.md) - `.tlc.json` options
- [Troubleshooting](troubleshooting.md) - Common issues and fixes

### Tutorials

- [Solo Developer](../tutorials/solo-developer.md) - Complete workflow for individuals
- [Team Setup](../tutorials/team-setup.md) - Guide for teams (3+ engineers)

### Guides

- [Team Workflow](../team-workflow.md) - Role-based collaboration guide
- [Dev Server](../devserver.md) - Deploy TLC dev server
- [Kubernetes Deployment](../kubernetes-deployment.md) - Deploy on K8s

## Philosophy

**Tests define behavior. Code makes tests pass.**

- Tests written BEFORE code
- Untested code gets flagged
- Coverage gaps get prioritized
- Human verification still happens

## Support

- [GitHub Issues](https://github.com/jurgencalleja/TLC/issues) - Report bugs
- [GitHub Discussions](https://github.com/jurgencalleja/TLC/discussions) - Ask questions

## License

MIT
