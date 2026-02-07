/**
 * Structure Rules Tests
 *
 * Detects flat folder anti-patterns, files in wrong locations,
 * and missing test colocation.
 */
import { describe, it, expect } from 'vitest';

const {
  checkFlatFolders,
  checkLooseFiles,
  checkTestColocation,
} = require('./structure-rules.js');

describe('Structure Rules', () => {
  describe('checkFlatFolders', () => {
    it('detects services/ folder at root', () => {
      const findings = checkFlatFolders('services/userService.js', 'code');
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('no-flat-folders');
      expect(findings[0].severity).toBe('warn');
    });

    it('detects controllers/ folder', () => {
      const findings = checkFlatFolders('controllers/userCtrl.js', 'code');
      expect(findings).toHaveLength(1);
    });

    it('detects interfaces/ at src root', () => {
      const findings = checkFlatFolders('src/interfaces/IUser.ts', 'code');
      expect(findings).toHaveLength(1);
    });

    it('passes module-scoped paths', () => {
      const findings = checkFlatFolders('src/user/services/userService.js', 'code');
      expect(findings).toHaveLength(0);
    });

    it('passes nested interfaces in module', () => {
      const findings = checkFlatFolders('src/user/interfaces/IUser.ts', 'code');
      expect(findings).toHaveLength(0);
    });
  });

  describe('checkLooseFiles', () => {
    it('detects .js files in project root', () => {
      const findings = checkLooseFiles('random-script.js', 'code');
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('no-loose-files');
      expect(findings[0].severity).toBe('warn');
    });

    it('allows index.js at root', () => {
      const findings = checkLooseFiles('index.js', 'code');
      expect(findings).toHaveLength(0);
    });

    it('allows config files at root', () => {
      const findings = checkLooseFiles('vitest.config.js', 'code');
      expect(findings).toHaveLength(0);
    });

    it('allows package.json at root', () => {
      const findings = checkLooseFiles('package.json', '{}');
      expect(findings).toHaveLength(0);
    });

    it('passes files in subdirectories', () => {
      const findings = checkLooseFiles('src/app.js', 'code');
      expect(findings).toHaveLength(0);
    });
  });

  describe('checkTestColocation', () => {
    it('flags source file without test file', () => {
      const allFiles = ['src/user.js'];
      const findings = checkTestColocation('src/user.js', 'code', { allFiles });
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('require-test-file');
      expect(findings[0].severity).toBe('block');
    });

    it('passes when test file exists', () => {
      const allFiles = ['src/user.js', 'src/user.test.js'];
      const findings = checkTestColocation('src/user.js', 'code', { allFiles });
      expect(findings).toHaveLength(0);
    });

    it('skips check for test files themselves', () => {
      const allFiles = ['src/user.test.js'];
      const findings = checkTestColocation('src/user.test.js', 'test code', { allFiles });
      expect(findings).toHaveLength(0);
    });

    it('skips check for config files', () => {
      const allFiles = ['vitest.config.js'];
      const findings = checkTestColocation('vitest.config.js', 'config', { allFiles });
      expect(findings).toHaveLength(0);
    });

    it('skips check for non-JS files', () => {
      const allFiles = ['README.md'];
      const findings = checkTestColocation('README.md', '# readme', { allFiles });
      expect(findings).toHaveLength(0);
    });
  });
});
