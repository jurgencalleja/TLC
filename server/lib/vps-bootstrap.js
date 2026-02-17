/**
 * VPS Bootstrap — idempotent server setup via SSH
 * Phase 80 Task 5
 */

/**
 * Generate idempotent bootstrap bash script
 * @param {Object} options
 * @param {string} [options.deployUser=deploy] - Deploy user to create
 * @returns {string} Bash script
 */
function generateBootstrapScript(options = {}) {
  const deployUser = options.deployUser || 'deploy';

  return `#!/bin/bash
set -e

echo "=== TLC VPS Bootstrap ==="
echo "Date: $(date)"

# Step 1: Update packages
echo "[1/7] Updating packages..."
apt-get update -y && apt-get upgrade -y

# Step 2: Install Docker (idempotent)
echo "[2/7] Installing Docker..."
if command -v docker &>/dev/null; then
  echo "  Docker already installed: $(docker --version)"
else
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "  Docker installed: $(docker --version)"
fi

# Install Docker Compose plugin
if docker compose version &>/dev/null; then
  echo "  Docker Compose already installed"
else
  apt-get install -y docker-compose-plugin
fi

# Step 3: Install Nginx (idempotent)
echo "[3/7] Installing Nginx..."
if command -v nginx &>/dev/null; then
  echo "  Nginx already installed: $(nginx -v 2>&1)"
else
  apt-get install -y nginx
  systemctl enable nginx
  systemctl start nginx
  echo "  Nginx installed"
fi

# Step 4: Install Certbot (idempotent)
echo "[4/7] Installing Certbot..."
if command -v certbot &>/dev/null; then
  echo "  Certbot already installed: $(certbot --version 2>&1)"
else
  apt-get install -y certbot python3-certbot-nginx
  echo "  Certbot installed"
fi

# Step 5: Configure UFW firewall
echo "[5/7] Configuring firewall..."
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable
echo "  Firewall configured (22, 80, 443)"

# Step 6: Create deploy user (idempotent)
echo "[6/7] Setting up deploy user..."
if id "${deployUser}" &>/dev/null; then
  echo "  User ${deployUser} already exists"
else
  useradd -m -s /bin/bash ${deployUser}
  usermod -aG docker ${deployUser}
  mkdir -p /home/${deployUser}/.ssh
  chmod 700 /home/${deployUser}/.ssh
  # Copy authorized keys from root if available
  if [ -f /root/.ssh/authorized_keys ]; then
    cp /root/.ssh/authorized_keys /home/${deployUser}/.ssh/
    chown -R ${deployUser}:${deployUser} /home/${deployUser}/.ssh
    chmod 600 /home/${deployUser}/.ssh/authorized_keys
  fi
  echo "  User ${deployUser} created and added to docker group"
fi

# Step 7: Create deployment directories
echo "[7/7] Setting up deployment directories..."
mkdir -p /opt/deploys
chown ${deployUser}:${deployUser} /opt/deploys

echo ""
echo "=== Bootstrap Complete ==="
echo "Docker: $(docker --version 2>/dev/null || echo 'not installed')"
echo "Nginx:  $(nginx -v 2>&1 || echo 'not installed')"
echo "Certbot: $(certbot --version 2>&1 || echo 'not installed')"
echo "UFW:    $(ufw status | head -1)"
echo "User:   ${deployUser}"
`;
}

/**
 * Parse bootstrap status from SSH command outputs
 * @param {Object} output - { docker, nginx, certbot, ufw }
 * @returns {Object} { docker, nginx, certbot, firewall }
 */
function checkBootstrapStatus(output) {
  return {
    docker: !!(output.docker && !output.docker.includes('not found') && output.docker.includes('version')),
    nginx: !!(output.nginx && !output.nginx.includes('not found') && output.nginx.match(/nginx/i)),
    certbot: !!(output.certbot && !output.certbot.includes('not found') && output.certbot.match(/certbot/i)),
    firewall: !!(output.ufw && output.ufw.includes('active') && !output.ufw.includes('inactive')),
  };
}

module.exports = { generateBootstrapScript, checkBootstrapStatus };
