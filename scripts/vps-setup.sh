#!/bin/bash
#
# TLC VPS Setup Script
# Sets up TLC deployment server on Ubuntu VPS
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/jurgencalleja/TLC/main/scripts/vps-setup.sh | bash
#
# Or download and run:
#   wget https://raw.githubusercontent.com/jurgencalleja/TLC/main/scripts/vps-setup.sh
#   chmod +x vps-setup.sh
#   ./vps-setup.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${BLUE}[TLC]${NC} $1"; }
success() { echo -e "${GREEN}[TLC]${NC} $1"; }
warn() { echo -e "${YELLOW}[TLC]${NC} $1"; }
error() { echo -e "${RED}[TLC]${NC} $1"; exit 1; }

# Banner
echo ""
echo -e "${BLUE}  ████████╗██╗     ██████╗${NC}"
echo -e "${BLUE}  ╚══██╔══╝██║    ██╔════╝${NC}"
echo -e "${BLUE}     ██║   ██║    ██║     ${NC}"
echo -e "${BLUE}     ██║   ██║    ██║     ${NC}"
echo -e "${BLUE}     ██║   ███████╗╚██████╗${NC}"
echo -e "${BLUE}     ╚═╝   ╚══════╝ ╚═════╝${NC}"
echo ""
echo -e "  ${GREEN}TLC VPS Setup${NC}"
echo -e "  ${YELLOW}Deployment Server for Teams${NC}"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
  error "Don't run as root. Script will use sudo when needed."
fi

# Configuration
TLC_DIR="/opt/tlc"
TLC_USER="tlc"
TLC_PORT=3147
NODE_VERSION="20"

# Prompt for configuration
read -p "Enter your domain (e.g., project.example.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
  error "Domain is required"
fi

read -p "Enter admin email: " ADMIN_EMAIL
if [ -z "$ADMIN_EMAIL" ]; then
  error "Admin email is required"
fi

read -p "Enter Slack webhook URL (optional, press Enter to skip): " SLACK_WEBHOOK

# Generate secrets
JWT_SECRET=$(openssl rand -hex 32)
WEBHOOK_SECRET=$(openssl rand -hex 16)
ADMIN_PASSWORD=$(openssl rand -base64 12)

log "Starting TLC VPS setup..."
log "Domain: $DOMAIN"
log "Admin: $ADMIN_EMAIL"

# Step 1: System updates
log "Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# Step 2: Install dependencies
log "Installing dependencies..."
sudo apt-get install -y -qq \
  curl \
  git \
  nginx \
  certbot \
  python3-certbot-nginx \
  postgresql \
  postgresql-contrib

# Step 3: Install Node.js
log "Installing Node.js $NODE_VERSION..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi
success "Node.js $(node -v) installed"

# Step 4: Install Docker
log "Installing Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker $USER
fi
success "Docker installed"

# Step 5: Create TLC user
log "Creating TLC user..."
if ! id "$TLC_USER" &>/dev/null; then
  sudo useradd -r -s /bin/bash -d $TLC_DIR $TLC_USER
fi

# Step 6: Create directories
log "Creating directories..."
sudo mkdir -p $TLC_DIR/{deployments,logs,config}
sudo chown -R $TLC_USER:$TLC_USER $TLC_DIR

# Step 7: Setup PostgreSQL
log "Setting up PostgreSQL..."
sudo -u postgres psql -c "CREATE USER tlc WITH PASSWORD '$JWT_SECRET';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE tlc OWNER tlc;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE tlc TO tlc;" 2>/dev/null || true

# Create users table
sudo -u postgres psql -d tlc -c "
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'engineer',
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);
" 2>/dev/null || true

success "PostgreSQL configured"

# Step 8: Install TLC server
log "Installing TLC server..."
sudo -u $TLC_USER bash -c "
cd $TLC_DIR
npm init -y
npm install tlc-claude-code express ws http-proxy-middleware jsonwebtoken bcryptjs pg dotenv
"

# Step 9: Create server configuration
log "Creating server configuration..."
sudo tee $TLC_DIR/.env > /dev/null <<EOF
# TLC Server Configuration
NODE_ENV=production
PORT=$TLC_PORT
DOMAIN=$DOMAIN

# Security
JWT_SECRET=$JWT_SECRET
WEBHOOK_SECRET=$WEBHOOK_SECRET

# Database
DATABASE_URL=postgres://tlc:$JWT_SECRET@localhost:5432/tlc

# Slack (optional)
SLACK_WEBHOOK_URL=$SLACK_WEBHOOK

# Admin
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD_HASH=\$(node -e "console.log(require('bcryptjs').hashSync('$ADMIN_PASSWORD', 10))")
EOF

# Step 10: Create TLC server script
log "Creating TLC server..."
sudo tee $TLC_DIR/server.js > /dev/null <<'SERVEREOF'
const express = require('express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');
require('dotenv').config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const PORT = process.env.PORT || 3147;
const DEPLOYMENTS_DIR = '/opt/tlc/deployments';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'node_modules/tlc-claude-code/server/dashboard')));

// Branch port mapping
const branchPorts = new Map();
let nextPort = 10000;

// Auth middleware
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    res.json({ token, user: { email: user.email, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List deployments
app.get('/api/deployments', authenticate, async (req, res) => {
  const deployments = [];

  if (fs.existsSync(DEPLOYMENTS_DIR)) {
    const branches = fs.readdirSync(DEPLOYMENTS_DIR);
    for (const branch of branches) {
      const port = branchPorts.get(branch) || 'stopped';
      deployments.push({
        branch,
        port,
        url: `https://${branch}.${process.env.DOMAIN}`,
        status: port !== 'stopped' ? 'running' : 'stopped'
      });
    }
  }

  res.json(deployments);
});

// Deploy branch
app.post('/api/deploy', authenticate, async (req, res) => {
  const { branch, repo } = req.body;
  if (!branch) return res.status(400).json({ error: 'Branch required' });

  const safeBranch = branch.replace(/[^a-zA-Z0-9-]/g, '-');
  const deployDir = path.join(DEPLOYMENTS_DIR, safeBranch);

  try {
    // Clone or pull
    if (!fs.existsSync(deployDir)) {
      execSync(`git clone -b ${branch} ${repo} ${deployDir}`);
    } else {
      execSync(`cd ${deployDir} && git pull`);
    }

    // Install deps
    execSync(`cd ${deployDir} && npm install`);

    // Assign port
    const port = nextPort++;
    branchPorts.set(safeBranch, port);

    // Start container or process
    spawn('npm', ['start'], {
      cwd: deployDir,
      env: { ...process.env, PORT: port.toString() },
      detached: true,
      stdio: 'ignore'
    }).unref();

    // Notify Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚀 Deployed ${branch} to https://${safeBranch}.${process.env.DOMAIN}`
        })
      }).catch(() => {});
    }

    res.json({
      success: true,
      url: `https://${safeBranch}.${process.env.DOMAIN}`,
      port
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GitHub webhook
app.post('/api/webhook', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  // Verify signature in production

  const { ref, repository } = req.body;
  const branch = ref?.replace('refs/heads/', '');

  if (branch) {
    // Trigger deployment
    fetch(`http://localhost:${PORT}/api/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt.sign({ role: 'system' }, process.env.JWT_SECRET)}`
      },
      body: JSON.stringify({ branch, repo: repository.clone_url })
    }).catch(() => {});
  }

  res.json({ received: true });
});

// Proxy to branch deployments
app.use('/preview/:branch', (req, res, next) => {
  const branch = req.params.branch;
  const port = branchPorts.get(branch);

  if (!port) {
    return res.status(404).send('Deployment not found');
  }

  createProxyMiddleware({
    target: `http://localhost:${port}`,
    changeOrigin: true,
    pathRewrite: { [`^/preview/${branch}`]: '' }
  })(req, res, next);
});

// WebSocket for logs
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'connected' }));
});

// Start server
server.listen(PORT, () => {
  console.log(`TLC Deploy Server running on port ${PORT}`);
  console.log(`Dashboard: https://dashboard.${process.env.DOMAIN}`);
});
SERVEREOF

sudo chown $TLC_USER:$TLC_USER $TLC_DIR/.env $TLC_DIR/server.js

# Step 11: Create systemd service
log "Creating systemd service..."
sudo tee /etc/systemd/system/tlc.service > /dev/null <<EOF
[Unit]
Description=TLC Deployment Server
After=network.target postgresql.service

[Service]
Type=simple
User=$TLC_USER
WorkingDirectory=$TLC_DIR
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable tlc
sudo systemctl start tlc

# Step 12: Configure nginx
log "Configuring nginx..."
sudo tee /etc/nginx/sites-available/tlc > /dev/null <<EOF
# TLC Dashboard
server {
    listen 80;
    server_name dashboard.$DOMAIN;

    location / {
        proxy_pass http://localhost:$TLC_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}

# Branch deployments (wildcard)
server {
    listen 80;
    server_name ~^(?<branch>.+)\.$DOMAIN\$;

    location / {
        proxy_pass http://localhost:$TLC_PORT/preview/\$branch;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/tlc /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Step 13: Setup SSL
log "Setting up SSL certificates..."
sudo certbot --nginx -d "dashboard.$DOMAIN" -d "*.$DOMAIN" --email "$ADMIN_EMAIL" --agree-tos --non-interactive || {
  warn "SSL setup failed. Run manually: sudo certbot --nginx -d dashboard.$DOMAIN"
}

# Step 14: Create admin user
log "Creating admin user..."
ADMIN_HASH=$(node -e "console.log(require('bcryptjs').hashSync('$ADMIN_PASSWORD', 10))")
sudo -u postgres psql -d tlc -c "
INSERT INTO users (email, password_hash, name, role)
VALUES ('$ADMIN_EMAIL', '$ADMIN_HASH', 'Admin', 'admin')
ON CONFLICT (email) DO UPDATE SET password_hash = '$ADMIN_HASH';
"

# Step 15: Print summary
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  TLC VPS Setup Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BLUE}Dashboard:${NC}     https://dashboard.$DOMAIN"
echo -e "  ${BLUE}Deployments:${NC}   https://{branch}.$DOMAIN"
echo ""
echo -e "  ${BLUE}Admin Login:${NC}"
echo -e "    Email:     $ADMIN_EMAIL"
echo -e "    Password:  ${YELLOW}$ADMIN_PASSWORD${NC}"
echo ""
echo -e "  ${BLUE}Webhook URL:${NC}   https://dashboard.$DOMAIN/api/webhook"
echo -e "  ${BLUE}Webhook Secret:${NC} $WEBHOOK_SECRET"
echo ""
echo -e "  ${BLUE}DNS Configuration:${NC}"
echo -e "    Add these records to your DNS:"
echo -e "    dashboard.$DOMAIN  A  $(curl -s ifconfig.me)"
echo -e "    *.$DOMAIN          A  $(curl -s ifconfig.me)"
echo ""
echo -e "  ${BLUE}GitHub Webhook Setup:${NC}"
echo -e "    1. Go to your repo Settings > Webhooks"
echo -e "    2. Add webhook: https://dashboard.$DOMAIN/api/webhook"
echo -e "    3. Content type: application/json"
echo -e "    4. Secret: $WEBHOOK_SECRET"
echo -e "    5. Events: Push events"
echo ""
echo -e "  ${BLUE}Files:${NC}"
echo -e "    Config:    $TLC_DIR/.env"
echo -e "    Logs:      journalctl -u tlc -f"
echo -e "    Service:   sudo systemctl {start|stop|restart} tlc"
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo ""
success "Setup complete! Save the credentials above."
