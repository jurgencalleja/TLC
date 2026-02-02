# Phase 30: SSO Integration - Plan

## Overview

Enterprise authentication with OAuth 2.0 and SAML 2.0 support. Integrates with existing auth-system.js to add external identity provider login, role mapping, and MFA.

## Prerequisites

- [x] Phase 29 complete (Zero-Data-Retention Mode)
- [x] Existing auth-system.js with JWT and session support

## Tasks

### Task 1: OAuth Provider Registry [ ]

**Goal:** Registry for configuring OAuth 2.0 providers

**Files:**
- server/lib/oauth-registry.js
- server/lib/oauth-registry.test.js

**Acceptance Criteria:**
- [ ] Register OAuth providers (GitHub, Google, Azure AD)
- [ ] Store client ID, client secret, scopes
- [ ] Validate provider configuration
- [ ] Get provider by name
- [ ] List all registered providers
- [ ] Load providers from .tlc.json

**Test Cases:**
- registerProvider adds provider to registry
- registerProvider validates required fields (clientId, clientSecret, authUrl, tokenUrl)
- getProvider returns registered provider
- getProvider returns null for unknown provider
- listProviders returns all registered providers
- loadFromConfig reads providers from .tlc.json
- validateConfig returns errors for invalid config
- supports GitHub provider defaults
- supports Google provider defaults
- supports Azure AD provider defaults

---

### Task 2: OAuth Flow Handler [ ]

**Goal:** Handle OAuth 2.0 authorization code flow

**Files:**
- server/lib/oauth-flow.js
- server/lib/oauth-flow.test.js

**Acceptance Criteria:**
- [ ] Generate authorization URL with state
- [ ] Exchange code for tokens
- [ ] Refresh access tokens
- [ ] Validate state parameter (CSRF protection)
- [ ] Handle OAuth errors
- [ ] Support PKCE for public clients

**Test Cases:**
- getAuthorizationUrl generates valid URL with state
- getAuthorizationUrl includes scopes
- getAuthorizationUrl supports PKCE code challenge
- exchangeCode sends correct request to token endpoint
- exchangeCode returns access and refresh tokens
- exchangeCode handles error response
- refreshToken exchanges refresh token for new access token
- refreshToken handles expired refresh token
- validateState detects state mismatch
- validateState detects expired state
- handleCallback processes successful OAuth callback
- handleCallback rejects invalid state

---

### Task 3: SAML Provider [ ]

**Goal:** SAML 2.0 Service Provider implementation

**Files:**
- server/lib/saml-provider.js
- server/lib/saml-provider.test.js

**Acceptance Criteria:**
- [ ] Parse SAML metadata
- [ ] Generate SAML AuthnRequest
- [ ] Validate SAML Response signature
- [ ] Extract user attributes from assertion
- [ ] Handle SAML logout
- [ ] Support multiple IdP configurations

**Test Cases:**
- parseMetadata extracts IdP endpoints
- parseMetadata extracts signing certificate
- generateAuthnRequest creates valid SAML request
- generateAuthnRequest includes issuer and callback URL
- validateResponse verifies XML signature
- validateResponse rejects invalid signature
- validateResponse rejects expired assertion
- extractAttributes gets user email and name
- extractAttributes gets custom attributes
- handleLogout processes SAML logout request
- handleLogout generates logout response
- supports multiple IdP configurations

---

### Task 4: Identity Provider Manager [ ]

**Goal:** Unified interface for OAuth and SAML providers

**Files:**
- server/lib/idp-manager.js
- server/lib/idp-manager.test.js

**Acceptance Criteria:**
- [ ] Abstract interface for identity providers
- [ ] Route to OAuth or SAML based on config
- [ ] Normalize user profile from different providers
- [ ] Cache provider metadata
- [ ] Handle provider-specific user info endpoints

**Test Cases:**
- registerProvider adds OAuth provider
- registerProvider adds SAML provider
- getLoginUrl returns OAuth authorization URL
- getLoginUrl returns SAML redirect URL
- handleCallback processes OAuth callback
- handleCallback processes SAML response
- normalizeProfile extracts email from GitHub
- normalizeProfile extracts email from Google
- normalizeProfile extracts email from Azure AD
- normalizeProfile extracts email from SAML assertion
- cacheMetadata stores provider metadata
- getProvider returns correct provider type

---

### Task 5: Role Mapper [ ]

**Goal:** Map IdP roles/groups to TLC roles

**Files:**
- server/lib/role-mapper.js
- server/lib/role-mapper.test.js

**Acceptance Criteria:**
- [ ] Define role mappings in config
- [ ] Map IdP groups to TLC roles (admin, engineer, qa, po)
- [ ] Support regex patterns for group matching
- [ ] Default role for unmapped users
- [ ] Priority-based role assignment
- [ ] Sync roles on each login

**Test Cases:**
- mapRoles maps GitHub team to TLC role
- mapRoles maps Google group to TLC role
- mapRoles maps Azure AD group to TLC role
- mapRoles maps SAML group to TLC role
- mapRoles uses regex pattern matching
- mapRoles assigns default role for unmapped users
- mapRoles respects priority order
- mapRoles handles multiple matching groups
- syncRoles updates user roles on login
- getRoleMappings returns configured mappings
- validateMappings detects invalid role names

---

### Task 6: MFA Handler [ ]

**Goal:** Multi-factor authentication support

**Files:**
- server/lib/mfa-handler.js
- server/lib/mfa-handler.test.js

**Acceptance Criteria:**
- [ ] Generate TOTP secrets
- [ ] Validate TOTP codes
- [ ] Generate backup codes
- [ ] Validate backup codes (one-time use)
- [ ] Check if MFA required for user
- [ ] Support MFA enforcement policies

**Test Cases:**
- generateSecret creates TOTP secret
- generateSecret returns QR code URL
- validateCode accepts valid TOTP code
- validateCode rejects invalid code
- validateCode handles clock drift
- generateBackupCodes creates 10 codes
- validateBackupCode accepts valid backup code
- validateBackupCode rejects used backup code
- isMfaRequired checks user MFA status
- isMfaRequired checks enforcement policy
- enforceMfa enables MFA requirement for user
- disableMfa removes MFA for user

---

### Task 7: SSO Session Manager [ ]

**Goal:** Enhanced session management for SSO

**Files:**
- server/lib/sso-session.js
- server/lib/sso-session.test.js

**Acceptance Criteria:**
- [ ] Create session from IdP authentication
- [ ] Store IdP tokens in session
- [ ] Handle session timeout
- [ ] Single logout (propagate to IdP)
- [ ] Session refresh from IdP
- [ ] Concurrent session limits

**Test Cases:**
- createSession stores user and IdP info
- createSession sets expiry from config
- getSession returns valid session
- getSession returns null for expired session
- refreshSession extends session lifetime
- refreshSession refreshes IdP tokens
- destroySession removes session
- destroySession triggers IdP logout
- enforceSessionLimit limits concurrent sessions
- enforceSessionLimit removes oldest session
- getActiveSessions returns user's sessions
- cleanupExpiredSessions removes old sessions

---

### Task 8: SSO Command [ ]

**Goal:** CLI command for SSO configuration

**Files:**
- server/lib/sso-command.js
- server/lib/sso-command.test.js

**Acceptance Criteria:**
- [ ] `tlc sso providers` - list configured providers
- [ ] `tlc sso add <provider>` - add OAuth/SAML provider
- [ ] `tlc sso remove <provider>` - remove provider
- [ ] `tlc sso test <provider>` - test provider config
- [ ] `tlc sso roles` - show role mappings
- [ ] `tlc sso status` - show SSO status

**Test Cases:**
- execute providers lists all providers
- execute providers shows empty state
- execute add prompts for OAuth config
- execute add prompts for SAML config
- execute add validates configuration
- execute remove deletes provider
- execute remove confirms deletion
- execute test validates provider connectivity
- execute test reports errors
- execute roles shows role mappings
- execute roles shows unmapped warning
- execute status shows SSO enabled/disabled
- parseArgs handles all subcommands
- formatProvider returns readable output

---

### Task 9: Dashboard SSOPane [ ]

**Goal:** Dashboard component for SSO management

**Files:**
- dashboard/src/components/SSOPane.tsx
- dashboard/src/components/SSOPane.test.tsx

**Acceptance Criteria:**
- [ ] List configured identity providers
- [ ] Show provider status (connected/error)
- [ ] Add/remove providers via UI
- [ ] Show role mapping configuration
- [ ] Show active SSO sessions
- [ ] MFA enrollment status

**Test Cases:**
- renders provider list correctly
- renders empty state when no providers
- shows connected status for working providers
- shows error status for failing providers
- add provider button opens modal
- remove provider shows confirmation
- shows role mapping table
- shows active sessions count
- shows MFA enrollment stats
- handles loading state
- handles error state
- refresh button reloads data

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | OAuth flow needs provider registry |
| 4 | 1, 2, 3 | IdP manager wraps OAuth and SAML |
| 5 | 4 | Role mapper needs normalized profiles |
| 7 | 4, 6 | Session manager needs IdP and MFA |
| 8 | 1, 4, 5 | Command uses all SSO components |
| 9 | 4, 5, 7 | Dashboard displays SSO status |

**Parallel groups:**
- Group A: Tasks 1, 3, 6 (independent foundations)
- Group B: Task 2 (after 1)
- Group C: Tasks 4, 5 (after Group A and B)
- Group D: Task 7 (after 4, 6)
- Group E: Tasks 8, 9 (after dependencies, can parallelize)

## Estimated Scope

- Tasks: 9
- Files: 18 (9 modules + 9 test files)
- Tests: ~120 (estimated)
