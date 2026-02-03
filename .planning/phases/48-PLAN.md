# Phase 48: Secure Code Generation - Plan

## Overview

Security utilities and validators that ensure TLC-generated code is secure by default, addressing OWASP Top 10 2025.

**Problem:** AI code generators produce vulnerable code:
- 45% contains security flaws
- Missing input validation by default
- XSS vulnerabilities in 86% of samples

## Prerequisites

- [x] Phase 31 compliance infrastructure exists
- [x] Server lib directory structure

## Tasks

### Task 1: Input Validator Module [ ]

**Goal:** Validate and sanitize all user inputs to prevent injection attacks.

**Files:**
- server/lib/security/input-validator.js
- server/lib/security/input-validator.test.js

**Acceptance Criteria:**
- [ ] Validates string inputs (length, pattern, encoding)
- [ ] Sanitizes HTML to prevent XSS
- [ ] Validates numeric inputs (range, type)
- [ ] Validates email, URL, UUID formats
- [ ] Detects and blocks SQL injection patterns
- [ ] Detects and blocks command injection patterns
- [ ] Provides whitelist/blacklist filtering
- [ ] Returns structured validation errors

**Test Cases:**
- Valid string passes validation
- String exceeding max length fails
- SQL injection patterns detected and blocked
- Command injection patterns detected and blocked
- XSS payloads sanitized
- Valid email passes, invalid email fails
- Valid URL passes, malformed URL fails
- Numeric input within range passes
- Numeric input outside range fails

---

### Task 2: Output Encoder Module [ ]

**Goal:** Context-aware output encoding to prevent XSS in all contexts.

**Files:**
- server/lib/security/output-encoder.js
- server/lib/security/output-encoder.test.js

**Acceptance Criteria:**
- [ ] HTML entity encoding for HTML content
- [ ] JavaScript string encoding for JS contexts
- [ ] URL encoding for URL parameters
- [ ] CSS encoding for style contexts
- [ ] Attribute encoding for HTML attributes
- [ ] Auto-detects context when possible
- [ ] Preserves safe content (no double-encoding)

**Test Cases:**
- HTML special chars encoded (&lt;, &gt;, &amp;, &quot;)
- JavaScript strings properly escaped
- URL parameters percent-encoded
- CSS values escaped
- Attribute values quoted and encoded
- Already-encoded content not double-encoded
- Null bytes stripped
- Unicode handled correctly

---

### Task 3: Query Builder (Parameterized) [ ]

**Goal:** Safe query building that enforces parameterized queries.

**Files:**
- server/lib/security/query-builder.js
- server/lib/security/query-builder.test.js

**Acceptance Criteria:**
- [ ] Builds SELECT queries with parameters
- [ ] Builds INSERT queries with parameters
- [ ] Builds UPDATE queries with parameters
- [ ] Builds DELETE queries with parameters
- [ ] Rejects string concatenation attempts
- [ ] Validates table/column names against whitelist
- [ ] Supports PostgreSQL, MySQL, SQLite syntax
- [ ] Escapes identifiers properly

**Test Cases:**
- SELECT with WHERE parameters
- INSERT with value parameters
- UPDATE with SET and WHERE parameters
- DELETE with WHERE parameters
- String concatenation in WHERE throws error
- Unwhitelisted table name rejected
- SQL keywords in values safely parameterized
- Multiple parameters handled correctly

---

### Task 4: Path Validator Module [ ]

**Goal:** Prevent path traversal attacks.

**Files:**
- server/lib/security/path-validator.js
- server/lib/security/path-validator.test.js

**Acceptance Criteria:**
- [ ] Validates paths against allowed base directories
- [ ] Detects and blocks ../ traversal attempts
- [ ] Normalizes paths before validation
- [ ] Handles URL-encoded path segments
- [ ] Validates file extensions against whitelist
- [ ] Rejects null bytes in paths
- [ ] Supports both Unix and Windows paths

**Test Cases:**
- Valid path within base directory passes
- Path with ../ blocked
- URL-encoded ..%2f blocked
- Double-encoded traversal blocked
- Null byte in path blocked
- Symlink outside base directory blocked
- Absolute path outside base blocked
- Windows path traversal (..\\) blocked

---

### Task 5: Auth Security Module [ ]

**Goal:** Secure authentication primitives.

**Files:**
- server/lib/security/auth-security.js
- server/lib/security/auth-security.test.js

**Acceptance Criteria:**
- [ ] Password hashing with Argon2id
- [ ] Password verification with timing-safe comparison
- [ ] Secure session token generation (256-bit)
- [ ] Session token validation
- [ ] Rate limiting tracker (attempts per window)
- [ ] Account lockout after N failures
- [ ] Secure cookie options generator (httpOnly, secure, sameSite)

**Test Cases:**
- Password hashes with Argon2id parameters
- Password verification returns true for correct password
- Password verification returns false for incorrect password
- Timing is constant regardless of password length
- Session tokens are 256-bit cryptographically random
- Rate limiter blocks after threshold
- Rate limiter resets after window
- Account lockout after N failed attempts
- Cookie options include httpOnly, secure, sameSite=Strict

---

### Task 6: CORS Validator Module [ ]

**Goal:** Strict CORS configuration with no wildcard origins.

**Files:**
- server/lib/security/cors-validator.js
- server/lib/security/cors-validator.test.js

**Acceptance Criteria:**
- [ ] Validates origin against whitelist
- [ ] Rejects wildcard (*) in production
- [ ] Validates allowed methods
- [ ] Validates allowed headers
- [ ] Generates proper CORS headers
- [ ] Handles preflight OPTIONS requests
- [ ] Supports credentials mode configuration

**Test Cases:**
- Whitelisted origin allowed
- Non-whitelisted origin rejected
- Wildcard origin rejected in production mode
- Wildcard origin allowed in development mode
- OPTIONS preflight returns correct headers
- Credentials mode sets Allow-Credentials header
- Invalid method rejected
- Custom headers validated against whitelist

---

### Task 7: Secret Detector Module [ ]

**Goal:** Detect hardcoded secrets in code before they ship.

**Files:**
- server/lib/security/secret-detector.js
- server/lib/security/secret-detector.test.js

**Acceptance Criteria:**
- [ ] Detects API keys (AWS, GitHub, Stripe, etc.)
- [ ] Detects private keys (RSA, EC, etc.)
- [ ] Detects passwords in assignment statements
- [ ] Detects JWT tokens
- [ ] Detects connection strings with passwords
- [ ] Returns location (file, line, column)
- [ ] Supports custom patterns
- [ ] Low false positive rate

**Test Cases:**
- AWS access key detected
- AWS secret key detected
- GitHub token detected
- Stripe API key detected
- Private key block detected
- Password assignment detected
- JWT token detected
- Database connection string with password detected
- Environment variable reference not flagged (false positive)
- Random string not flagged (false positive)

---

### Task 8: Crypto Utilities Module [ ]

**Goal:** Secure cryptographic primitives.

**Files:**
- server/lib/security/crypto-utils.js
- server/lib/security/crypto-utils.test.js

**Acceptance Criteria:**
- [ ] Secure random bytes generation
- [ ] Secure random string generation (hex, base64, alphanumeric)
- [ ] AES-256-GCM encryption/decryption
- [ ] HMAC-SHA256 signing/verification
- [ ] Key derivation (PBKDF2, HKDF)
- [ ] Constant-time comparison
- [ ] No deprecated algorithms (MD5, SHA1 for security)

**Test Cases:**
- Random bytes are cryptographically random
- Random strings have correct length and charset
- AES-GCM encryption roundtrips correctly
- AES-GCM decryption fails with wrong key
- AES-GCM decryption fails with tampered ciphertext
- HMAC verification passes for valid signature
- HMAC verification fails for invalid signature
- Constant-time comparison prevents timing attacks
- PBKDF2 derives consistent keys
- MD5/SHA1 usage for security purposes throws error

---

### Task 9: Error Sanitizer Module [ ]

**Goal:** Sanitize error messages for production.

**Files:**
- server/lib/security/error-sanitizer.js
- server/lib/security/error-sanitizer.test.js

**Acceptance Criteria:**
- [ ] Strips stack traces in production
- [ ] Removes file paths from errors
- [ ] Removes internal error codes
- [ ] Preserves user-friendly messages
- [ ] Logs full error internally
- [ ] Returns safe error structure
- [ ] Handles nested errors

**Test Cases:**
- Stack trace removed in production
- Stack trace preserved in development
- File paths removed from error message
- Internal database errors genericized
- User-friendly message preserved
- Error ID returned for support reference
- Nested error.cause handled
- Circular reference errors handled

---

### Task 10: Security Headers Generator [ ]

**Goal:** Generate secure HTTP headers for all responses.

**Files:**
- server/lib/security/headers-generator.js
- server/lib/security/headers-generator.test.js

**Acceptance Criteria:**
- [ ] Content-Security-Policy (strict, no unsafe-inline)
- [ ] Strict-Transport-Security (HSTS)
- [ ] X-Content-Type-Options
- [ ] X-Frame-Options
- [ ] Referrer-Policy
- [ ] Permissions-Policy
- [ ] Cross-Origin-Opener-Policy
- [ ] Cross-Origin-Embedder-Policy
- [ ] Configurable per-route overrides

**Test Cases:**
- CSP header generated with strict defaults
- CSP allows configured script sources
- HSTS header has correct max-age
- HSTS includes includeSubDomains
- X-Content-Type-Options is nosniff
- X-Frame-Options is DENY by default
- X-Frame-Options can be SAMEORIGIN
- Referrer-Policy is strict-origin-when-cross-origin
- Permissions-Policy disables unused APIs
- Per-route CSP override works

---

## Dependencies

| Task | Depends On | Reason |
|------|------------|--------|
| 5 (Auth) | 8 (Crypto) | Uses secure random and hashing |
| 7 (Secrets) | - | Independent |
| 9 (Errors) | - | Independent |
| 10 (Headers) | - | Independent |

**Parallel groups:**
- Group A: Tasks 1, 2, 3, 4, 6, 7, 9, 10 (independent)
- Group B: Task 8 (independent, but 5 depends on it)
- Group C: Task 5 (after Task 8)

## Estimated Scope

- Tasks: 10
- Files: 20 (10 modules + 10 test files)
- Tests: ~90
