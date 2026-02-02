import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { vol, IFs } from 'memfs';

// Mock fs modules with memfs
vi.mock('fs', async () => {
  const memfs = await import('memfs');
  return memfs.fs;
});

vi.mock('fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

// Import after mocks are set up
import { getNotes, updateNotes } from './notes-api.js';

describe('notes-api', () => {
  const projectDir = '/test-project';
  const projectMdPath = `${projectDir}/PROJECT.md`;
  const mockContent = '# Project Name\n\nThis is a test project.';

  beforeEach(() => {
    vol.reset();
    // Set up project directory
    vol.mkdirSync(projectDir, { recursive: true });
    // Set the project directory for tests
    process.env.TLC_PROJECT_DIR = projectDir;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.TLC_PROJECT_DIR;
  });

  describe('getNotes', () => {
    it('returns content from PROJECT.md', async () => {
      vol.fromJSON({
        [projectMdPath]: mockContent,
      });

      const result = await getNotes();

      expect(result.content).toBe(mockContent);
    });

    it('returns empty content when file missing', async () => {
      // No PROJECT.md file created

      const result = await getNotes();

      expect(result.content).toBe('');
      expect(result.lastModified).toBeNull();
    });

    it('returns lastModified timestamp', async () => {
      vol.fromJSON({
        [projectMdPath]: mockContent,
      });

      const result = await getNotes();

      expect(result.lastModified).toBeDefined();
      expect(result.lastModified).not.toBeNull();
      // Should be an ISO timestamp
      expect(result.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('handles read errors gracefully', async () => {
      // Create a directory with the same name as PROJECT.md to cause read error
      vol.mkdirSync(projectMdPath, { recursive: true });

      const result = await getNotes();

      expect(result.content).toBe('');
      expect(result.lastModified).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('uses custom project directory from env', async () => {
      const customDir = '/custom/path';
      const customPath = `${customDir}/PROJECT.md`;
      vol.mkdirSync(customDir, { recursive: true });
      vol.fromJSON({
        [customPath]: '# Custom Project',
      });
      process.env.TLC_PROJECT_DIR = customDir;

      const result = await getNotes();

      expect(result.content).toBe('# Custom Project');
    });
  });

  describe('updateNotes', () => {
    it('saves content to PROJECT.md', async () => {
      const newContent = '# Updated Project\n\nNew content.';

      const result = await updateNotes(newContent);

      expect(result.success).toBe(true);
      const savedContent = vol.readFileSync(projectMdPath, 'utf-8');
      expect(savedContent).toBe(newContent);
    });

    it('creates file if missing', async () => {
      const newContent = '# New Project';
      // File doesn't exist yet

      const result = await updateNotes(newContent);

      expect(result.success).toBe(true);
      const savedContent = vol.readFileSync(projectMdPath, 'utf-8');
      expect(savedContent).toBe(newContent);
    });

    it('returns new lastModified', async () => {
      const newContent = '# Updated';

      const result = await updateNotes(newContent);

      expect(result.lastModified).toBeDefined();
      // Should be an ISO timestamp
      expect(result.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('handles write errors gracefully', async () => {
      // Try to write to a path that doesn't exist and can't be created
      process.env.TLC_PROJECT_DIR = '/nonexistent/deeply/nested/path';

      const result = await updateNotes('content');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('uses custom project directory from env', async () => {
      const customDir = '/custom/path';
      const customPath = `${customDir}/PROJECT.md`;
      vol.mkdirSync(customDir, { recursive: true });
      process.env.TLC_PROJECT_DIR = customDir;

      await updateNotes('# Custom content');

      const savedContent = vol.readFileSync(customPath, 'utf-8');
      expect(savedContent).toBe('# Custom content');
    });
  });
});
