import { describe, it, expect } from 'vitest';
import {
  detectSensitive,
  getSensitivityLevel,
  classifyType,
} from './sensitive-detector.js';

describe('sensitive-detector', () => {
  describe('detectSensitive', () => {
    it('identifies OpenAI API keys (sk-...)', () => {
      const content = 'OPENAI_KEY=sk-1234567890abcdefghijklmnopqrstuvwxyz12345678';
      const result = detectSensitive(content);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('openai_api_key');
      expect(result[0].match).toContain('sk-');
    });

    it('identifies AWS credentials (AKIA...)', () => {
      const content = 'aws_access_key_id = AKIAIOSFODNN7EXAMPLE';
      const result = detectSensitive(content);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('aws_access_key');
      expect(result[0].match).toContain('AKIA');
    });

    it('identifies GitHub tokens (ghp_...)', () => {
      const content = 'GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      const result = detectSensitive(content);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('github_token');
      expect(result[0].match).toContain('ghp_');
    });

    it('identifies GitHub personal access tokens (github_pat_...)', () => {
      const content = 'TOKEN=github_pat_11ABCDEFG_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      const result = detectSensitive(content);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('github_pat');
      expect(result[0].match).toContain('github_pat_');
    });

    it('identifies passwords in config', () => {
      const content = `
        db_password: "super_secret_123"
        password=mysecretpassword
        MYSQL_ROOT_PASSWORD=rootpass
      `;
      const result = detectSensitive(content);

      expect(result.length).toBeGreaterThanOrEqual(3);
      const passwordMatches = result.filter(r => r.type === 'password');
      expect(passwordMatches.length).toBeGreaterThanOrEqual(3);
    });

    it('identifies email addresses', () => {
      const content = 'Contact us at user@example.com or support@company.org';
      const result = detectSensitive(content);

      expect(result.length).toBeGreaterThanOrEqual(2);
      const emails = result.filter(r => r.type === 'email');
      expect(emails.length).toBeGreaterThanOrEqual(2);
      expect(emails.some(e => e.match.includes('user@example.com'))).toBe(true);
      expect(emails.some(e => e.match.includes('support@company.org'))).toBe(true);
    });

    it('identifies phone numbers', () => {
      const content = 'Call us at 555-123-4567 or (555) 987-6543';
      const result = detectSensitive(content);

      expect(result.length).toBeGreaterThanOrEqual(2);
      const phones = result.filter(r => r.type === 'phone_number');
      expect(phones.length).toBeGreaterThanOrEqual(2);
    });

    it('identifies SSN patterns (XXX-XX-XXXX)', () => {
      const content = 'SSN: 123-45-6789';
      const result = detectSensitive(content);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('ssn');
      expect(result[0].match).toContain('123-45-6789');
    });

    it('identifies credit card numbers', () => {
      const content = 'Card: 4111-1111-1111-1111 or 5500 0000 0000 0004';
      const result = detectSensitive(content);

      expect(result.length).toBeGreaterThanOrEqual(2);
      const cards = result.filter(r => r.type === 'credit_card');
      expect(cards.length).toBeGreaterThanOrEqual(2);
    });

    it('identifies RSA private keys', () => {
      const content = `
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAx...
-----END RSA PRIVATE KEY-----
      `;
      const result = detectSensitive(content);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('private_key');
      expect(result[0].match).toContain('BEGIN RSA PRIVATE KEY');
    });

    it('identifies SSH private keys', () => {
      const content = `
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAA...
-----END OPENSSH PRIVATE KEY-----
      `;
      const result = detectSensitive(content);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('private_key');
      expect(result[0].match).toContain('BEGIN OPENSSH PRIVATE KEY');
    });

    it('returns empty array for content with no sensitive data', () => {
      const content = 'This is just regular text with no secrets.';
      const result = detectSensitive(content);

      expect(result).toHaveLength(0);
    });

    it('identifies multiple sensitive items in same content', () => {
      const content = `
        API_KEY=sk-1234567890abcdefghijklmnopqrstuvwxyz12345678
        EMAIL=user@example.com
        SSN: 123-45-6789
      `;
      const result = detectSensitive(content);

      expect(result.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getSensitivityLevel', () => {
    it("returns 'critical' for secrets", () => {
      expect(getSensitivityLevel('openai_api_key')).toBe('critical');
      expect(getSensitivityLevel('aws_access_key')).toBe('critical');
      expect(getSensitivityLevel('github_token')).toBe('critical');
      expect(getSensitivityLevel('github_pat')).toBe('critical');
      expect(getSensitivityLevel('private_key')).toBe('critical');
      expect(getSensitivityLevel('password')).toBe('critical');
    });

    it("returns 'high' for PII", () => {
      expect(getSensitivityLevel('ssn')).toBe('high');
      expect(getSensitivityLevel('credit_card')).toBe('high');
    });

    it("returns 'medium' for contact info", () => {
      expect(getSensitivityLevel('email')).toBe('medium');
      expect(getSensitivityLevel('phone_number')).toBe('medium');
    });

    it("returns 'low' for unknown types", () => {
      expect(getSensitivityLevel('unknown_type')).toBe('low');
    });
  });

  describe('classifyType', () => {
    it('returns correct type for OpenAI API key', () => {
      expect(classifyType('sk-1234567890abcdefghijklmnopqrstuvwxyz12345678')).toBe('openai_api_key');
    });

    it('returns correct type for AWS access key', () => {
      expect(classifyType('AKIAIOSFODNN7EXAMPLE')).toBe('aws_access_key');
    });

    it('returns correct type for GitHub token', () => {
      expect(classifyType('ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')).toBe('github_token');
    });

    it('returns correct type for GitHub PAT', () => {
      expect(classifyType('github_pat_11ABCDEFG_xxxxxxxxxxxxxxxx')).toBe('github_pat');
    });

    it('returns correct type for email', () => {
      expect(classifyType('user@example.com')).toBe('email');
    });

    it('returns correct type for phone number', () => {
      expect(classifyType('555-123-4567')).toBe('phone_number');
    });

    it('returns correct type for SSN', () => {
      expect(classifyType('123-45-6789')).toBe('ssn');
    });

    it('returns correct type for credit card', () => {
      expect(classifyType('4111-1111-1111-1111')).toBe('credit_card');
    });

    it('returns correct type for private key header', () => {
      expect(classifyType('-----BEGIN RSA PRIVATE KEY-----')).toBe('private_key');
      expect(classifyType('-----BEGIN OPENSSH PRIVATE KEY-----')).toBe('private_key');
    });

    it('returns null for non-sensitive content', () => {
      expect(classifyType('just normal text')).toBeNull();
    });
  });
});
