# VPS Deployment Guide

Deploy TLC server on a VPS (Ubuntu) for distributed teams.

## Prerequisites

- Ubuntu 22.04+ VPS (2GB+ RAM recommended)
- Domain with wildcard DNS configured
- SSH access with sudo privileges

## Quick Start

```bash
curl -fsSL https://raw.githubusercontent.com/jurgencalleja/TLC/main/scripts/vps-setup.sh | bash
```

This script will:
1. Install Docker, Node.js, nginx, PostgreSQL, certbot
2. Create TLC user and directories
3. Set up the database
4. Install TLC server
5. Configure nginx with SSL
6. Create admin user
7. Print credentials

## Manual Installation

### Step 1: Install Dependencies

```bash
sudo apt-get update
sudo apt-get install -y \
  curl \
  git \
  nginx \
  certbot \
  python3-certbot-nginx \
  postgresql \
  postgresql-contrib
```

### Step 2: Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 3: Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

### Step 4: Create TLC User

```bash
sudo useradd -r -s /bin/bash -d /opt/tlc tlc
sudo mkdir -p /opt/tlc/{deployments,logs,config}
sudo chown -R tlc:tlc /opt/tlc
```

### Step 5: Set Up PostgreSQL

```bash
# Generate secrets
JWT_SECRET=$(openssl rand -hex 32)

# Create database and user
sudo -u postgres psql <<EOF
CREATE USER tlc WITH PASSWORD '$JWT_SECRET';
CREATE DATABASE tlc OWNER tlc;
GRANT ALL PRIVILEGES ON DATABASE tlc TO tlc;
EOF

# Create tables
sudo -u postgres psql -d tlc <<EOF
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'engineer',
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);
EOF
```

### Step 6: Install TLC Server

```bash
sudo -u tlc bash -c "
cd /opt/tlc
npm init -y
npm install tlc-claude-code express ws http-proxy-middleware jsonwebtoken bcryptjs pg dotenv
"
```

### Step 7: Create Configuration

Create `/opt/tlc/.env`:

```env
NODE_ENV=production
PORT=3147
DOMAIN=project.example.com

JWT_SECRET=<your-jwt-secret>
WEBHOOK_SECRET=<your-webhook-secret>

DATABASE_URL=postgres://tlc:<password>@localhost:5432/tlc

SLACK_WEBHOOK_URL=<optional-slack-webhook>

ADMIN_EMAIL=admin@example.com
```

### Step 8: Create Server Script

Create `/opt/tlc/server.js` - see the [VPS setup script](../scripts/vps-setup.sh) for the full server code.

### Step 9: Create Systemd Service

Create `/etc/systemd/system/tlc.service`:

```ini
[Unit]
Description=TLC Deployment Server
After=network.target postgresql.service

[Service]
Type=simple
User=tlc
WorkingDirectory=/opt/tlc
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable tlc
sudo systemctl start tlc
```

### Step 10: Configure Nginx

Create `/etc/nginx/sites-available/tlc`:

```nginx
# TLC Dashboard
server {
    listen 80;
    server_name dashboard.project.example.com;

    location / {
        proxy_pass http://localhost:3147;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Branch deployments (wildcard)
server {
    listen 80;
    server_name ~^(?<branch>.+)\.project\.example\.com$;

    location / {
        proxy_pass http://localhost:3147/preview/$branch;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable:

```bash
sudo ln -sf /etc/nginx/sites-available/tlc /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### Step 11: Set Up SSL

```bash
sudo certbot --nginx \
  -d "dashboard.project.example.com" \
  -d "*.project.example.com" \
  --email admin@example.com \
  --agree-tos
```

### Step 12: Create Admin User

```bash
ADMIN_PASSWORD=$(openssl rand -base64 12)
ADMIN_HASH=$(node -e "console.log(require('bcryptjs').hashSync('$ADMIN_PASSWORD', 10))")

sudo -u postgres psql -d tlc <<EOF
INSERT INTO users (email, password_hash, name, role)
VALUES ('admin@example.com', '$ADMIN_HASH', 'Admin', 'admin')
ON CONFLICT (email) DO UPDATE SET password_hash = '$ADMIN_HASH';
EOF

echo "Admin password: $ADMIN_PASSWORD"
```

## DNS Configuration

Add these DNS records:

| Record | Type | Value |
|--------|------|-------|
| `dashboard.project.example.com` | A | `<your-vps-ip>` |
| `*.project.example.com` | A | `<your-vps-ip>` |

## GitHub Webhook Setup

1. Go to your repo Settings > Webhooks
2. Add webhook:
   - URL: `https://dashboard.project.example.com/api/webhook`
   - Content type: `application/json`
   - Secret: Your `WEBHOOK_SECRET`
   - Events: Push events

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                        VPS                                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                     Nginx                            │   │
│  │    dashboard.project.com → localhost:3147            │   │
│  │    *.project.com → localhost:3147/preview/$branch   │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │                  TLC Server (:3147)                  │   │
│  │   ┌─────────┐  ┌──────────┐  ┌─────────────────┐   │   │
│  │   │Dashboard│  │   API    │  │ Branch Deployer │   │   │
│  │   └─────────┘  │(Webhook) │  │                 │   │   │
│  │                └──────────┘  └────────┬────────┘   │   │
│  └──────────────────────────────────────┼─────────────┘   │
│                                          │                  │
│  ┌──────────────────────────────────────▼─────────────┐   │
│  │              Branch Deployments                     │   │
│  │   /opt/tlc/deployments/                            │   │
│  │   ├── main/          → :10000                      │   │
│  │   ├── feat-login/    → :10001                      │   │
│  │   └── feat-api/      → :10002                      │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │               PostgreSQL (:5432)                    │   │
│  │          (users, deployments, logs)                 │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Management Commands

```bash
# View logs
sudo journalctl -u tlc -f

# Restart service
sudo systemctl restart tlc

# Check status
sudo systemctl status tlc

# Update TLC
cd /opt/tlc && sudo -u tlc npm update tlc-claude-code
sudo systemctl restart tlc
```

## Backup

```bash
# Database backup
pg_dump -U tlc -h localhost tlc > tlc-backup-$(date +%Y%m%d).sql

# Deployments backup
tar -czf deployments-backup-$(date +%Y%m%d).tar.gz /opt/tlc/deployments
```

## Security Hardening

### Firewall

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Fail2ban

```bash
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Auto Updates

```bash
sudo apt-get install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Troubleshooting

### Server not starting

```bash
# Check logs
sudo journalctl -u tlc -n 100

# Check port
sudo netstat -tlnp | grep 3147

# Check permissions
ls -la /opt/tlc
```

### Database connection issues

```bash
# Test connection
sudo -u postgres psql -d tlc -c "SELECT 1"

# Check PostgreSQL status
sudo systemctl status postgresql
```

### SSL issues

```bash
# Renew certificates
sudo certbot renew --dry-run

# Check certificate
sudo certbot certificates
```

### Branch deployments failing

```bash
# Check deployment logs
cat /opt/tlc/logs/deploy.log

# Check disk space
df -h /opt/tlc/deployments
```

## Production Checklist

- [ ] Use strong passwords for all secrets
- [ ] Enable firewall (ufw)
- [ ] Set up fail2ban
- [ ] Enable automatic security updates
- [ ] Configure log rotation
- [ ] Set up monitoring
- [ ] Configure backup automation
- [ ] Review SSL certificate renewal
- [ ] Set up alerting
