#!/bin/bash
# TLC Enforcement Layer 2b: Inject TLC state on session start/resume
# Ensures Claude is TLC-aware from the very first turn.
# Also ensures the TLC server is running (safety net for LaunchAgent).

if [ -f ".tlc.json" ]; then
  echo "TLC project detected. All work goes through /tlc commands. Run /tlc for current status and next action."

  # Check if TLC server is running
  TLC_PORT="${TLC_PORT:-3147}"
  if curl -sf --max-time 1 "http://localhost:${TLC_PORT}/api/health" > /dev/null 2>&1; then
    : # Server is running, nothing to do
  else
    PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
    PLIST="$HOME/Library/LaunchAgents/com.tlc.server.plist"

    if [ -f "$PLIST" ]; then
      # LaunchAgent installed — kickstart it
      launchctl kickstart -k "gui/$(id -u)/com.tlc.server" 2>/dev/null
    elif [ -f "$PROJECT_DIR/server/index.js" ]; then
      # No LaunchAgent — start server in background
      nohup node "$PROJECT_DIR/server/index.js" > "$HOME/.tlc/logs/server.log" 2>&1 &
    fi

    # Wait up to 3 seconds for server to come up
    for i in 1 2 3; do
      sleep 1
      if curl -sf --max-time 1 "http://localhost:${TLC_PORT}/api/health" > /dev/null 2>&1; then
        break
      fi
    done
  fi
fi
