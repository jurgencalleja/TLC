import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  shouldExclude,
  matchesPattern,
  loadPatterns,
  DEFAULT_FILE_PATTERNS,
  DEFAULT_CONTENT_PATTERNS,
  MODE,
} from './memory-exclusion.js';

describe('memory-exclusion', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-memory-exclusion-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('shouldExclude', () => {
    it('returns true for .env files', () => {
      expect(shouldExclude('.env')).toBe(true);
      expect(shouldExclude('.env.local')).toBe(true);
      expect(shouldExclude('.env.production')).toBe(true);
      expect(shouldExclude('src/.env')).toBe(true);
    });

    it('returns true for matching content patterns', () => {
      expect(shouldExclude('config.js', 'password=secret123')).toBe(true);
      expect(shouldExclude('config.js', 'api_key=abc123')).toBe(true);
      expect(shouldExclude('config.js', 'secret=mysecret')).toBe(true);
      expect(shouldExclude('config.js', 'token=xyz789')).toBe(true);
      expect(shouldExclude('config.js', 'private_key=-----BEGIN')).toBe(true);
    });

    it('returns false for safe content', () => {
      expect(shouldExclude('src/index.js')).toBe(false);
      expect(shouldExclude('src/utils.js', 'function add(a, b) { return a + b; }')).toBe(false);
      expect(shouldExclude('README.md', '# My Project')).toBe(false);
      expect(shouldExclude('package.json', '{"name": "my-app"}')).toBe(false);
    });

    it('returns true for .pem and .key files', () => {
      expect(shouldExclude('server.pem')).toBe(true);
      expect(shouldExclude('private.key')).toBe(true);
      expect(shouldExclude('certs/server.pem')).toBe(true);
    });

    it('returns true for files with credentials or secrets in name', () => {
      expect(shouldExclude('credentials.json')).toBe(true);
      expect(shouldExclude('my-credentials.yaml')).toBe(true);
      expect(shouldExclude('secrets.json')).toBe(true);
      expect(shouldExclude('app-secrets.yaml')).toBe(true);
    });
  });

  describe('whitelist mode', () => {
    it('only allows listed patterns', () => {
      const config = {
        mode: MODE.WHITELIST,
        patterns: ['*.js', '*.ts', 'package.json'],
      };

      expect(shouldExclude('src/index.js', null, config)).toBe(false);
      expect(shouldExclude('src/app.ts', null, config)).toBe(false);
      expect(shouldExclude('package.json', null, config)).toBe(false);
      expect(shouldExclude('config.yaml', null, config)).toBe(true);
      expect(shouldExclude('README.md', null, config)).toBe(true);
    });

    it('still excludes sensitive files even in whitelist mode', () => {
      const config = {
        mode: MODE.WHITELIST,
        patterns: ['*'],
        enforceDefaults: true,
      };

      expect(shouldExclude('.env', null, config)).toBe(true);
      expect(shouldExclude('server.pem', null, config)).toBe(true);
    });
  });

  describe('blacklist mode', () => {
    it('excludes listed patterns', () => {
      const config = {
        mode: MODE.BLACKLIST,
        patterns: ['*.log', '*.tmp', 'node_modules/**'],
      };

      expect(shouldExclude('debug.log', null, config)).toBe(true);
      expect(shouldExclude('temp.tmp', null, config)).toBe(true);
      expect(shouldExclude('node_modules/lodash/index.js', null, config)).toBe(true);
      expect(shouldExclude('src/index.js', null, config)).toBe(false);
    });

    it('combines with default patterns in blacklist mode', () => {
      const config = {
        mode: MODE.BLACKLIST,
        patterns: ['*.log'],
      };

      expect(shouldExclude('debug.log', null, config)).toBe(true);
      expect(shouldExclude('.env', null, config)).toBe(true);
    });
  });

  describe('loadPatterns', () => {
    it('reads patterns from config file', () => {
      const configPath = path.join(testDir, '.tlc.json');
      const config = {
        memoryExclusion: {
          mode: 'blacklist',
          filePatterns: ['*.log', '*.tmp'],
          contentPatterns: ['secret=', 'password='],
        },
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const patterns = loadPatterns(testDir);

      expect(patterns.mode).toBe(MODE.BLACKLIST);
      expect(patterns.filePatterns).toContain('*.log');
      expect(patterns.filePatterns).toContain('*.tmp');
      expect(patterns.contentPatterns).toContain('secret=');
    });

    it('uses defaults when no config file exists', () => {
      const patterns = loadPatterns(testDir);

      expect(patterns.mode).toBe(MODE.BLACKLIST);
      expect(patterns.filePatterns).toEqual(DEFAULT_FILE_PATTERNS);
      expect(patterns.contentPatterns).toEqual(DEFAULT_CONTENT_PATTERNS);
    });

    it('uses defaults when config has no memoryExclusion section', () => {
      const configPath = path.join(testDir, '.tlc.json');
      fs.writeFileSync(configPath, JSON.stringify({ project: 'test' }, null, 2));

      const patterns = loadPatterns(testDir);

      expect(patterns.filePatterns).toEqual(DEFAULT_FILE_PATTERNS);
      expect(patterns.contentPatterns).toEqual(DEFAULT_CONTENT_PATTERNS);
    });

    it('merges custom patterns with defaults', () => {
      const configPath = path.join(testDir, '.tlc.json');
      const config = {
        memoryExclusion: {
          filePatterns: ['*.custom'],
          mergeDefaults: true,
        },
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      const patterns = loadPatterns(testDir);

      expect(patterns.filePatterns).toContain('*.custom');
      expect(patterns.filePatterns).toContain('.env');
    });
  });

  describe('matchesPattern', () => {
    it('handles glob patterns', () => {
      expect(matchesPattern('test.env', '*.env')).toBe(true);
      expect(matchesPattern('config.js', '*.env')).toBe(false);
      expect(matchesPattern('.env.local', '.env.*')).toBe(true);
    });

    it('handles double star glob patterns', () => {
      expect(matchesPattern('src/config/.secrets/key.txt', '**/.secrets/*')).toBe(true);
      expect(matchesPattern('.secrets/key.txt', '**/.secrets/*')).toBe(true);
      expect(matchesPattern('src/index.js', '**/.secrets/*')).toBe(false);
    });

    it('handles regex patterns', () => {
      expect(matchesPattern('password=123', /password=/)).toBe(true);
      expect(matchesPattern('api_key=abc', /api_key=/)).toBe(true);
      expect(matchesPattern('normal content', /password=/)).toBe(false);
    });

    it('handles regex patterns as strings with regex: prefix', () => {
      expect(matchesPattern('password=123', 'regex:password=')).toBe(true);
      expect(matchesPattern('api_key=abc', 'regex:api_key=')).toBe(true);
      expect(matchesPattern('normal content', 'regex:password=')).toBe(false);
    });

    it('handles case-insensitive matching', () => {
      expect(matchesPattern('PASSWORD=123', 'regex:password=', { ignoreCase: true })).toBe(true);
      expect(matchesPattern('Api_Key=abc', 'regex:api_key=', { ignoreCase: true })).toBe(true);
    });

    it('handles exact match patterns', () => {
      expect(matchesPattern('.env', '.env')).toBe(true);
      expect(matchesPattern('src/.env', '.env')).toBe(false);
    });

    it('handles patterns with special characters', () => {
      expect(matchesPattern('file.test.js', '*.test.js')).toBe(true);
      expect(matchesPattern('credentials.json', '*credentials*')).toBe(true);
    });
  });

  describe('DEFAULT_FILE_PATTERNS', () => {
    it('includes .env patterns', () => {
      expect(DEFAULT_FILE_PATTERNS).toContain('.env');
      expect(DEFAULT_FILE_PATTERNS).toContain('.env.*');
    });

    it('includes certificate patterns', () => {
      expect(DEFAULT_FILE_PATTERNS).toContain('*.pem');
      expect(DEFAULT_FILE_PATTERNS).toContain('*.key');
    });

    it('includes credential patterns', () => {
      expect(DEFAULT_FILE_PATTERNS).toContain('*credentials*');
      expect(DEFAULT_FILE_PATTERNS).toContain('*secrets*');
    });
  });

  describe('DEFAULT_CONTENT_PATTERNS', () => {
    it('includes sensitive content patterns', () => {
      expect(DEFAULT_CONTENT_PATTERNS).toContain('password=');
      expect(DEFAULT_CONTENT_PATTERNS).toContain('api_key=');
      expect(DEFAULT_CONTENT_PATTERNS).toContain('secret=');
      expect(DEFAULT_CONTENT_PATTERNS).toContain('token=');
      expect(DEFAULT_CONTENT_PATTERNS).toContain('private_key');
    });
  });

  describe('MODE', () => {
    it('exports mode constants', () => {
      expect(MODE.WHITELIST).toBe('whitelist');
      expect(MODE.BLACKLIST).toBe('blacklist');
    });
  });
});
