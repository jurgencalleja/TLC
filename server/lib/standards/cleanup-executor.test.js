/**
 * Cleanup Executor Tests
 */
import { describe, it, expect, vi } from 'vitest';
import {
  runCleanup,
  extractHardcodedConfig,
  migrateFlatFolder,
  extractInlineInterface,
  replaceMagicStrings,
  addMissingJsDoc,
  commitChanges
} from './cleanup-executor.js';

describe('cleanup-executor', () => {
  describe('extractHardcodedConfig', () => {
    it('extracts hardcoded URL to config', async () => {
      const code = `fetch('http://localhost:3000/api/users');`;

      const result = await extractHardcodedConfig(code, {
        type: 'url',
        value: 'http://localhost:3000'
      });

      expect(result.code).toContain('process.env');
      expect(result.code).not.toContain('http://localhost:3000');
      expect(result.envVar).toBeDefined();
    });

    it('extracts hardcoded port to config', async () => {
      const code = `const port = 3000;\napp.listen(port);`;

      const result = await extractHardcodedConfig(code, {
        type: 'port',
        value: '3000'
      });

      expect(result.code).toContain('process.env.PORT');
      expect(result.envVar).toBe('PORT');
    });

    it('adds default value fallback', async () => {
      const code = `const apiUrl = 'http://api.example.com';`;

      const result = await extractHardcodedConfig(code, {
        type: 'url',
        value: 'http://api.example.com'
      });

      expect(result.code).toMatch(/process\.env\.\w+\s*\|\|\s*['"]http:\/\/api\.example\.com['"]/);
    });
  });

  describe('migrateFlatFolder', () => {
    it('moves service from services/ to entity/', async () => {
      const mockFs = {
        readFile: vi.fn().mockResolvedValue('export class UserService {}'),
        writeFile: vi.fn().mockResolvedValue(undefined),
        mkdir: vi.fn().mockResolvedValue(undefined),
        unlink: vi.fn().mockResolvedValue(undefined),
        rename: vi.fn().mockResolvedValue(undefined)
      };

      const result = await migrateFlatFolder({
        sourcePath: 'src/services/user.service.ts',
        entity: 'user',
        projectPath: '/test'
      }, { fs: mockFs });

      expect(result.newPath).toContain('src/user/');
      expect(mockFs.mkdir).toHaveBeenCalled();
    });

    it('updates imports in affected files', async () => {
      const files = new Map([
        ['src/services/user.service.ts', 'export class UserService {}'],
        ['src/app.ts', "import { UserService } from './services/user.service';"]
      ]);

      const mockFs = {
        readFile: vi.fn().mockImplementation(p => Promise.resolve(files.get(p) || '')),
        writeFile: vi.fn().mockResolvedValue(undefined),
        mkdir: vi.fn().mockResolvedValue(undefined),
        rename: vi.fn().mockResolvedValue(undefined)
      };
      const mockGlob = vi.fn().mockResolvedValue(['src/app.ts']);

      const result = await migrateFlatFolder({
        sourcePath: 'src/services/user.service.ts',
        entity: 'user',
        projectPath: '/test'
      }, { fs: mockFs, glob: mockGlob });

      expect(result.updatedImports).toBeGreaterThan(0);
    });
  });

  describe('extractInlineInterface', () => {
    it('extracts inline interface to types/ file', async () => {
      const code = `
        interface UserData {
          id: string;
          name: string;
        }
        export class UserService {
          getUser(): UserData { }
        }
      `;

      const result = await extractInlineInterface(code, {
        interfaceName: 'UserData',
        entity: 'user'
      });

      expect(result.serviceCode).not.toContain('interface UserData');
      expect(result.serviceCode).toContain("import { UserData }");
      expect(result.typesCode).toContain('export interface UserData');
      expect(result.typesPath).toContain('types/');
    });

    it('handles multiple interfaces', async () => {
      const code = `
        interface User { id: string; }
        interface UserInput { name: string; }
        export class UserService { }
      `;

      const result = await extractInlineInterface(code, {
        interfaceName: 'User',
        entity: 'user'
      });

      expect(result.serviceCode).not.toContain('interface User {');
      // Should only extract the specified interface
      expect(result.serviceCode).toContain('interface UserInput');
    });
  });

  describe('replaceMagicStrings', () => {
    it('replaces magic string with constant', async () => {
      const code = `if (user.status === 'active') { }`;

      const result = await replaceMagicStrings(code, {
        strings: [{ value: 'active', suggestedName: 'STATUS_ACTIVE' }]
      });

      expect(result.code).toContain('STATUS_ACTIVE');
      expect(result.code).not.toContain("'active'");
      expect(result.constants).toContainEqual(expect.objectContaining({
        name: 'STATUS_ACTIVE',
        value: 'active'
      }));
    });

    it('creates constants file', async () => {
      const code = `
        if (status === 'pending') { }
        if (role === 'admin') { }
      `;

      const result = await replaceMagicStrings(code, {
        strings: [
          { value: 'pending', suggestedName: 'STATUS_PENDING' },
          { value: 'admin', suggestedName: 'ROLE_ADMIN' }
        ],
        entity: 'user'
      });

      expect(result.constantsFile).toContain('STATUS_PENDING');
      expect(result.constantsFile).toContain('ROLE_ADMIN');
      expect(result.constantsPath).toContain('constants/');
    });
  });

  describe('addMissingJsDoc', () => {
    it('adds JSDoc to public function', async () => {
      const code = `
        export function getUser(id: string): User {
          return users.find(u => u.id === id);
        }
      `;

      const result = await addMissingJsDoc(code);

      expect(result.code).toContain('/**');
      expect(result.code).toContain('@param');
      expect(result.code).toContain('@returns');
    });

    it('adds JSDoc to class methods', async () => {
      const code = `
        export class UserService {
          public getUser(id: string): User {
            return this.users.find(u => u.id === id);
          }
        }
      `;

      const result = await addMissingJsDoc(code);

      expect(result.code).toContain('/**');
      expect(result.code).toMatch(/@param\s+\{?\w*\}?\s*id/);
    });

    it('preserves existing JSDoc', async () => {
      const code = `
        /**
         * Custom documentation
         */
        export function customFn() { }
      `;

      const result = await addMissingJsDoc(code);

      expect(result.code).toContain('Custom documentation');
      // Should not duplicate JSDoc
      expect(result.code.match(/\/\*\*/g)?.length).toBe(1);
    });
  });

  describe('commitChanges', () => {
    it('creates appropriate commits', async () => {
      const mockExec = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });

      await commitChanges({
        type: 'migrate',
        entity: 'user',
        description: 'Migrate user service to entity folder'
      }, { exec: mockExec });

      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('git add'));
      expect(mockExec).toHaveBeenCalledWith(expect.stringContaining('git commit'));
    });

    it('uses conventional commit format', async () => {
      const mockExec = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });

      await commitChanges({
        type: 'refactor',
        entity: 'user',
        description: 'Extract constants'
      }, { exec: mockExec });

      const commitCall = mockExec.mock.calls.find(c => c[0].includes('git commit'));
      expect(commitCall[0]).toMatch(/refactor\(user\):/);
    });
  });

  describe('runCleanup', () => {
    it('ensures standards files exist', async () => {
      const mockInject = vi.fn().mockResolvedValue({ claudeMd: 'created', codingStandards: 'created' });
      const mockAudit = vi.fn().mockResolvedValue({ summary: { totalIssues: 0, passed: true } });

      const result = await runCleanup('/test', {
        injectStandards: mockInject,
        auditProject: mockAudit
      });

      expect(mockInject).toHaveBeenCalled();
    });

    it('runs full audit first', async () => {
      const mockInject = vi.fn().mockResolvedValue({});
      const mockAudit = vi.fn().mockResolvedValue({
        summary: { totalIssues: 0, passed: true },
        flatFolders: { issues: [] }
      });

      const result = await runCleanup('/test', {
        injectStandards: mockInject,
        auditProject: mockAudit
      });

      expect(mockAudit).toHaveBeenCalled();
    });

    it('reports results when done', async () => {
      const mockInject = vi.fn().mockResolvedValue({});
      const mockAudit = vi.fn().mockResolvedValue({
        summary: { totalIssues: 0, passed: true }
      });

      const result = await runCleanup('/test', {
        injectStandards: mockInject,
        auditProject: mockAudit
      });

      expect(result).toHaveProperty('standardsInjected');
      expect(result).toHaveProperty('issuesFixed');
      expect(result).toHaveProperty('commits');
    });
  });
});
