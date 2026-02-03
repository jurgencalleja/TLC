# Phase 53: Monolith VPS Deployment - Plan

## Overview

Secure one-command deploy to single VPS for solo devs, small teams, and startups.

## Tasks

### Task 1: Server Hardening
**Goal:** Ubuntu server security configuration

**Files:**
- server/lib/vps/server-hardening.js
- server/lib/vps/server-hardening.test.js

**Test Cases:**
- Generates SSH key-only auth config
- Disables password authentication
- Configures non-standard SSH port
- Enables automatic security updates
- Generates sysctl hardening rules
- Disables unnecessary services

---

### Task 2: Caddy Proxy Config
**Goal:** Caddy reverse proxy with auto-TLS

**Files:**
- server/lib/vps/caddy-config.js
- server/lib/vps/caddy-config.test.js

**Test Cases:**
- Generates Caddyfile for single domain
- Generates Caddyfile for multiple domains
- Configures automatic HTTPS
- Sets up reverse proxy to app
- Configures security headers
- Supports wildcard subdomains

---

### Task 3: Docker Compose Orchestration
**Goal:** Production Docker Compose configuration

**Files:**
- server/lib/vps/compose-orchestrator.js
- server/lib/vps/compose-orchestrator.test.js

**Test Cases:**
- Generates production compose file
- Configures health checks for all services
- Sets resource limits
- Configures restart policies
- Sets up logging driver
- Manages environment variables securely

---

### Task 4: Database Configuration
**Goal:** PostgreSQL with encrypted connections

**Files:**
- server/lib/vps/database-config.js
- server/lib/vps/database-config.test.js

**Test Cases:**
- Generates PostgreSQL config with SSL
- Configures connection pooling
- Sets up authentication rules (pg_hba.conf)
- Configures backup user permissions
- Generates Redis auth config
- Enables TLS for Redis

---

### Task 5: Backup Manager
**Goal:** Encrypted backups to cloud storage

**Files:**
- server/lib/vps/backup-manager.js
- server/lib/vps/backup-manager.test.js

**Test Cases:**
- Creates database dump script
- Encrypts backups with GPG
- Uploads to S3-compatible storage
- Supports Backblaze B2
- Configures retention policy
- Generates restore script

---

### Task 6: Secrets Manager
**Goal:** Secure secrets storage on VPS

**Files:**
- server/lib/vps/secrets-manager.js
- server/lib/vps/secrets-manager.test.js

**Test Cases:**
- Creates secrets directory with 600 permissions
- Generates secrets from template
- Rotates secrets safely
- Never exposes secrets in logs
- Supports SOPS encryption
- Validates secret format

---

### Task 7: Deploy Script Generator
**Goal:** Zero-downtime deployment scripts

**Files:**
- server/lib/vps/deploy-script.js
- server/lib/vps/deploy-script.test.js

**Test Cases:**
- Generates blue-green deploy script
- Generates rolling update script
- Includes health check verification
- Supports rollback on failure
- Generates pre/post deploy hooks
- Manages database migrations

---

### Task 8: VPS Deploy Command
**Goal:** CLI for VPS deployment

**Files:**
- server/commands/vps-deploy.js
- server/commands/vps-deploy.test.js

**Test Cases:**
- `tlc deploy vps init` sets up server
- `tlc deploy vps push` deploys app
- `tlc deploy vps status` shows state
- `tlc deploy vps rollback` reverts
- `tlc deploy vps logs` streams logs
- Validates SSH connection

---

## Estimated Scope
- Tasks: 8
- Tests: ~80
