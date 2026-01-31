import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  collectFiles,
  collectFromDirectory,
  loadIgnorePatterns,
  parseIgnoreFile,
  shouldIgnore,
  matchesPattern,
  isBinaryFile,
  matchesExtension,
  readFileContent,
  DEFAULT_IGNORES,
} from './file-collector.js';

describe('File Collector', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-collect-test-'));
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('parseIgnoreFile', () => {
    it('parses patterns from content', () => {
      const content = `
node_modules
dist
*.log
# This is a comment
build/
      `;
      const patterns = parseIgnoreFile(content);
      expect(patterns).toEqual(['node_modules', 'dist', '*.log', 'build/']);
    });

    it('ignores comments and empty lines', () => {
      const content = `
# Comment
pattern1

# Another comment
pattern2
      `;
      const patterns = parseIgnoreFile(content);
      expect(patterns).toEqual(['pattern1', 'pattern2']);
    });
  });

  describe('matchesPattern', () => {
    it('matches exact paths', () => {
      expect(matchesPattern('node_modules', 'node_modules')).toBe(true);
      expect(matchesPattern('src/index.js', 'src/index.js')).toBe(true);
    });

    it('matches directory patterns', () => {
      expect(matchesPattern('node_modules/package', 'node_modules/')).toBe(true);
      expect(matchesPattern('node_modules', 'node_modules/')).toBe(true); // Directory itself matches
      expect(matchesPattern('src/node_modules/pkg', 'node_modules/')).toBe(true);
    });

    it('matches glob patterns', () => {
      expect(matchesPattern('test.log', '*.log')).toBe(true);
      expect(matchesPattern('debug.log', '*.log')).toBe(true);
      expect(matchesPattern('test.txt', '*.log')).toBe(false);
    });

    it('matches nested paths', () => {
      expect(matchesPattern('src/node_modules/pkg', 'node_modules')).toBe(true);
      expect(matchesPattern('deep/nested/node_modules/pkg', 'node_modules')).toBe(true);
    });

    it('matches basename', () => {
      expect(matchesPattern('path/to/package.json', 'package.json')).toBe(true);
    });
  });

  describe('shouldIgnore', () => {
    it('returns true for matching patterns', () => {
      const patterns = ['node_modules', '*.log', 'dist/'];
      expect(shouldIgnore('node_modules/package', patterns)).toBe(true);
      expect(shouldIgnore('app.log', patterns)).toBe(true);
      expect(shouldIgnore('dist/bundle.js', patterns)).toBe(true);
    });

    it('returns false for non-matching paths', () => {
      const patterns = ['node_modules', '*.log'];
      expect(shouldIgnore('src/index.js', patterns)).toBe(false);
      expect(shouldIgnore('README.md', patterns)).toBe(false);
    });
  });

  describe('isBinaryFile', () => {
    it('identifies binary files by extension', () => {
      expect(isBinaryFile('image.png')).toBe(true);
      expect(isBinaryFile('photo.jpg')).toBe(true);
      expect(isBinaryFile('archive.zip')).toBe(true);
      expect(isBinaryFile('file.pdf')).toBe(true);
      expect(isBinaryFile('module.pyc')).toBe(true);
    });

    it('identifies text files', () => {
      expect(isBinaryFile('script.js')).toBe(false);
      expect(isBinaryFile('style.css')).toBe(false);
      expect(isBinaryFile('doc.md')).toBe(false);
      expect(isBinaryFile('config.json')).toBe(false);
    });

    it('is case insensitive', () => {
      expect(isBinaryFile('image.PNG')).toBe(true);
      expect(isBinaryFile('image.Png')).toBe(true);
    });
  });

  describe('matchesExtension', () => {
    it('matches extensions with dot', () => {
      expect(matchesExtension('file.js', ['.js'])).toBe(true);
      expect(matchesExtension('file.ts', ['.js', '.ts'])).toBe(true);
    });

    it('matches extensions without dot', () => {
      expect(matchesExtension('file.js', ['js'])).toBe(true);
      expect(matchesExtension('file.ts', ['js', 'ts'])).toBe(true);
    });

    it('returns true for empty extensions array', () => {
      expect(matchesExtension('file.js', [])).toBe(true);
      expect(matchesExtension('file.ts', null)).toBe(true);
    });

    it('returns false for non-matching', () => {
      expect(matchesExtension('file.js', ['.ts'])).toBe(false);
    });
  });

  describe('collectFromDirectory', () => {
    it('collects all files from directory', () => {
      fs.writeFileSync(path.join(testDir, 'file1.js'), 'code');
      fs.writeFileSync(path.join(testDir, 'file2.js'), 'code');

      const files = collectFromDirectory(testDir);
      expect(files).toHaveLength(2);
    });

    it('collects files recursively', () => {
      fs.mkdirSync(path.join(testDir, 'sub'));
      fs.writeFileSync(path.join(testDir, 'file1.js'), 'code');
      fs.writeFileSync(path.join(testDir, 'sub', 'file2.js'), 'code');

      const files = collectFromDirectory(testDir);
      expect(files).toHaveLength(2);
    });

    it('skips node_modules by default', () => {
      fs.mkdirSync(path.join(testDir, 'node_modules', 'pkg'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'file1.js'), 'code');
      fs.writeFileSync(path.join(testDir, 'node_modules', 'pkg', 'index.js'), 'code');

      const files = collectFromDirectory(testDir);
      expect(files).toHaveLength(1);
    });

    it('respects extension filter', () => {
      fs.writeFileSync(path.join(testDir, 'file.js'), 'code');
      fs.writeFileSync(path.join(testDir, 'file.ts'), 'code');
      fs.writeFileSync(path.join(testDir, 'file.css'), 'code');

      const files = collectFromDirectory(testDir, { extensions: ['.js', '.ts'] });
      expect(files).toHaveLength(2);
    });

    it('skips binary files', () => {
      fs.writeFileSync(path.join(testDir, 'file.js'), 'code');
      fs.writeFileSync(path.join(testDir, 'image.png'), 'binary');

      const files = collectFromDirectory(testDir);
      expect(files).toHaveLength(1);
    });

    it('skips hidden files by default', () => {
      fs.writeFileSync(path.join(testDir, 'file.js'), 'code');
      fs.writeFileSync(path.join(testDir, '.hidden.js'), 'code');

      const files = collectFromDirectory(testDir);
      expect(files).toHaveLength(1);
    });

    it('includes hidden files when option set', () => {
      fs.writeFileSync(path.join(testDir, 'file.js'), 'code');
      fs.writeFileSync(path.join(testDir, '.hidden.js'), 'code');

      const files = collectFromDirectory(testDir, { includeHidden: true });
      expect(files).toHaveLength(2);
    });

    it('respects maxDepth option', () => {
      fs.mkdirSync(path.join(testDir, 'a', 'b', 'c'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'root.js'), 'code');
      fs.writeFileSync(path.join(testDir, 'a', 'level1.js'), 'code');
      fs.writeFileSync(path.join(testDir, 'a', 'b', 'level2.js'), 'code');
      fs.writeFileSync(path.join(testDir, 'a', 'b', 'c', 'level3.js'), 'code');

      const files = collectFromDirectory(testDir, { maxDepth: 2 });
      expect(files).toHaveLength(3); // root, level1, level2
    });
  });

  describe('loadIgnorePatterns', () => {
    it('loads patterns from .tlcignore', () => {
      fs.writeFileSync(path.join(testDir, '.tlcignore'), 'custom_ignore\n*.tmp');

      const patterns = loadIgnorePatterns(testDir);
      expect(patterns).toContain('custom_ignore');
      expect(patterns).toContain('*.tmp');
    });

    it('falls back to .gitignore if no .tlcignore', () => {
      fs.writeFileSync(path.join(testDir, '.gitignore'), 'build\ncoverage');

      const patterns = loadIgnorePatterns(testDir);
      expect(patterns).toContain('build');
      expect(patterns).toContain('coverage');
    });

    it('prefers .tlcignore over .gitignore', () => {
      fs.writeFileSync(path.join(testDir, '.tlcignore'), 'tlc_pattern');
      fs.writeFileSync(path.join(testDir, '.gitignore'), 'git_pattern');

      const patterns = loadIgnorePatterns(testDir);
      expect(patterns).toContain('tlc_pattern');
      expect(patterns).not.toContain('git_pattern');
    });

    it('returns empty array if no ignore files', () => {
      const patterns = loadIgnorePatterns(testDir);
      expect(patterns).toEqual([]);
    });
  });

  describe('collectFiles', () => {
    it('collects single file', () => {
      const filePath = path.join(testDir, 'test.js');
      fs.writeFileSync(filePath, 'code');

      const result = collectFiles(filePath);
      expect(result.files).toHaveLength(1);
      expect(result.stats.total).toBe(1);
    });

    it('returns error for non-existent path', () => {
      const result = collectFiles('/nonexistent/path');
      expect(result.files).toHaveLength(0);
      expect(result.stats.error).toContain('not found');
    });

    it('skips binary files', () => {
      const filePath = path.join(testDir, 'image.png');
      fs.writeFileSync(filePath, 'binary');

      const result = collectFiles(filePath);
      expect(result.files).toHaveLength(0);
      expect(result.stats.skipped).toBe(1);
    });

    it('collects directory with patterns', () => {
      fs.writeFileSync(path.join(testDir, '.tlcignore'), 'ignored/');
      fs.mkdirSync(path.join(testDir, 'src'));
      fs.mkdirSync(path.join(testDir, 'ignored'));
      fs.writeFileSync(path.join(testDir, 'src', 'index.js'), 'code');
      fs.writeFileSync(path.join(testDir, 'ignored', 'skip.js'), 'code');

      const result = collectFiles(testDir);
      expect(result.files).toHaveLength(1);
    });
  });

  describe('readFileContent', () => {
    it('reads file content', () => {
      const filePath = path.join(testDir, 'test.js');
      fs.writeFileSync(filePath, 'const x = 1;');

      const { content, error } = readFileContent(filePath);
      expect(content).toBe('const x = 1;');
      expect(error).toBeNull();
    });

    it('returns error for non-existent file', () => {
      const { content, error } = readFileContent('/nonexistent');
      expect(content).toBeNull();
      expect(error).toBeTruthy();
    });
  });

  describe('DEFAULT_IGNORES', () => {
    it('includes common patterns', () => {
      expect(DEFAULT_IGNORES).toContain('node_modules');
      expect(DEFAULT_IGNORES).toContain('.git');
      expect(DEFAULT_IGNORES).toContain('dist');
      expect(DEFAULT_IGNORES).toContain('coverage');
    });
  });
});
