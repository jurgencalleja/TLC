# Multi-Model Setup Guide

Configure TLC to use multiple AI providers (Claude, Codex, Gemini) for different tasks.

## Why Multiple Models?

| Model | Best For | Cost |
|-------|----------|------|
| Claude | Code gen, refactoring, complex reasoning | $$$ |
| Codex | Code review, simple generation | $$ |
| Gemini | Vision, design analysis, screenshots | $ |

TLC routes tasks to the optimal model automatically.

## Quick Setup

### Step 1: Install CLIs

```bash
# Claude CLI (Anthropic)
npm install -g @anthropic-ai/claude-code

# Codex CLI (OpenAI)
npm install -g @openai/codex

# Gemini CLI (Google)
npm install -g @google/gemini-cli
```

### Step 2: Verify Installation

```bash
which claude && echo "✓ Claude installed"
which codex && echo "✓ Codex installed"
which gemini && echo "✓ Gemini installed"
```

If any are missing, check:
- Installation succeeded without errors
- The binary location is in your PATH
- You may need to restart your terminal

### Step 3: Configure TLC

Run the setup wizard:
```bash
/tlc:llm config
```

Or manually add to `.tlc.json`:

```json
{
  "router": {
    "providers": {
      "claude": {
        "type": "cli",
        "command": "claude",
        "capabilities": ["review", "code-gen", "refactor"]
      },
      "codex": {
        "type": "cli",
        "command": "codex",
        "capabilities": ["review", "code-gen"]
      },
      "gemini": {
        "type": "cli",
        "command": "gemini",
        "capabilities": ["design", "vision", "analyze"]
      }
    },
    "capabilities": {
      "review": {
        "providers": ["claude", "codex"],
        "fallback": "claude"
      },
      "code-gen": {
        "providers": ["claude"],
        "fallback": "codex"
      },
      "refactor": {
        "providers": ["claude"]
      },
      "design": {
        "providers": ["gemini"]
      },
      "vision": {
        "providers": ["gemini"]
      }
    }
  }
}
```

### Step 4: Verify Setup

```bash
/tlc:llm status
```

Expected output:
```
Providers:
  claude   ✓ /usr/local/bin/claude    [review, code-gen, refactor]
  codex    ✓ /usr/local/bin/codex     [review, code-gen]
  gemini   ✓ /usr/local/bin/gemini    [design, vision]

All providers available.
```

## Capability Routing

TLC automatically routes tasks based on capability:

| Task | Capability | Routes To |
|------|------------|-----------|
| `/tlc:review` | review | Claude + Codex (consensus) |
| `/tlc:build` | code-gen | Claude |
| `/tlc:refactor` | refactor | Claude |
| `/tlc:vision analyze` | vision | Gemini |
| `/tlc:design import` | design | Gemini |

## Fallback Behavior

If primary provider fails:
1. TLC tries the `fallback` provider
2. If no fallback, task fails with error
3. Cost tracking continues across providers

## Cost Tracking

View usage and costs:
```bash
/tlc:usage
```

Set budget limits in `.tlc.json`:
```json
{
  "router": {
    "budget": {
      "daily": 10.00,
      "monthly": 100.00,
      "alerts": [0.5, 0.8, 1.0]
    }
  }
}
```

## Troubleshooting

### CLI not found

```bash
# Check if installed
npm list -g | grep claude

# Check PATH
echo $PATH

# Add npm global to PATH (add to ~/.zshrc or ~/.bashrc)
export PATH="$HOME/.npm-global/bin:$PATH"
```

### Permission denied

```bash
# Fix npm permissions
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
```

### Provider test fails

```bash
# Test individual provider
/tlc:llm test claude
/tlc:llm test codex
/tlc:llm test gemini
```

## macOS-Specific Notes

1. **Homebrew users**: Some CLIs may be available via brew
2. **M1/M2 Macs**: All CLIs support ARM64
3. **Path issues**: Use `~/.zshrc` not `~/.bashrc` for PATH changes

## See Also

- `/tlc:llm` - Full command reference
- `/tlc:usage` - View cost tracking
- `/tlc:models` - List available models
