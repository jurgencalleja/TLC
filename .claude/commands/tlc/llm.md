# /tlc:llm - Multi-Model Configuration

Configure and manage multiple LLM providers (Claude, Codex, Gemini, etc.)

## Usage

```
/tlc:llm config    # Interactive setup wizard
/tlc:llm status    # Show detected providers and their status
/tlc:llm models    # List available models
/tlc:llm test      # Test all configured providers
```

## Process

### /tlc:llm config

Interactive setup to configure providers in `.tlc.json`:

1. **Detect installed CLIs** - Scan PATH for claude, codex, gemini
2. **Configure capabilities** - Map tasks to providers:
   - `review` → Claude, Codex (consensus)
   - `code-gen` → Claude (primary)
   - `vision` → Gemini
   - `design` → Gemini
3. **Set fallbacks** - What to use if primary fails
4. **Save to .tlc.json**

### /tlc:llm status

Show current configuration:

```
Providers:
  claude   ✓ /usr/local/bin/claude    [review, code-gen, refactor]
  codex    ✓ /usr/local/bin/codex     [review, code-gen]
  gemini   ✗ not found                [design, vision]

Capabilities:
  review    → claude, codex (fallback: claude)
  code-gen  → claude
  vision    → gemini (unavailable)
```

### /tlc:llm models

List models available from each provider.

### /tlc:llm test

Test each provider with a simple prompt to verify connectivity.

## Manual Configuration

Add to `.tlc.json`:

```json
{
  "router": {
    "providers": {
      "claude": {
        "type": "cli",
        "command": "claude",
        "model": "claude-4-opus",
        "capabilities": ["review", "code-gen", "refactor"]
      },
      "codex": {
        "type": "cli",
        "command": "codex",
        "model": "gpt-5.2",
        "capabilities": ["review", "code-gen"]
      },
      "gemini": {
        "type": "cli",
        "command": "gemini",
        "model": "gemini-3-preview",
        "capabilities": ["design", "vision"]
      }
    },
    "capabilities": {
      "review": { "providers": ["claude", "codex"], "fallback": "claude" },
      "code-gen": { "providers": ["claude"] },
      "design": { "providers": ["gemini"] },
      "vision": { "providers": ["gemini"] }
    }
  }
}
```

## Supported Models

**Claude:** claude-4-opus, claude-4-sonnet, claude-3.5-sonnet, claude-3-opus, claude-3-sonnet, claude-3-haiku

**OpenAI/Codex:** gpt-5.2, gpt-5, gpt-4o, gpt-4o-mini, gpt-4-turbo, o3, o3-mini, o1, o1-mini, o1-pro

**Gemini:** gemini-3-preview, gemini-3, gemini-2.5-pro, gemini-2.0-flash, gemini-2.0-flash-thinking, gemini-1.5-pro

**DeepSeek:** deepseek-r1, deepseek-chat, deepseek-coder

## Installing Providers

### Claude CLI
```bash
npm install -g @anthropic-ai/claude-code
```

### Codex CLI (OpenAI)
```bash
npm install -g @openai/codex
```

### Gemini CLI (Google)
```bash
# Check Google's official package name
npm install -g @google/gemini-cli
```

## Verify Installation

```bash
which claude codex gemini
```

All three should return paths. If not, add to your PATH.
