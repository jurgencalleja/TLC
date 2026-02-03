/**
 * Audit Checker Tests
 */
import { describe, it, expect, vi } from 'vitest';
import {
  auditProject,
  checkStandardsFiles,
  checkFlatFolders,
  checkInlineInterfaces,
  checkHardcodedUrls,
  checkMagicStrings,
  checkSeedOrganization,
  checkJsDocCoverage,
  checkImportStyle,
  generateReport
} from './audit-checker.js';

describe('audit-checker', () => {
  describe('checkStandardsFiles', () => {
    it('passes when both files exist', async () => {
      const mockFs = {
        access: vi.fn().mockResolvedValue(undefined)
      };

      const result = await checkStandardsFiles('/test', { fs: mockFs });

      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('fails when CLAUDE.md missing', async () => {
      const mockFs = {
        access: vi.fn().mockImplementation((path) => {
          if (path.includes('CLAUDE.md')) {
            return Promise.reject(new Error('ENOENT'));
          }
          return Promise.resolve(undefined);
        })
      };

      const result = await checkStandardsFiles('/test', { fs: mockFs });

      expect(result.passed).toBe(false);
      expect(result.issues).toContainEqual(expect.objectContaining({
        file: 'CLAUDE.md',
        type: 'missing'
      }));
    });

    it('fails when CODING-STANDARDS.md missing', async () => {
      const mockFs = {
        access: vi.fn().mockImplementation((path) => {
          if (path.includes('CODING-STANDARDS.md')) {
            return Promise.reject(new Error('ENOENT'));
          }
          return Promise.resolve(undefined);
        })
      };

      const result = await checkStandardsFiles('/test', { fs: mockFs });

      expect(result.passed).toBe(false);
      expect(result.issues).toContainEqual(expect.objectContaining({
        file: 'CODING-STANDARDS.md',
        type: 'missing'
      }));
    });
  });

  describe('checkFlatFolders', () => {
    it('passes on clean project', async () => {
      const mockGlob = vi.fn().mockResolvedValue([]);

      const result = await checkFlatFolders('/test', { glob: mockGlob });

      expect(result.passed).toBe(true);
    });

    it('fails on flat services/ folder', async () => {
      const mockGlob = vi.fn().mockResolvedValue(['src/services/userService.js']);

      const result = await checkFlatFolders('/test', { glob: mockGlob });

      expect(result.passed).toBe(false);
      expect(result.issues).toContainEqual(expect.objectContaining({
        type: 'flat-folder',
        folder: 'services'
      }));
    });

    it('fails on flat interfaces/ folder', async () => {
      const mockGlob = vi.fn().mockResolvedValue(['src/interfaces/IUser.ts']);

      const result = await checkFlatFolders('/test', { glob: mockGlob });

      expect(result.passed).toBe(false);
      expect(result.issues).toContainEqual(expect.objectContaining({
        type: 'flat-folder',
        folder: 'interfaces'
      }));
    });

    it('fails on flat controllers/ folder', async () => {
      const mockGlob = vi.fn().mockResolvedValue(['src/controllers/userController.js']);

      const result = await checkFlatFolders('/test', { glob: mockGlob });

      expect(result.passed).toBe(false);
      expect(result.issues).toContainEqual(expect.objectContaining({
        type: 'flat-folder',
        folder: 'controllers'
      }));
    });
  });

  describe('checkInlineInterfaces', () => {
    it('passes on clean code', async () => {
      const mockReadFile = vi.fn().mockResolvedValue(`
        import { User } from './types/user';
        export class UserService {
          getUser(id: string): User { }
        }
      `);
      const mockGlob = vi.fn().mockResolvedValue(['src/user/user.service.ts']);

      const result = await checkInlineInterfaces('/test', {
        glob: mockGlob,
        readFile: mockReadFile
      });

      expect(result.passed).toBe(true);
    });

    it('fails on inline interface in service', async () => {
      const mockReadFile = vi.fn().mockResolvedValue(`
        interface UserData {
          id: string;
          name: string;
        }
        export class UserService {
          getUser(id: string): UserData { }
        }
      `);
      const mockGlob = vi.fn().mockResolvedValue(['src/services/user.service.ts']);

      const result = await checkInlineInterfaces('/test', {
        glob: mockGlob,
        readFile: mockReadFile
      });

      expect(result.passed).toBe(false);
      expect(result.issues).toContainEqual(expect.objectContaining({
        type: 'inline-interface',
        file: expect.stringContaining('user.service.ts')
      }));
    });
  });

  describe('checkHardcodedUrls', () => {
    it('passes on clean code', async () => {
      const mockReadFile = vi.fn().mockResolvedValue(`
        const apiUrl = process.env.API_URL;
        fetch(apiUrl + '/users');
      `);
      const mockGlob = vi.fn().mockResolvedValue(['src/api.js']);

      const result = await checkHardcodedUrls('/test', {
        glob: mockGlob,
        readFile: mockReadFile
      });

      expect(result.passed).toBe(true);
    });

    it('fails on hardcoded URL', async () => {
      const mockReadFile = vi.fn().mockResolvedValue(`
        fetch('http://localhost:3000/api/users');
      `);
      const mockGlob = vi.fn().mockResolvedValue(['src/api.js']);

      const result = await checkHardcodedUrls('/test', {
        glob: mockGlob,
        readFile: mockReadFile
      });

      expect(result.passed).toBe(false);
      expect(result.issues).toContainEqual(expect.objectContaining({
        type: 'hardcoded-url'
      }));
    });

    it('fails on hardcoded port', async () => {
      const mockReadFile = vi.fn().mockResolvedValue(`
        const port = 3000;
        app.listen(port);
      `);
      const mockGlob = vi.fn().mockResolvedValue(['src/server.js']);

      const result = await checkHardcodedUrls('/test', {
        glob: mockGlob,
        readFile: mockReadFile
      });

      expect(result.passed).toBe(false);
      expect(result.issues).toContainEqual(expect.objectContaining({
        type: 'hardcoded-port'
      }));
    });
  });

  describe('checkMagicStrings', () => {
    it('passes on clean code', async () => {
      const mockReadFile = vi.fn().mockResolvedValue(`
        import { STATUS_ACTIVE } from './constants';
        if (user.status === STATUS_ACTIVE) { }
      `);
      const mockGlob = vi.fn().mockResolvedValue(['src/user.js']);

      const result = await checkMagicStrings('/test', {
        glob: mockGlob,
        readFile: mockReadFile
      });

      expect(result.passed).toBe(true);
    });

    it('fails on magic string', async () => {
      const mockReadFile = vi.fn().mockResolvedValue(`
        if (user.status === 'active') {
          if (user.role === 'admin') { }
        }
      `);
      const mockGlob = vi.fn().mockResolvedValue(['src/user.js']);

      const result = await checkMagicStrings('/test', {
        glob: mockGlob,
        readFile: mockReadFile
      });

      expect(result.passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe('magic-string');
    });
  });

  describe('checkSeedOrganization', () => {
    it('passes when seeds are per-entity', async () => {
      const mockGlob = vi.fn().mockResolvedValue([
        'src/user/seeds/user.seed.ts',
        'src/product/seeds/product.seed.ts'
      ]);

      const result = await checkSeedOrganization('/test', { glob: mockGlob });

      expect(result.passed).toBe(true);
    });

    it('fails on flat seeds/ folder', async () => {
      const mockGlob = vi.fn().mockResolvedValue([
        'src/seeds/userSeed.ts',
        'src/seeds/productSeed.ts'
      ]);

      const result = await checkSeedOrganization('/test', { glob: mockGlob });

      expect(result.passed).toBe(false);
      expect(result.issues).toContainEqual(expect.objectContaining({
        type: 'flat-seeds'
      }));
    });
  });

  describe('checkJsDocCoverage', () => {
    it('passes when functions have JSDoc', async () => {
      const mockReadFile = vi.fn().mockResolvedValue(`
        /**
         * Gets a user by ID
         * @param id - The user ID
         * @returns The user object
         */
        export function getUser(id: string): User {
          return users.find(u => u.id === id);
        }
      `);
      const mockGlob = vi.fn().mockResolvedValue(['src/user.ts']);

      const result = await checkJsDocCoverage('/test', {
        glob: mockGlob,
        readFile: mockReadFile
      });

      expect(result.passed).toBe(true);
    });

    it('fails when exported function lacks JSDoc', async () => {
      const mockReadFile = vi.fn().mockResolvedValue(`
        export function getUser(id: string): User {
          return users.find(u => u.id === id);
        }
      `);
      const mockGlob = vi.fn().mockResolvedValue(['src/user.ts']);

      const result = await checkJsDocCoverage('/test', {
        glob: mockGlob,
        readFile: mockReadFile
      });

      expect(result.passed).toBe(false);
      expect(result.issues).toContainEqual(expect.objectContaining({
        type: 'missing-jsdoc'
      }));
    });
  });

  describe('checkImportStyle', () => {
    it('passes on correct import style', async () => {
      const mockReadFile = vi.fn().mockResolvedValue(`
        import { User } from '@/user/types';
        import { config } from '@/config';
      `);
      const mockGlob = vi.fn().mockResolvedValue(['src/service.ts']);

      const result = await checkImportStyle('/test', {
        glob: mockGlob,
        readFile: mockReadFile
      });

      expect(result.passed).toBe(true);
    });

    it('warns on deep relative imports', async () => {
      const mockReadFile = vi.fn().mockResolvedValue(`
        import { User } from '../../../user/types';
      `);
      const mockGlob = vi.fn().mockResolvedValue(['src/deep/nested/service.ts']);

      const result = await checkImportStyle('/test', {
        glob: mockGlob,
        readFile: mockReadFile
      });

      expect(result.passed).toBe(false);
      expect(result.issues).toContainEqual(expect.objectContaining({
        type: 'deep-import'
      }));
    });
  });

  describe('auditProject', () => {
    it('runs all checks', async () => {
      const mockOptions = {
        fs: {
          access: vi.fn().mockResolvedValue(undefined)
        },
        glob: vi.fn().mockResolvedValue([]),
        readFile: vi.fn().mockResolvedValue('')
      };

      const result = await auditProject('/test', mockOptions);

      expect(result).toHaveProperty('standardsFiles');
      expect(result).toHaveProperty('flatFolders');
      expect(result).toHaveProperty('inlineInterfaces');
      expect(result).toHaveProperty('hardcodedUrls');
      expect(result).toHaveProperty('magicStrings');
      expect(result).toHaveProperty('seedOrganization');
      expect(result).toHaveProperty('jsDocCoverage');
      expect(result).toHaveProperty('importStyle');
      expect(result).toHaveProperty('summary');
    });

    it('reports all issues found', async () => {
      const mockOptions = {
        fs: {
          access: vi.fn().mockRejectedValue(new Error('ENOENT'))
        },
        glob: vi.fn().mockResolvedValue(['src/services/user.js']),
        readFile: vi.fn().mockResolvedValue('fetch("http://localhost:3000")')
      };

      const result = await auditProject('/test', mockOptions);

      expect(result.summary.totalIssues).toBeGreaterThan(0);
      expect(result.summary.passed).toBe(false);
    });
  });

  describe('generateReport', () => {
    it('creates AUDIT-REPORT.md', () => {
      const auditResults = {
        standardsFiles: { passed: true, issues: [] },
        flatFolders: { passed: false, issues: [{ type: 'flat-folder', folder: 'services' }] },
        summary: { totalIssues: 1, passed: false }
      };

      const report = generateReport(auditResults);

      expect(report).toContain('# Audit Report');
      expect(report).toContain('flat-folder');
      expect(report).toContain('services');
    });

    it('shows pass status', () => {
      const auditResults = {
        standardsFiles: { passed: true, issues: [] },
        flatFolders: { passed: true, issues: [] },
        summary: { totalIssues: 0, passed: true }
      };

      const report = generateReport(auditResults);

      expect(report).toContain('PASSED');
    });
  });
});
