# TLC Documentation

**Test-Led Coding for Claude Code. Tests before code. Automatically.**

---

## Start Here

| Your Experience | Start With |
|-----------------|------------|
| **Never coded before?** | [[noob|Noob Guide]] - Complete setup from zero |
| **Know how to code?** | [[skip-manual-start|Skip Manual - Start]] - 30-second setup |

---

## Quick Links

| Getting Started | Reference | Tutorials |
|-----------------|-----------|-----------|
| [[noob|Noob Guide]] | [[command-reference|All Commands]] | [Solo Developer](https://github.com/jurgencalleja/TLC/blob/main/docs/tutorials/solo-developer.md) |
| [[skip-manual-start|Quick Start]] | [[configuration|Configuration]] | [Team Setup](https://github.com/jurgencalleja/TLC/blob/main/docs/tutorials/team-setup.md) |
| [[getting-started|Core Workflow]] | [[troubleshooting|Troubleshooting]] | |

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

- [[getting-started|Getting Started]] - Installation and first steps
- [[command-reference|Command Reference]] - All commands explained
- [[configuration|Configuration]] - `.tlc.json` options
- [[troubleshooting|Troubleshooting]] - Common issues and fixes

### Tutorials

- [Solo Developer](https://github.com/jurgencalleja/TLC/blob/main/docs/tutorials/solo-developer.md) - Complete workflow for individuals
- [Team Setup](https://github.com/jurgencalleja/TLC/blob/main/docs/tutorials/team-setup.md) - Guide for teams (3+ engineers)

### Guides

- [Team Workflow](https://github.com/jurgencalleja/TLC/blob/main/docs/team-workflow.md) - Role-based collaboration guide
- [Dev Server](https://github.com/jurgencalleja/TLC/blob/main/docs/devserver.md) - Deploy TLC dev server
- [Kubernetes Deployment](https://github.com/jurgencalleja/TLC/blob/main/docs/kubernetes-deployment.md) - Deploy on K8s

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
