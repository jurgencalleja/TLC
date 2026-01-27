#!/bin/bash

# TLC Dev Server Launcher
# Usage: ./start-dev.sh [project-path]

set -e

PROJECT_PATH="${1:-$(pwd)}"

echo ""
echo "  ============================"
echo "       TLC Dev Server"
echo "  ============================"
echo ""

# Check Docker
echo "[TLC] Checking Docker..."
if ! docker info >/dev/null 2>&1; then
    echo "[TLC] Docker is not running."

    # Try to start Docker based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "[TLC] Starting Docker Desktop..."
        open -a Docker
    elif [[ -f /etc/debian_version ]] || [[ -f /etc/redhat-release ]]; then
        echo "[TLC] Starting Docker service..."
        sudo systemctl start docker 2>/dev/null || sudo service docker start 2>/dev/null || true
    fi

    echo "[TLC] Waiting for Docker..."
    TIMEOUT=60
    ELAPSED=0
    while [ $ELAPSED -lt $TIMEOUT ]; do
        sleep 2
        ELAPSED=$((ELAPSED + 2))
        if docker info >/dev/null 2>&1; then
            break
        fi
        printf "."
    done
    echo ""

    if ! docker info >/dev/null 2>&1; then
        echo "[TLC] ERROR: Docker failed to start"
        echo "[TLC] Please start Docker manually and try again"
        exit 1
    fi
fi

echo "[TLC] Docker is ready!"

# Resolve project path
PROJECT_PATH="$(cd "$PROJECT_PATH" 2>/dev/null && pwd)"
if [ -z "$PROJECT_PATH" ]; then
    echo "[TLC] ERROR: Invalid project path"
    exit 1
fi

# Get project name from directory
PROJECT_NAME=$(basename "$PROJECT_PATH" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9')
if [ -z "$PROJECT_NAME" ]; then
    PROJECT_NAME="dev"
fi

echo "[TLC] Project: $PROJECT_PATH"
echo "[TLC] Name:    $PROJECT_NAME"

# Set environment
export PROJECT_DIR="$PROJECT_PATH"
export COMPOSE_PROJECT_NAME="$PROJECT_NAME"

# Find TLC installation directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "[TLC] Starting services..."
echo "      Dashboard: http://localhost:3147"
echo "      App:       http://localhost:5000"
echo "      DB Admin:  http://localhost:8080"
echo "      Database:  localhost:5433 (postgres/postgres)"
echo ""
echo "[TLC] Containers: tlc-$PROJECT_NAME-*"
echo "[TLC] Press Ctrl+C to stop"
echo ""

# Run docker-compose
docker-compose -f docker-compose.dev.yml up --build

echo ""
echo "[TLC] Stopped."
