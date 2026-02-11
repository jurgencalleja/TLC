#!/bin/bash
# TLC Enforcement Layer 1: Hard-block non-TLC planning tools
# Fires on PreToolUse for banned tools and DENIES them.
# Claude cannot bypass this - the tool call never executes.

INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool_name // empty')

case "$TOOL" in
  EnterPlanMode)
    REASON="BLOCKED by TLC. Use /tlc:plan instead. Plans go in .planning/phases/ files."
    ;;
  TaskCreate)
    REASON="BLOCKED by TLC. Tasks live in .planning/phases/{N}-PLAN.md with [ ] markers."
    ;;
  TaskUpdate)
    REASON="BLOCKED by TLC. Update task markers in .planning/phases/{N}-PLAN.md files."
    ;;
  TaskGet)
    REASON="BLOCKED by TLC. Read tasks from .planning/phases/{N}-PLAN.md files."
    ;;
  TaskList)
    REASON="BLOCKED by TLC. Use /tlc:progress to check task status."
    ;;
  ExitPlanMode)
    REASON="BLOCKED by TLC. Plans are approved via /tlc:build, not ExitPlanMode."
    ;;
  *)
    exit 0
    ;;
esac

cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "${REASON}"
  }
}
EOF
