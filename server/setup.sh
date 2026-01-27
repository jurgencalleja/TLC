#!/bin/bash
#
# TLC Server Setup Script
# Installs Docker and other requirements for TLC dev server
#
# Usage: sudo ./setup.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[TLC]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[TLC]${NC} $1"
}

log_error() {
    echo -e "${RED}[TLC]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run with sudo: sudo ./setup.sh"
    exit 1
fi

# Get the actual user (not root)
ACTUAL_USER=${SUDO_USER:-$USER}
if [ "$ACTUAL_USER" = "root" ]; then
    log_error "Please run as a regular user with sudo, not as root directly"
    exit 1
fi

log_info "Setting up TLC server requirements for user: $ACTUAL_USER"

# Detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    elif [ "$(uname)" = "Darwin" ]; then
        OS="macos"
        OS_VERSION=$(sw_vers -productVersion)
    else
        OS="unknown"
    fi
    echo "$OS"
}

OS=$(detect_os)
log_info "Detected OS: $OS"

# Install Docker based on OS
install_docker() {
    if command -v docker &> /dev/null; then
        log_info "Docker already installed: $(docker --version)"
        return 0
    fi

    log_info "Installing Docker..."

    case $OS in
        ubuntu|debian|pop)
            # Remove old versions
            apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

            # Install prerequisites
            apt-get update
            apt-get install -y \
                ca-certificates \
                curl \
                gnupg \
                lsb-release

            # Add Docker's official GPG key
            install -m 0755 -d /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/$OS/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            chmod a+r /etc/apt/keyrings/docker.gpg

            # Set up repository
            echo \
                "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS \
                $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

            # Install Docker
            apt-get update
            apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

            log_info "Docker installed successfully"
            ;;

        fedora|rhel|centos)
            # Install prerequisites
            dnf -y install dnf-plugins-core

            # Add Docker repo
            dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo

            # Install Docker
            dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

            log_info "Docker installed successfully"
            ;;

        arch|manjaro)
            pacman -S --noconfirm docker docker-compose
            log_info "Docker installed successfully"
            ;;

        macos)
            log_warn "Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
            log_warn "After installation, enable WSL integration if using WSL"
            return 1
            ;;

        *)
            log_error "Unsupported OS: $OS"
            log_error "Please install Docker manually: https://docs.docker.com/engine/install/"
            return 1
            ;;
    esac
}

# Configure Docker for non-root access
configure_docker_user() {
    log_info "Configuring Docker for user: $ACTUAL_USER"

    # Add user to docker group
    if ! getent group docker > /dev/null; then
        groupadd docker
    fi

    usermod -aG docker "$ACTUAL_USER"
    log_info "Added $ACTUAL_USER to docker group"
}

# Start Docker service
start_docker() {
    log_info "Starting Docker service..."

    # Check if systemd is available (native Linux)
    if command -v systemctl &> /dev/null && systemctl is-system-running &> /dev/null; then
        systemctl enable docker
        systemctl start docker
    # Check if we're in WSL
    elif grep -qi microsoft /proc/version 2>/dev/null; then
        # WSL - use service command
        service docker start || true
    else
        # Try service command as fallback
        service docker start || true
    fi

    # Wait for Docker to be ready
    log_info "Waiting for Docker to be ready..."
    for i in {1..30}; do
        if docker info &> /dev/null; then
            log_info "Docker is ready"
            return 0
        fi
        sleep 1
    done

    log_warn "Docker may not be fully started. You might need to restart your terminal or run: sudo service docker start"
}

# Pull PostgreSQL image
pull_postgres_image() {
    log_info "Pulling PostgreSQL image (this may take a moment)..."

    # Run as the actual user to ensure proper permissions
    su - "$ACTUAL_USER" -c "docker pull postgres:16-alpine" 2>/dev/null || \
        docker pull postgres:16-alpine

    log_info "PostgreSQL image ready"
}

# Install Node.js if not present
install_nodejs() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_info "Node.js already installed: $NODE_VERSION"
        return 0
    fi

    log_info "Installing Node.js..."

    case $OS in
        ubuntu|debian|pop)
            # Install Node.js 20.x LTS
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt-get install -y nodejs
            ;;

        fedora|rhel|centos)
            curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
            dnf install -y nodejs
            ;;

        arch|manjaro)
            pacman -S --noconfirm nodejs npm
            ;;

        macos)
            log_warn "Please install Node.js from https://nodejs.org/"
            return 1
            ;;

        *)
            log_warn "Please install Node.js manually: https://nodejs.org/"
            return 1
            ;;
    esac

    log_info "Node.js installed: $(node --version)"
}

# Main setup
main() {
    echo ""
    echo "  ████████╗██╗     ██████╗"
    echo "  ╚══██╔══╝██║    ██╔════╝"
    echo "     ██║   ██║    ██║"
    echo "     ██║   ██║    ██║"
    echo "     ██║   ███████╗╚██████╗"
    echo "     ╚═╝   ╚══════╝ ╚═════╝"
    echo ""
    echo "  TLC Server Setup"
    echo ""

    # Install Docker
    install_docker

    # Configure Docker for user
    configure_docker_user

    # Start Docker
    start_docker

    # Pull PostgreSQL image
    pull_postgres_image

    # Check/install Node.js
    install_nodejs

    echo ""
    log_info "=========================================="
    log_info "Setup complete!"
    log_info "=========================================="
    echo ""
    log_info "IMPORTANT: Log out and log back in (or restart your terminal)"
    log_info "for Docker group permissions to take effect."
    echo ""
    log_info "Then you can run TLC server with:"
    log_info "  cd your-project && npx tlc-claude-code server"
    echo ""
    log_info "Or test Docker now with:"
    log_info "  sudo docker run hello-world"
    echo ""
}

main "$@"
