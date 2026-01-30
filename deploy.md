# /tlc:deploy - TLC Dev Server

Deploy your TLC project to a remote dev server for team collaboration.

## Usage

```
/tlc:deploy [command]
```

Commands:
- `setup` - Generate server config and setup instructions
- `push` - Deploy current branch
- `status` - Check deployment status
- `logs` - View deployment logs
- `users` - Manage server users

---

## Quick Setup (Terminal)

Run `/tlc:deploy setup` to generate your server config:

```
TLC Dev Server Setup
════════════════════════════════════════════════════════════════════

Project Configuration
─────────────────────
  Name:    my-awesome-app
  Repo:    git@github.com:myorg/my-awesome-app.git
  Domain:  (enter your domain)

Domain for dev server: myapp.example.com

Generating config...

════════════════════════════════════════════════════════════════════
STEP 1: Run this on your Ubuntu server
════════════════════════════════════════════════════════════════════

┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  curl -fsSL https://tlc.dev/install | bash -s -- \                │
│    --project "my-awesome-app" \                                    │
│    --repo "git@github.com:myorg/my-awesome-app.git" \             │
│    --domain "myapp.example.com" \                                  │
│    --webhook-secret "a1b2c3d4e5f6g7h8"                            │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                                                        [Copy to clipboard]

════════════════════════════════════════════════════════════════════
STEP 2: Configure DNS
════════════════════════════════════════════════════════════════════

Add these DNS records pointing to your server IP:

  *.myapp.example.com      →  YOUR_SERVER_IP
  dashboard.myapp.example.com  →  YOUR_SERVER_IP

════════════════════════════════════════════════════════════════════
STEP 3: Add GitHub Webhook
════════════════════════════════════════════════════════════════════

Go to: https://github.com/myorg/my-awesome-app/settings/hooks/new

  Payload URL:  https://dashboard.myapp.example.com/api/webhook
  Content type: application/json
  Secret:       a1b2c3d4e5f6g7h8
  Events:       Just the push event

════════════════════════════════════════════════════════════════════
STEP 4: Done!
════════════════════════════════════════════════════════════════════

Once server setup completes, you'll get:

  Dashboard:     https://dashboard.myapp.example.com
  Main branch:   https://main.myapp.example.com
  Feature branches: https://{branch}.myapp.example.com

Admin credentials will be shown after server setup.

────────────────────────────────────────────────────────────────────
Config saved to .tlc.json
```

### Process

1. **Read project info** from `.tlc.json` or `package.json`
2. **Ask for domain** if not configured
3. **Generate webhook secret** (random 16 chars)
4. **Output setup command** with all config embedded
5. **Save config** to `.tlc.json`

```javascript
// Config generation
const config = {
  project: packageJson.name,
  repo: getGitRemoteUrl(),
  domain: userInput.domain,
  webhookSecret: crypto.randomBytes(16).toString('hex')
};

// Generate one-liner
const command = `curl -fsSL https://tlc.dev/install | bash -s -- \\
  --project "${config.project}" \\
  --repo "${config.repo}" \\
  --domain "${config.domain}" \\
  --webhook-secret "${config.webhookSecret}"`;
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      TLC Dev Server                          │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Branch    │  │   Branch    │  │   Branch    │         │
│  │   main      │  │   feat-auth │  │   fix-bug   │         │
│  │   :3000     │  │   :3001     │  │   :3002     │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                  │
│         └────────────────┼────────────────┘                  │
│                          │                                   │
│  ┌───────────────────────┴───────────────────────┐          │
│  │              TLC Deploy Server                 │          │
│  │                   :3147                        │          │
│  │  - Dashboard (auth required)                   │          │
│  │  - API for deployments                         │          │
│  │  - Webhook receiver                            │          │
│  │  - Slack notifications                         │          │
│  └───────────────────────────────────────────────┘          │
│                          │                                   │
│  ┌───────────────────────┴───────────────────────┐          │
│  │              Reverse Proxy (nginx)             │          │
│  │                                                │          │
│  │  main.project.example.com    → :3000          │          │
│  │  feat-auth.project.example.com → :3001        │          │
│  │  dashboard.project.example.com → :3147        │          │
│  └───────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Setup

### 1. Server Requirements

- Ubuntu 22.04+ or similar
- Docker installed
- Node.js 20+
- nginx (reverse proxy)
- PostgreSQL (user database)

### 2. Configure Server

```
> /tlc:deploy setup

TLC Deployment Server Setup

Dev Server Configuration:
  Host: deploy.example.com
  SSH Key: ~/.ssh/id_rsa (detected)

Testing connection...
  ✓ Connected to deploy.example.com

Installing TLC Deploy Server...
  ✓ Dependencies installed
  ✓ Database created
  ✓ nginx configured

Domain Configuration:
  Base domain: project.example.com
  Branches will be: {branch}.project.example.com

Configure DNS:
  *.project.example.com → SERVER_IP

Admin User:
  Email: admin@example.com
  Password: (generated) K8x#mP2$nQ

Slack Integration (optional):
  Webhook URL: https://hooks.slack.com/services/XXX

Configuration saved to .tlc.json
```

### 3. Local Configuration

In `.tlc.json`:

```json
{
  "deploy": {
    "server": "deploy.example.com",
    "domain": "project.example.com",
    "sshKey": "~/.ssh/id_rsa",
    "slack": {
      "webhookUrl": "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      "channel": "#deployments"
    }
  }
}
```

## User Management

### Authentication

Users table (PostgreSQL):

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'engineer',
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Roles: admin, engineer, qa, po
```

### User Commands

```
> /tlc:deploy users add

Email: bob@example.com
Name: Bob Smith
Role: engineer
Password: (generated) Qw3$rTy9

User created! They can login at:
  https://dashboard.project.example.com

> /tlc:deploy users list

Users:
  admin@example.com (admin) - Last login: today
  alice@example.com (engineer) - Last login: 2h ago
  bob@example.com (engineer) - Last login: never
  qa@example.com (qa) - Last login: 1d ago

> /tlc:deploy users remove bob@example.com

User bob@example.com removed.
```

### JWT Authentication

```javascript
// Server generates JWT on login
const token = jwt.sign(
  { userId: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// Protected routes check role
app.get('/api/admin/*', requireRole('admin'));
app.post('/api/deploy', requireRole(['admin', 'engineer']));
app.get('/api/status', requireRole(['admin', 'engineer', 'qa', 'po']));
```

## Deployment

### Push to Deploy

```
> /tlc:deploy push

Deploying branch: feat-auth

Pushing to dev server...
  ✓ Code uploaded
  ✓ Dependencies installed
  ✓ Tests passed (23/23)
  ✓ Container started

Deployment complete!
  URL: https://feat-auth.project.example.com

Slack notification sent: #deployments
```

### Automatic Deployment

With webhook, pushing to GitHub triggers deployment:

```yaml
# GitHub Action
on:
  push:
    branches: ['**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger deployment
        run: |
          curl -X POST https://dashboard.project.example.com/api/webhook/deploy \
            -H "X-Webhook-Secret: ${{ secrets.DEPLOY_SECRET }}" \
            -d '{"branch": "${{ github.ref_name }}", "sha": "${{ github.sha }}"}'
```

### Deployment Status

```
> /tlc:deploy status

Active Deployments:

| Branch | URL | Status | Last Deploy |
|--------|-----|--------|-------------|
| main | main.project.example.com | ✓ Running | 2h ago |
| feat-auth | feat-auth.project.example.com | ✓ Running | 30m ago |
| fix-bug | fix-bug.project.example.com | ✗ Failed | 15m ago |

Total: 3 deployments (2 healthy, 1 failed)
```

### View Logs

```
> /tlc:deploy logs feat-auth

[2024-01-15 10:30:45] Container started
[2024-01-15 10:30:46] Listening on :3001
[2024-01-15 10:31:02] GET /api/users 200 12ms
[2024-01-15 10:31:15] POST /api/login 200 45ms
[2024-01-15 10:32:00] GET /api/users/123 404 8ms

[Press Ctrl+C to stop streaming]
```

## Slack Integration

### Notifications

```json
{
  "deploy": {
    "slack": {
      "webhookUrl": "https://hooks.slack.com/...",
      "channel": "#deployments",
      "events": {
        "deploy_start": true,
        "deploy_success": true,
        "deploy_fail": true,
        "tests_fail": true,
        "bug_created": true
      }
    }
  }
}
```

### Message Examples

**Deploy Success:**
```
🚀 Deployment Successful
Branch: feat-auth
URL: https://feat-auth.project.example.com
Tests: 23/23 passing
Deployed by: Alice
```

**Deploy Failed:**
```
❌ Deployment Failed
Branch: fix-bug
Error: Tests failed (3 failing)
See logs: https://dashboard.project.example.com/logs/fix-bug
```

**Bug Created:**
```
🐛 New Bug Reported
BUG-015: Login button not responding
Severity: high
Reporter: QA Team
View: https://dashboard.project.example.com/bugs/15
```

### Custom Webhooks

```javascript
// In deploy server
async function notifySlack(event, data) {
  const messages = {
    deploy_start: `🔄 Deploying ${data.branch}...`,
    deploy_success: `🚀 ${data.branch} deployed to ${data.url}`,
    deploy_fail: `❌ ${data.branch} deployment failed: ${data.error}`,
    tests_fail: `⚠️ Tests failing on ${data.branch}: ${data.failCount} failures`,
    bug_created: `🐛 ${data.bugId}: ${data.title}`
  };

  await fetch(config.slack.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: config.slack.channel,
      text: messages[event],
      attachments: buildAttachments(event, data)
    })
  });
}
```

## Dashboard Features

### For Engineers

- View all branch deployments
- Check logs and status
- Trigger manual deploys
- View test results

### For QA

- Access preview URLs
- Submit bugs with screenshots
- View task board
- Track bug status

### For PO

- View project progress
- Access previews
- Review completed features
- Track milestones

## Docker Configuration

Each branch runs in isolated container:

```dockerfile
# Generated per deployment
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
```

### docker-compose.yml (on dev server)

```yaml
version: '3.8'

services:
  main:
    build:
      context: ./deployments/main
    ports:
      - "3000:3000"
    restart: unless-stopped

  feat-auth:
    build:
      context: ./deployments/feat-auth
    ports:
      - "3001:3000"
    restart: unless-stopped

  # Added dynamically per branch
```

## nginx Configuration

```nginx
# /etc/nginx/sites-enabled/tlc-deploy

# Dashboard
server {
    listen 443 ssl;
    server_name dashboard.project.example.com;

    ssl_certificate /etc/letsencrypt/live/project.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/project.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3147;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# Branch deployments (wildcard)
server {
    listen 443 ssl;
    server_name ~^(?<branch>.+)\.project\.example\.com$;

    ssl_certificate /etc/letsencrypt/live/project.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/project.example.com/privkey.pem;

    location / {
        # Port mapping from branch name
        set $port 3000;
        # Dynamic port resolution handled by deploy server
        proxy_pass http://localhost:$port;
    }
}
```

## Security

### SSH Key Deployment

```
> /tlc:deploy setup --ssh

Generating deployment SSH key...
  ✓ Key generated: ~/.ssh/tlc_deploy

Add this to server authorized_keys:
  ssh-rsa AAAA... tlc-deploy

Add to GitHub deploy keys (read-only):
  https://github.com/org/repo/settings/keys
```

### Environment Variables

Secrets stored on dev server:

```bash
# /opt/tlc-deploy/.env
JWT_SECRET=your-secret-here
DATABASE_URL=postgres://user:pass@localhost/tlc
GITHUB_WEBHOOK_SECRET=webhook-secret
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

## Cleanup

### Remove old deployments

```
> /tlc:deploy cleanup

Stale deployments (no activity 7+ days):
  - feat-old (14 days)
  - test-branch (21 days)

Remove these? (Y/n) y

Removed 2 deployments.
Freed 1.2GB disk space.
```

## Example Workflow

```
# Engineer pushes code
git push origin feat-auth

# GitHub webhook triggers deploy
# Slack: "🔄 Deploying feat-auth..."

# Tests run, deployment starts
# Slack: "🚀 feat-auth deployed to https://feat-auth.project.example.com"

# QA tests the feature
# Opens dashboard, tests in preview
# Finds bug, submits via form
# Slack: "🐛 BUG-015: Login timeout on slow connection"

# Engineer sees notification, fixes
git commit -m "fix: increase login timeout"
git push

# New deployment triggers
# Slack: "🚀 feat-auth updated"

# QA re-tests, marks bug fixed
# PO reviews, approves feature

# Merge to main
git checkout main
git merge feat-auth
git push

# Main deployment updates
# Slack: "🚀 main deployed - includes feat-auth"
```

## Notes

- Each branch gets isolated container
- Automatic cleanup of merged branches
- SSL via Let's Encrypt (wildcard cert)
- All actions logged for audit
- Role-based access control
- Webhook secrets required
