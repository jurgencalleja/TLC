#!/usr/bin/env bash
# TLC Memory Capture - Claude Code Stop Hook
#
# Reads Stop hook JSON from stdin, extracts the assistant response,
# and sends it to the TLC server for memory processing.
# Falls back to local spool when server is unreachable.
#
# This script MUST exit 0 always - capture failures never block Claude.

set -o pipefail

# Read stdin (Stop hook provides JSON)
INPUT=$(cat)

# Quick exit if no input
[ -z "$INPUT" ] && exit 0

# Use the capture-bridge Node.js module for reliable processing
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
BRIDGE_SCRIPT="$PROJECT_DIR/server/lib/capture-bridge.js"

if [ -f "$BRIDGE_SCRIPT" ]; then
  echo "$INPUT" | node -e "
    const bridge = require('$BRIDGE_SCRIPT');
    let input = '';
    process.stdin.on('data', d => input += d);
    process.stdin.on('end', async () => {
      const parsed = bridge.parseStopHookInput(input);
      if (!parsed || !parsed.assistantMessage) process.exit(0);

      const userMessage = parsed.transcriptPath
        ? bridge.extractLastUserMessage(parsed.transcriptPath)
        : null;

      await bridge.captureExchange({
        cwd: parsed.cwd || '$PROJECT_DIR',
        assistantMessage: parsed.assistantMessage,
        userMessage,
        sessionId: parsed.sessionId,
      });

      const path = require('path');
      const spoolDir = path.join(parsed.cwd || '$PROJECT_DIR', '.tlc', 'memory');
      await bridge.drainSpool(spoolDir);
    });
  " 2>/dev/null
fi

# Always exit 0 - never block Claude
exit 0
