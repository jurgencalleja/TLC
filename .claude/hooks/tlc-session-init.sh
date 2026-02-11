#\!/bin/bash
# TLC Enforcement Layer 2b: Inject TLC state on session start/resume
# Ensures Claude is TLC-aware from the very first turn.

if [ -f ".tlc.json" ]; then
  echo "TLC project detected. All work goes through /tlc commands. Run /tlc for current status and next action."
fi
