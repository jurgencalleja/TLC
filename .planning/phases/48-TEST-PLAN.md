# Phase 48 Test Plan

## Task 1: Input Validator Module

### File: server/lib/security/input-validator.test.js

| Test | Type | Expected Result |
|------|------|-----------------|
| validates string within max length | happy path | returns { valid: true } |
| rejects string exceeding max length | error | returns { valid: false, error } |
| detects SQL injection pattern | security | returns { valid: false, threat: 'sql_injection' } |
| detects command injection pattern | security | returns { valid: false, threat: 'command_injection' } |
| sanitizes XSS payload | security | returns sanitized string |
| validates correct email format | happy path | returns { valid: true } |
| rejects invalid email format | error | returns { valid: false } |
| validates URL format | happy path | returns { valid: true } |
| validates numeric within range | happy path | returns { valid: true } |
| rejects numeric outside range | error | returns { valid: false } |

### Dependencies to mock: None

---

## Task 2: Output Encoder Module

### File: server/lib/security/output-encoder.test.js

| Test | Type | Expected Result |
|------|------|-----------------|
| encodes HTML special characters | happy path | < becomes &lt; etc |
| encodes JavaScript strings | happy path | escapes quotes and backslashes |
| URL encodes parameters | happy path | spaces become %20 |
| encodes CSS values | happy path | escapes CSS special chars |
| encodes HTML attributes | happy path | quotes values properly |
| does not double-encode | edge case | already encoded content unchanged |
| strips null bytes | security | \x00 removed |
| handles unicode correctly | edge case | preserves valid unicode |

### Dependencies to mock: None

---

## Task 3: Query Builder Module

### File: server/lib/security/query-builder.test.js

| Test | Type | Expected Result |
|------|------|-----------------|
| builds SELECT with parameters | happy path | returns { sql, params } |
| builds INSERT with parameters | happy path | returns { sql, params } |
| builds UPDATE with parameters | happy path | returns { sql, params } |
| builds DELETE with parameters | happy path | returns { sql, params } |
| rejects string concatenation | security | throws SecurityError |
| rejects unwhitelisted table | security | throws SecurityError |
| parameterizes SQL keywords in values | security | keywords treated as data |
| handles multiple parameters | happy path | correct parameter order |

### Dependencies to mock: None

---

## Task 4: Path Validator Module

### File: server/lib/security/path-validator.test.js

| Test | Type | Expected Result |
|------|------|-----------------|
| allows path within base directory | happy path | returns { valid: true } |
| blocks ../ traversal | security | returns { valid: false, threat: 'path_traversal' } |
| blocks URL-encoded traversal | security | blocks ..%2f |
| blocks double-encoded traversal | security | blocks %252e%252e |
| blocks null byte in path | security | returns { valid: false } |
| validates file extensions | happy path | whitelist works |
| rejects disallowed extensions | error | returns { valid: false } |
| handles Windows paths | edge case | blocks ..\\ |

### Dependencies to mock: fs (for symlink checks)

---

## Task 5: Auth Security Module

### File: server/lib/security/auth-security.test.js

| Test | Type | Expected Result |
|------|------|-----------------|
| hashes password with Argon2id | happy path | returns hash string |
| verifies correct password | happy path | returns true |
| rejects incorrect password | error | returns false |
| generates 256-bit session tokens | happy path | token is 32 bytes hex |
| rate limiter blocks after threshold | security | returns { blocked: true } |
| rate limiter resets after window | happy path | allows after window |
| account lockout after N failures | security | returns { locked: true } |
| generates secure cookie options | happy path | httpOnly, secure, sameSite |
| timing-safe comparison | security | constant time regardless of input |

### Dependencies to mock: None (uses crypto directly)

---

## Task 6: CORS Validator Module

### File: server/lib/security/cors-validator.test.js

| Test | Type | Expected Result |
|------|------|-----------------|
| allows whitelisted origin | happy path | returns { allowed: true } |
| rejects non-whitelisted origin | security | returns { allowed: false } |
| rejects wildcard in production | security | throws SecurityError |
| allows wildcard in development | happy path | returns { allowed: true } |
| handles preflight OPTIONS | happy path | returns correct headers |
| sets credentials header when enabled | happy path | Access-Control-Allow-Credentials |
| rejects invalid method | error | returns { allowed: false } |
| validates custom headers | happy path | whitelist enforced |

### Dependencies to mock: None

---

## Task 7: Secret Detector Module

### File: server/lib/security/secret-detector.test.js

| Test | Type | Expected Result |
|------|------|-----------------|
| detects AWS access key | security | returns finding with location |
| detects AWS secret key | security | returns finding with location |
| detects GitHub token | security | returns finding with location |
| detects Stripe API key | security | returns finding with location |
| detects private key block | security | returns finding |
| detects password assignment | security | returns finding |
| detects JWT token | security | returns finding |
| detects connection string with password | security | returns finding |
| does not flag environment variable | false positive | no finding |
| does not flag random strings | false positive | no finding |

### Dependencies to mock: fs (for file scanning)

---

## Task 8: Crypto Utilities Module

### File: server/lib/security/crypto-utils.test.js

| Test | Type | Expected Result |
|------|------|-----------------|
| generates cryptographically random bytes | happy path | returns Buffer |
| generates random string with correct charset | happy path | matches charset |
| AES-GCM encryption roundtrips | happy path | decrypted equals plaintext |
| AES-GCM fails with wrong key | security | throws DecryptionError |
| AES-GCM fails with tampered ciphertext | security | throws DecryptionError |
| HMAC verification passes for valid | happy path | returns true |
| HMAC verification fails for invalid | security | returns false |
| constant-time comparison works | security | no timing difference |
| PBKDF2 derives consistent keys | happy path | same input = same key |
| rejects MD5/SHA1 for security | security | throws DeprecatedAlgorithmError |

### Dependencies to mock: None (uses crypto directly)

---

## Task 9: Error Sanitizer Module

### File: server/lib/security/error-sanitizer.test.js

| Test | Type | Expected Result |
|------|------|-----------------|
| removes stack trace in production | security | no stack property |
| preserves stack trace in development | happy path | stack present |
| removes file paths | security | no /home/user paths |
| genericizes database errors | security | returns generic message |
| preserves user-friendly message | happy path | message unchanged |
| returns error ID for support | happy path | id in response |
| handles nested error.cause | edge case | cause also sanitized |
| handles circular references | edge case | no infinite loop |

### Dependencies to mock: None

---

## Task 10: Security Headers Generator

### File: server/lib/security/headers-generator.test.js

| Test | Type | Expected Result |
|------|------|-----------------|
| generates CSP with strict defaults | happy path | no unsafe-inline |
| CSP allows configured sources | happy path | script-src includes source |
| HSTS has correct max-age | happy path | 31536000 |
| HSTS includes includeSubDomains | happy path | present in header |
| X-Content-Type-Options is nosniff | happy path | header value correct |
| X-Frame-Options is DENY | happy path | header value correct |
| X-Frame-Options can be SAMEORIGIN | config | override works |
| Referrer-Policy is strict | happy path | strict-origin-when-cross-origin |
| Permissions-Policy disables APIs | happy path | camera=(), etc |
| per-route CSP override works | config | route-specific CSP |

### Dependencies to mock: None
