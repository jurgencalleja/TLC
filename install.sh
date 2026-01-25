#!/bin/bash
# Install TLC - Test Led Coding for Claude Code
# Usage: ./install.sh [--global | --local]

set -e

# Determine install location
if [[ "$1" == "--global" || "$1" == "-g" ]]; then
    INSTALL_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/commands/tlc"
    echo "Installing globally to $INSTALL_DIR"
elif [[ "$1" == "--local" || "$1" == "-l" ]]; then
    INSTALL_DIR="./.claude/commands/tlc"
    echo "Installing locally to $INSTALL_DIR"
else
    echo "TLC - Test Led Coding Installer"
    echo ""
    echo "Where would you like to install?"
    echo "  1) Global (~/.claude/commands/tlc) - available in all projects"
    echo "  2) Local (./.claude/commands/tlc) - this project only"
    echo ""
    read -p "Choice [1/2]: " choice

    if [[ "$choice" == "2" ]]; then
        INSTALL_DIR="./.claude/commands/tlc"
    else
        INSTALL_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/commands/tlc"
    fi
fi

# Create directory
mkdir -p "$INSTALL_DIR"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Copy command files
cp "$SCRIPT_DIR/tlc.md" "$INSTALL_DIR/" 2>/dev/null || true
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
echo "TLC commands installed to $INSTALL_DIR"
echo ""
echo "Restart Claude Code to load new commands."
echo ""
echo "Quick Start:"
echo "  /tlc              Smart entry point - knows what to do next"
echo ""
echo "Or use specific commands:"
echo "  /tlc:new-project  Start new project"
echo "  /tlc:init         Add TLC to existing code"
echo "  /tlc:coverage     Find and fix test gaps"
echo ""
echo "Run /tlc:help for full command list."
