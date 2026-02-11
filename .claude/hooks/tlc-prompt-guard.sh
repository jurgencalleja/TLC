#\!/bin/bash
# TLC Enforcement Layer 2: Inject TLC awareness on EVERY user prompt
# Output appears as <user-prompt-submit-hook> - Claude treats it as user instruction.
# Survives context compaction because it is re-injected every turn.

[ -f ".tlc.json" ] && echo "[TLC PROJECT] All work uses /tlc commands. Never write code without tests. Run /tlc if unsure."
