# Phase 51: Network Security & TLS - Plan

## Overview

A+ SSL Labs rating with defense-in-depth network security. Covers TLS configuration, security headers, rate limiting, and firewall management.

## Tasks

### Task 1: TLS Configuration Manager
**Goal:** Configure TLS 1.3 with strong ciphers and Let's Encrypt integration

**Files:**
- server/lib/network/tls-config.js
- server/lib/network/tls-config.test.js

**Acceptance Criteria:**
- [x] Generate TLS config for Caddy/Nginx
- [x] TLS 1.3 only option
- [x] Strong cipher suite selection
- [x] OCSP stapling configuration
- [x] Let's Encrypt auto-renewal config
- [x] CAA record generation

**Test Cases:**
- Generates valid Caddy TLS config
- Generates valid Nginx TLS config
- Enforces TLS 1.3 minimum
- Configures OCSP stapling
- Generates Let's Encrypt config
- Creates CAA DNS record format

---

### Task 2: Security Headers Manager
**Goal:** Generate and validate security headers for A+ rating

**Files:**
- server/lib/network/security-headers.js
- server/lib/network/security-headers.test.js

**Acceptance Criteria:**
- [x] Content-Security-Policy generation
- [x] Strict-Transport-Security config
- [x] X-Content-Type-Options
- [x] X-Frame-Options
- [x] Referrer-Policy
- [x] Permissions-Policy
- [x] Cross-Origin headers (COOP, COEP, CORP)

**Test Cases:**
- Generates strict CSP without unsafe-inline
- Configures HSTS with preload
- Sets all X- headers correctly
- Configures Permissions-Policy
- Sets Cross-Origin policies
- Validates header format

---

### Task 3: Rate Limiter
**Goal:** Per-endpoint rate limiting with IP throttling

**Files:**
- server/lib/network/rate-limiter.js
- server/lib/network/rate-limiter.test.js

**Acceptance Criteria:**
- [x] Per-endpoint rate limits
- [x] IP-based throttling
- [x] Configurable windows and limits
- [x] Sliding window algorithm
- [x] Whitelist/blacklist support
- [x] Rate limit headers (X-RateLimit-*)

**Test Cases:**
- Enforces per-endpoint limits
- Throttles by IP address
- Sliding window counts correctly
- Respects whitelist
- Blocks blacklisted IPs
- Returns proper rate limit headers

---

### Task 4: Request Validator
**Goal:** Request size limits and payload validation

**Files:**
- server/lib/network/request-validator.js
- server/lib/network/request-validator.test.js

**Acceptance Criteria:**
- [x] Request size limits
- [x] Content-Type validation
- [x] JSON depth limits
- [x] Query string limits
- [x] Header size limits
- [x] Path traversal prevention

**Test Cases:**
- Rejects oversized requests
- Validates Content-Type
- Limits JSON nesting depth
- Limits query string length
- Limits header size
- Blocks path traversal attempts

---

### Task 5: Firewall Manager
**Goal:** UFW configuration generation for VPS

**Files:**
- server/lib/network/firewall-manager.js
- server/lib/network/firewall-manager.test.js

**Acceptance Criteria:**
- [x] UFW rule generation
- [x] Default deny incoming
- [x] Allow only 80/443/SSH
- [x] SSH port customization
- [x] IP allowlist for admin
- [x] Rule validation

**Test Cases:**
- Generates UFW enable command
- Sets default deny policy
- Allows HTTP/HTTPS
- Allows custom SSH port
- Adds IP allowlist rules
- Validates rule syntax

---

### Task 6: Fail2ban Configuration
**Goal:** Fail2ban integration for brute force protection

**Files:**
- server/lib/network/fail2ban-config.js
- server/lib/network/fail2ban-config.test.js

**Acceptance Criteria:**
- [x] Jail configuration generation
- [x] SSH protection jail
- [x] HTTP auth protection
- [x] Custom filter patterns
- [x] Ban time configuration
- [x] Whitelist support

**Test Cases:**
- Generates sshd jail config
- Generates http-auth jail config
- Creates custom filter patterns
- Configures ban duration
- Adds whitelist IPs
- Validates jail syntax

---

### Task 7: GeoIP Filter
**Goal:** Geographic IP filtering for access control

**Files:**
- server/lib/network/geoip-filter.js
- server/lib/network/geoip-filter.test.js

**Acceptance Criteria:**
- [x] Country allowlist mode
- [x] Country blocklist mode
- [x] IP-to-country lookup
- [x] Caddy/Nginx config generation
- [x] MaxMind GeoLite2 integration
- [x] Bypass for internal IPs

**Test Cases:**
- Allows countries in allowlist
- Blocks countries in blocklist
- Looks up IP country
- Generates Caddy geoip config
- Generates Nginx geoip config
- Bypasses internal/private IPs

---

### Task 8: Network Security Command
**Goal:** CLI for network security configuration

**Files:**
- server/commands/network-security.js
- server/commands/network-security.test.js

**Acceptance Criteria:**
- [x] `tlc network tls` - generate TLS config
- [x] `tlc network headers` - generate headers
- [x] `tlc network firewall` - generate firewall rules
- [x] `tlc network audit` - check current config
- [x] `--output` format option
- [x] `--apply` to write configs

**Test Cases:**
- Parses tls subcommand
- Parses headers subcommand
- Parses firewall subcommand
- Runs audit check
- Outputs in specified format
- Applies configuration files

---

## Dependencies

Tasks are independent and can be built in parallel.

## Estimated Scope

- Tasks: 8
- Files: 16 (8 modules + 8 test files)
- Tests: ~80
