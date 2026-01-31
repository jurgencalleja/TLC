import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { injectMemoryContext, extractMemorySection, MEMORY_SECTION_MARKERS } from './claude-injector.js';

describe('claude-injector', () => {
  let testDir;
  let claudeMdPath;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tlc-injector-test-'));
    claudeMdPath = path.join(testDir, 'CLAUDE.md');
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('injectMemoryContext', () => {
    it('creates CLAUDE.md if missing', async () => {
      await injectMemoryContext(testDir, '## Active Memory\n\nTest content');

      expect(fs.existsSync(claudeMdPath)).toBe(true);
      const content = fs.readFileSync(claudeMdPath, 'utf-8');
      expect(content).toContain('Active Memory');
    });

    it('appends memory section to existing CLAUDE.md', async () => {
      fs.writeFileSync(claudeMdPath, '# Project\n\nExisting content\n');

      await injectMemoryContext(testDir, '## Preferences\n\n- style: functional');

      const content = fs.readFileSync(claudeMdPath, 'utf-8');
      expect(content).toContain('Existing content');
      expect(content).toContain('Preferences');
      expect(content).toContain('functional');
    });

    it('replaces existing memory section without duplication', async () => {
      const initial = `# Project

${MEMORY_SECTION_MARKERS.START}
## Old Memory

Old content
${MEMORY_SECTION_MARKERS.END}

## Other Section
`;
      fs.writeFileSync(claudeMdPath, initial);

      await injectMemoryContext(testDir, '## New Memory\n\nNew content');

      const content = fs.readFileSync(claudeMdPath, 'utf-8');
      expect(content).toContain('New Memory');
      expect(content).toContain('New content');
      expect(content).not.toContain('Old Memory');
      expect(content).not.toContain('Old content');
      expect(content).toContain('Other Section');
    });

    it('preserves content before and after memory section', async () => {
      const initial = `# Project Title

Introduction paragraph.

${MEMORY_SECTION_MARKERS.START}
## Memory
Content
${MEMORY_SECTION_MARKERS.END}

## Commands

- /help
`;
      fs.writeFileSync(claudeMdPath, initial);

      await injectMemoryContext(testDir, '## Updated Memory\n\nUpdated');

      const content = fs.readFileSync(claudeMdPath, 'utf-8');
      expect(content).toContain('Project Title');
      expect(content).toContain('Introduction paragraph');
      expect(content).toContain('Commands');
      expect(content).toContain('/help');
      expect(content).toContain('Updated Memory');
    });

    it('handles empty memory context gracefully', async () => {
      fs.writeFileSync(claudeMdPath, '# Project\n\nContent\n');

      await injectMemoryContext(testDir, '');

      const content = fs.readFileSync(claudeMdPath, 'utf-8');
      expect(content).toContain('Project');
      // Should still have markers even if empty
      expect(content).toContain(MEMORY_SECTION_MARKERS.START);
    });

    it('adds markers around injected content', async () => {
      await injectMemoryContext(testDir, '## Memory\n\nContent');

      const content = fs.readFileSync(claudeMdPath, 'utf-8');
      expect(content).toContain(MEMORY_SECTION_MARKERS.START);
      expect(content).toContain(MEMORY_SECTION_MARKERS.END);
    });

    it('handles CLAUDE.md with only whitespace', async () => {
      fs.writeFileSync(claudeMdPath, '   \n\n  \n');

      await injectMemoryContext(testDir, '## Memory\n\nContent');

      const content = fs.readFileSync(claudeMdPath, 'utf-8');
      expect(content).toContain('Memory');
    });
  });

  describe('extractMemorySection', () => {
    it('extracts content between markers', () => {
      const content = `Before
${MEMORY_SECTION_MARKERS.START}
## Memory
Content here
${MEMORY_SECTION_MARKERS.END}
After`;

      const extracted = extractMemorySection(content);

      expect(extracted).toContain('Memory');
      expect(extracted).toContain('Content here');
      expect(extracted).not.toContain('Before');
      expect(extracted).not.toContain('After');
    });

    it('returns null if no memory section', () => {
      const content = '# Just a normal file\n\nNo memory here';

      const extracted = extractMemorySection(content);

      expect(extracted).toBeNull();
    });

    it('returns null for malformed markers', () => {
      const content = `${MEMORY_SECTION_MARKERS.START}
No end marker`;

      const extracted = extractMemorySection(content);

      expect(extracted).toBeNull();
    });

    it('handles empty section between markers', () => {
      const content = `${MEMORY_SECTION_MARKERS.START}
${MEMORY_SECTION_MARKERS.END}`;

      const extracted = extractMemorySection(content);

      expect(extracted).toBe('');
    });
  });
});
