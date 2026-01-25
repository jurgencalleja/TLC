#!/bin/bash
# Install TDD workflow for Claude Code
# Usage: ./install.sh [--global | --local]

set -e

# Determine install location
if [[ "$1" == "--global" || "$1" == "-g" ]]; then
    INSTALL_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/commands/tdd"
    echo "Installing globally to $INSTALL_DIR"
elif [[ "$1" == "--local" || "$1" == "-l" ]]; then
    INSTALL_DIR="./.claude/commands/tdd"
    echo "Installing locally to $INSTALL_DIR"
else
    echo "TDD Workflow Installer"
    echo ""
    echo "Where would you like to install?"
    echo "  1) Global (~/.claude/commands/tdd) - available in all projects"
    echo "  2) Local (./.claude/commands/tdd) - this project only"
    echo ""
    read -p "Choice [1/2]: " choice

    if [[ "$choice" == "2" ]]; then
        INSTALL_DIR="./.claude/commands/tdd"
    else
        INSTALL_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/commands/tdd"
    fi
fi

# Create directory
mkdir -p "$INSTALL_DIR"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Copy command files
cp "$SCRIPT_DIR/tdd.md" "$INSTALL_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/new-project.md" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/init.md" "$INSTALL_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/coverage.md" "$INSTALL_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/discuss.md" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/plan.md" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/build.md" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/verify.md" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/status.md" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/progress.md" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/complete.md" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/new-milestone.md" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/quick.md" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/help.md" "$INSTALL_DIR/"

echo ""
echo "TDD commands installed to $INSTALL_DIR"
echo ""
echo "Restart Claude Code to load new commands."
echo ""
echo "Quick Start:"
echo "  /tdd              Smart entry point - knows what to do next"
echo ""
echo "Or use specific commands:"
echo "  /tdd:new-project  Start new project"
echo "  /tdd:init         Add TDD to existing code"
echo "  /tdd:coverage     Find and fix test gaps"
echo ""
echo "Run /tdd:help for full command list."
