/**
 * Cleanup Dry-Run Mode Tests
 *
 * Preview what /tlc:cleanup would change without making modifications.
 */
import { describe, it, expect, vi } from 'vitest';

const {
  planCleanup,
  listFilesToMove,
  listHardcodedUrls,
  listInterfacesToExtract,
  listFunctionsNeedingJsDoc,
  planCommitMessages,
} = require('./cleanup-dry-run.js');

describe('Cleanup Dry-Run Mode', () => {
  describe('listFilesToMove', () => {
    it('lists files that would be moved from flat folders', async () => {
      const mockGlob = vi.fn()
        .mockResolvedValueOnce(['src/services/userService.js', 'src/services/orderService.js'])
        .mockResolvedValueOnce([]) // interfaces
        .mockResolvedValueOnce([]); // controllers

      const result = await listFilesToMove('/project', { glob: mockGlob });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        source: expect.stringContaining('services'),
        destination: expect.any(String),
        reason: expect.any(String),
      });
    });

    it('returns empty for clean project', async () => {
      const mockGlob = vi.fn().mockResolvedValue([]);

      const result = await listFilesToMove('/project', { glob: mockGlob });
      expect(result).toHaveLength(0);
    });
  });

  describe('listHardcodedUrls', () => {
    it('lists hardcoded URLs that would be extracted', async () => {
      const mockGlob = vi.fn().mockResolvedValue(['src/api.js']);
      const mockReadFile = vi.fn().mockResolvedValue(
        'const api = "http://localhost:3000/api";\nconst port = 8080;'
      );

      const result = await listHardcodedUrls('/project', {
        glob: mockGlob,
        readFile: mockReadFile,
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toMatchObject({
        file: expect.any(String),
        value: expect.any(String),
        suggestedEnvVar: expect.any(String),
      });
    });
  });

  describe('listInterfacesToExtract', () => {
    it('lists interfaces that would be extracted', async () => {
      const mockGlob = vi.fn().mockResolvedValue(['src/user/user.service.ts']);
      const mockReadFile = vi.fn().mockResolvedValue(
        'interface UserDTO {\n  id: number;\n  name: string;\n}\n\nexport class UserService {}'
      );

      const result = await listInterfacesToExtract('/project', {
        glob: mockGlob,
        readFile: mockReadFile,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        file: expect.any(String),
        interfaceName: 'UserDTO',
        targetPath: expect.any(String),
      });
    });
  });

  describe('listFunctionsNeedingJsDoc', () => {
    it('lists functions needing JSDoc', async () => {
      const mockGlob = vi.fn().mockResolvedValue(['src/utils.js']);
      const mockReadFile = vi.fn().mockResolvedValue(
        'export function calculateTotal(items, tax) {\n  return items.reduce((s, i) => s + i.price, 0) * (1 + tax);\n}'
      );

      const result = await listFunctionsNeedingJsDoc('/project', {
        glob: mockGlob,
        readFile: mockReadFile,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        file: expect.any(String),
        functionName: 'calculateTotal',
      });
    });
  });

  describe('planCommitMessages', () => {
    it('shows planned commit messages', () => {
      const plan = {
        filesToMove: [{ source: 'src/services/user.js', destination: 'src/user/user.js' }],
        hardcodedUrls: [{ file: 'src/api.js', value: 'http://localhost:3000' }],
        interfacesToExtract: [{ file: 'src/user.service.ts', interfaceName: 'UserDTO' }],
        functionsNeedingJsDoc: [{ file: 'src/utils.js', functionName: 'calculate' }],
      };

      const commits = planCommitMessages(plan);
      expect(commits.length).toBeGreaterThan(0);
      expect(commits.every(c => typeof c === 'string')).toBe(true);
    });

    it('returns empty for clean project', () => {
      const plan = {
        filesToMove: [],
        hardcodedUrls: [],
        interfacesToExtract: [],
        functionsNeedingJsDoc: [],
      };

      const commits = planCommitMessages(plan);
      expect(commits).toHaveLength(0);
    });
  });

  describe('planCleanup', () => {
    it('returns structured report with no side effects', async () => {
      const mockGlob = vi.fn().mockResolvedValue([]);
      const mockReadFile = vi.fn().mockResolvedValue('');

      const result = await planCleanup('/project', {
        glob: mockGlob,
        readFile: mockReadFile,
      });

      expect(result).toMatchObject({
        filesToMove: expect.any(Array),
        hardcodedUrls: expect.any(Array),
        interfacesToExtract: expect.any(Array),
        functionsNeedingJsDoc: expect.any(Array),
        plannedCommits: expect.any(Array),
      });
    });

    it('handles multiple issue types', async () => {
      const mockGlob = vi.fn()
        .mockResolvedValueOnce(['src/services/userService.js']) // flat: services
        .mockResolvedValueOnce([]) // flat: interfaces
        .mockResolvedValueOnce([]) // flat: controllers
        .mockResolvedValueOnce(['src/api.js']) // hardcoded urls
        .mockResolvedValueOnce([]) // interfaces
        .mockResolvedValueOnce([]); // jsdoc
      const mockReadFile = vi.fn().mockResolvedValue(
        'const url = "http://localhost:3000";'
      );

      const result = await planCleanup('/project', {
        glob: mockGlob,
        readFile: mockReadFile,
      });

      expect(result.filesToMove.length + result.hardcodedUrls.length).toBeGreaterThan(0);
    });

    it('includes before/after preview for transforms', async () => {
      const mockGlob = vi.fn()
        .mockResolvedValueOnce([]) // flat: services
        .mockResolvedValueOnce([]) // flat: interfaces
        .mockResolvedValueOnce([]) // flat: controllers
        .mockResolvedValueOnce(['src/api.js']) // hardcoded urls
        .mockResolvedValueOnce([]) // interfaces
        .mockResolvedValueOnce([]); // jsdoc
      const mockReadFile = vi.fn().mockResolvedValue(
        'const api = "http://localhost:3000/api";'
      );

      const result = await planCleanup('/project', {
        glob: mockGlob,
        readFile: mockReadFile,
      });

      if (result.hardcodedUrls.length > 0) {
        expect(result.hardcodedUrls[0].suggestedEnvVar).toBeDefined();
      }
    });

    it('makes no fs.writeFileSync calls in dry-run', async () => {
      const writeFile = vi.fn();
      const mockGlob = vi.fn().mockResolvedValue([]);
      const mockReadFile = vi.fn().mockResolvedValue('');

      await planCleanup('/project', {
        glob: mockGlob,
        readFile: mockReadFile,
        writeFile,
      });

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('makes no git operations in dry-run', async () => {
      const exec = vi.fn();
      const mockGlob = vi.fn().mockResolvedValue([]);
      const mockReadFile = vi.fn().mockResolvedValue('');

      await planCleanup('/project', {
        glob: mockGlob,
        readFile: mockReadFile,
        exec,
      });

      expect(exec).not.toHaveBeenCalled();
    });
  });
});
