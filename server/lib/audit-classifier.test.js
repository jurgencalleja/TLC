import { describe, it, expect } from 'vitest';
import {
  classifyAction,
  detectSensitive,
  getSeverity,
} from './audit-classifier.js';

describe('audit-classifier', () => {
  describe('classifyAction', () => {
    it('returns "file:read" for Read tool', () => {
      const action = { tool: 'Read', params: { file_path: '/src/index.js' } };
      const result = classifyAction(action);
      expect(result).toBe('file:read');
    });

    it('returns "file:write" for Write tool', () => {
      const action = { tool: 'Write', params: { file_path: '/src/new.js', content: 'code' } };
      const result = classifyAction(action);
      expect(result).toBe('file:write');
    });

    it('returns "file:edit" for Edit tool', () => {
      const action = { tool: 'Edit', params: { file_path: '/src/index.js', old_string: 'a', new_string: 'b' } };
      const result = classifyAction(action);
      expect(result).toBe('file:edit');
    });

    it('returns "shell:execute" for Bash tool', () => {
      const action = { tool: 'Bash', params: { command: 'ls -la /src' } };
      const result = classifyAction(action);
      expect(result).toBe('shell:execute');
    });

    it('returns "shell:git" for git commands', () => {
      const action = { tool: 'Bash', params: { command: 'git status' } };
      const result = classifyAction(action);
      expect(result).toBe('shell:git');
    });

    it('returns "shell:git" for git commands with flags', () => {
      const action = { tool: 'Bash', params: { command: 'git commit -m "message"' } };
      const result = classifyAction(action);
      expect(result).toBe('shell:git');
    });

    it('returns "network:fetch" for WebFetch', () => {
      const action = { tool: 'WebFetch', params: { url: 'https://example.com' } };
      const result = classifyAction(action);
      expect(result).toBe('network:fetch');
    });

    it('returns "network:search" for WebSearch', () => {
      const action = { tool: 'WebSearch', params: { query: 'test query' } };
      const result = classifyAction(action);
      expect(result).toBe('network:search');
    });

    it('returns "file:glob" for Glob tool', () => {
      const action = { tool: 'Glob', params: { pattern: '**/*.js' } };
      const result = classifyAction(action);
      expect(result).toBe('file:glob');
    });

    it('returns "file:grep" for Grep tool', () => {
      const action = { tool: 'Grep', params: { pattern: 'function' } };
      const result = classifyAction(action);
      expect(result).toBe('file:grep');
    });

    it('returns "shell:npm" for npm commands', () => {
      const action = { tool: 'Bash', params: { command: 'npm run test' } };
      const result = classifyAction(action);
      expect(result).toBe('shell:npm');
    });

    it('returns "unknown" for unrecognized tools', () => {
      const action = { tool: 'CustomTool', params: {} };
      const result = classifyAction(action);
      expect(result).toBe('unknown');
    });
  });

  describe('detectSensitive', () => {
    it('flags .env file access', () => {
      const action = { tool: 'Read', params: { file_path: '/project/.env' } };
      const result = detectSensitive(action);
      expect(result.isSensitive).toBe(true);
      expect(result.reason).toContain('.env');
    });

    it('flags .env.local file access', () => {
      const action = { tool: 'Write', params: { file_path: '/project/.env.local', content: 'SECRET=abc' } };
      const result = detectSensitive(action);
      expect(result.isSensitive).toBe(true);
    });

    it('flags credential patterns in file paths', () => {
      const action = { tool: 'Read', params: { file_path: '/project/credentials.json' } };
      const result = detectSensitive(action);
      expect(result.isSensitive).toBe(true);
      expect(result.reason).toContain('credential');
    });

    it('flags secrets directory access', () => {
      const action = { tool: 'Read', params: { file_path: '/project/.secrets/api-key.txt' } };
      const result = detectSensitive(action);
      expect(result.isSensitive).toBe(true);
    });

    it('flags private key files', () => {
      const action = { tool: 'Read', params: { file_path: '/home/user/.ssh/id_rsa' } };
      const result = detectSensitive(action);
      expect(result.isSensitive).toBe(true);
      expect(result.reason).toContain('private key');
    });

    it('flags AWS credentials file', () => {
      const action = { tool: 'Read', params: { file_path: '/home/user/.aws/credentials' } };
      const result = detectSensitive(action);
      expect(result.isSensitive).toBe(true);
    });

    it('does not flag regular source files', () => {
      const action = { tool: 'Read', params: { file_path: '/project/src/index.js' } };
      const result = detectSensitive(action);
      expect(result.isSensitive).toBe(false);
    });

    it('flags password in command', () => {
      const action = { tool: 'Bash', params: { command: 'echo "password=secret123"' } };
      const result = detectSensitive(action);
      expect(result.isSensitive).toBe(true);
    });

    it('flags API key in command', () => {
      const action = { tool: 'Bash', params: { command: 'curl -H "Authorization: Bearer sk-abc123"' } };
      const result = detectSensitive(action);
      expect(result.isSensitive).toBe(true);
    });

    it('flags token patterns in write content', () => {
      const action = { tool: 'Write', params: { file_path: '/config.js', content: 'const TOKEN = "ghp_abc123";' } };
      const result = detectSensitive(action);
      expect(result.isSensitive).toBe(true);
    });
  });

  describe('getSeverity', () => {
    it('returns "critical" for sensitive operations', () => {
      const action = { tool: 'Read', params: { file_path: '/project/.env' } };
      const result = getSeverity(action);
      expect(result).toBe('critical');
    });

    it('returns "info" for read operations', () => {
      const action = { tool: 'Read', params: { file_path: '/src/index.js' } };
      const result = getSeverity(action);
      expect(result).toBe('info');
    });

    it('returns "warning" for write operations', () => {
      const action = { tool: 'Write', params: { file_path: '/src/new.js', content: 'code' } };
      const result = getSeverity(action);
      expect(result).toBe('warning');
    });

    it('returns "warning" for edit operations', () => {
      const action = { tool: 'Edit', params: { file_path: '/src/index.js' } };
      const result = getSeverity(action);
      expect(result).toBe('warning');
    });

    it('returns "warning" for shell execution', () => {
      const action = { tool: 'Bash', params: { command: 'npm install' } };
      const result = getSeverity(action);
      expect(result).toBe('warning');
    });

    it('returns "info" for git commands', () => {
      const action = { tool: 'Bash', params: { command: 'git status' } };
      const result = getSeverity(action);
      expect(result).toBe('info');
    });

    it('returns "info" for glob/grep operations', () => {
      const action = { tool: 'Glob', params: { pattern: '**/*.js' } };
      const result = getSeverity(action);
      expect(result).toBe('info');
    });

    it('returns "info" for network fetch', () => {
      const action = { tool: 'WebFetch', params: { url: 'https://docs.example.com' } };
      const result = getSeverity(action);
      expect(result).toBe('info');
    });

    it('returns "critical" for destructive git commands', () => {
      const action = { tool: 'Bash', params: { command: 'git push --force' } };
      const result = getSeverity(action);
      expect(result).toBe('critical');
    });

    it('returns "critical" for rm -rf commands', () => {
      const action = { tool: 'Bash', params: { command: 'rm -rf /project/dist' } };
      const result = getSeverity(action);
      expect(result).toBe('critical');
    });
  });
});
