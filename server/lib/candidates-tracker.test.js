/**
 * Candidates Tracker Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('CandidatesTracker', () => {
  describe('file creation', () => {
    it('creates file if not exists', async () => {
      const { CandidatesTracker } = await import('./candidates-tracker.js');

      const writeFileMock = vi.fn().mockResolvedValue();
      const readFileMock = vi.fn().mockRejectedValue(new Error('ENOENT'));
      const mkdirMock = vi.fn().mockResolvedValue();

      const tracker = new CandidatesTracker({
        readFile: readFileMock,
        writeFile: writeFileMock,
        mkdir: mkdirMock,
      });

      await tracker.add([
        { file: 'test.js', startLine: 10, description: 'Test issue', impact: 85 },
      ]);

      expect(writeFileMock).toHaveBeenCalled();
      expect(mkdirMock).toHaveBeenCalled();
    });
  });

  describe('priority sections', () => {
    it('appends new candidates to correct priority section', async () => {
      const { CandidatesTracker } = await import('./candidates-tracker.js');

      let savedContent = '';
      const writeFileMock = vi.fn().mockImplementation((path, content) => {
        savedContent = content;
        return Promise.resolve();
      });
      const readFileMock = vi.fn().mockRejectedValue(new Error('ENOENT'));
      const mkdirMock = vi.fn().mockResolvedValue();

      const tracker = new CandidatesTracker({
        readFile: readFileMock,
        writeFile: writeFileMock,
        mkdir: mkdirMock,
      });

      await tracker.add([
        { file: 'high.js', startLine: 1, description: 'High priority', impact: 90 },
        { file: 'medium.js', startLine: 1, description: 'Medium priority', impact: 65 },
        { file: 'low.js', startLine: 1, description: 'Low priority', impact: 30 },
      ]);

      expect(savedContent).toContain('High Priority');
      expect(savedContent).toContain('high.js:1');
      expect(savedContent).toContain('Medium Priority');
      expect(savedContent).toContain('medium.js:1');
      expect(savedContent).toContain('Low Priority');
      expect(savedContent).toContain('low.js:1');
    });

    it('correctly categorizes by impact score', async () => {
      const { CandidatesTracker } = await import('./candidates-tracker.js');
      const tracker = new CandidatesTracker({});

      expect(tracker.getTier(90)).toBe('high');
      expect(tracker.getTier(80)).toBe('high');
      expect(tracker.getTier(79)).toBe('medium');
      expect(tracker.getTier(50)).toBe('medium');
      expect(tracker.getTier(49)).toBe('low');
    });
  });

  describe('deduplication', () => {
    it('deduplicates by file:line key', async () => {
      const { CandidatesTracker } = await import('./candidates-tracker.js');

      const existingContent = `# Refactor Candidates

## High Priority (Impact 80+)

- [ ] test.js:10 - Existing issue (Impact: 85)

## Medium Priority (Impact 50-79)

_None_

## Low Priority (Impact <50)

_None_
`;

      let savedContent = '';
      const writeFileMock = vi.fn().mockImplementation((path, content) => {
        savedContent = content;
        return Promise.resolve();
      });
      const readFileMock = vi.fn().mockResolvedValue(existingContent);
      const mkdirMock = vi.fn().mockResolvedValue();

      const tracker = new CandidatesTracker({
        readFile: readFileMock,
        writeFile: writeFileMock,
        mkdir: mkdirMock,
      });

      await tracker.add([
        { file: 'test.js', startLine: 10, description: 'Updated issue', impact: 90 },
      ]);

      // Should only have one entry for test.js:10
      const matches = savedContent.match(/test\.js:10/g);
      expect(matches).toHaveLength(1);
      expect(savedContent).toContain('Updated issue');
      expect(savedContent).toContain('Impact: 90');
    });
  });

  describe('impact score updates', () => {
    it('updates impact scores on re-analysis', async () => {
      const { CandidatesTracker } = await import('./candidates-tracker.js');

      const existingContent = `# Refactor Candidates

## High Priority (Impact 80+)

- [ ] test.js:10 - Old description (Impact: 85)

## Medium Priority (Impact 50-79)

_None_

## Low Priority (Impact <50)

_None_
`;

      let savedContent = '';
      const tracker = new CandidatesTracker({
        readFile: vi.fn().mockResolvedValue(existingContent),
        writeFile: vi.fn().mockImplementation((p, c) => { savedContent = c; return Promise.resolve(); }),
        mkdir: vi.fn().mockResolvedValue(),
      });

      await tracker.add([
        { file: 'test.js', startLine: 10, description: 'New description', impact: 95 },
      ]);

      expect(savedContent).toContain('Impact: 95');
      expect(savedContent).toContain('New description');
    });
  });

  describe('completion marking', () => {
    it('marks candidate as complete after refactoring', async () => {
      const { CandidatesTracker } = await import('./candidates-tracker.js');

      const existingContent = `# Refactor Candidates

## High Priority (Impact 80+)

- [ ] test.js:10 - Test issue (Impact: 85)

## Medium Priority (Impact 50-79)

_None_

## Low Priority (Impact <50)

_None_
`;

      let savedContent = '';
      const tracker = new CandidatesTracker({
        readFile: vi.fn().mockResolvedValue(existingContent),
        writeFile: vi.fn().mockImplementation((p, c) => { savedContent = c; return Promise.resolve(); }),
        mkdir: vi.fn().mockResolvedValue(),
      });

      await tracker.markComplete('test.js', 10);

      expect(savedContent).toContain('[x] test.js:10');
    });
  });

  describe('notes preservation', () => {
    it('preserves manual notes in file', async () => {
      const { CandidatesTracker } = await import('./candidates-tracker.js');

      const existingContent = `# Refactor Candidates

## High Priority (Impact 80+)

- [ ] test.js:10 - Test issue (Impact: 85)

## Medium Priority (Impact 50-79)

_None_

## Low Priority (Impact <50)

_None_

## Notes

This is a manual note that should be preserved.
Another line of notes.
`;

      let savedContent = '';
      const tracker = new CandidatesTracker({
        readFile: vi.fn().mockResolvedValue(existingContent),
        writeFile: vi.fn().mockImplementation((p, c) => { savedContent = c; return Promise.resolve(); }),
        mkdir: vi.fn().mockResolvedValue(),
      });

      await tracker.add([
        { file: 'new.js', startLine: 5, description: 'New issue', impact: 70 },
      ]);

      expect(savedContent).toContain('## Notes');
      expect(savedContent).toContain('manual note that should be preserved');
    });
  });

  describe('parsing', () => {
    it('parses existing candidates correctly', async () => {
      const { CandidatesTracker } = await import('./candidates-tracker.js');

      const content = `# Refactor Candidates

## High Priority (Impact 80+)

- [ ] src/api.js:10-25 - Extract validation (Impact: 85)
- [x] src/utils.js:5 - Rename variable (Impact: 82)

## Medium Priority (Impact 50-79)

- [ ] src/helpers.js:30 - Simplify logic (Impact: 65)

## Low Priority (Impact <50)

_None_
`;

      const tracker = new CandidatesTracker({
        readFile: vi.fn().mockResolvedValue(content),
        writeFile: vi.fn().mockResolvedValue(),
        mkdir: vi.fn().mockResolvedValue(),
      });

      const data = await tracker.load();

      expect(data.high).toHaveLength(2);
      expect(data.high[0].file).toBe('src/api.js');
      expect(data.high[0].startLine).toBe(10);
      expect(data.high[0].endLine).toBe(25);
      expect(data.high[0].completed).toBe(false);
      expect(data.high[1].completed).toBe(true);
      expect(data.medium).toHaveLength(1);
      expect(data.low).toHaveLength(0);
    });
  });

  describe('formatting', () => {
    it('formats line ranges correctly', async () => {
      const { CandidatesTracker } = await import('./candidates-tracker.js');
      const tracker = new CandidatesTracker({});

      const line = tracker.formatCandidate({
        completed: false,
        file: 'test.js',
        startLine: 10,
        endLine: 20,
        description: 'Test',
        impact: 85,
      });

      expect(line).toContain('test.js:10-20');
    });

    it('formats single line correctly', async () => {
      const { CandidatesTracker } = await import('./candidates-tracker.js');
      const tracker = new CandidatesTracker({});

      const line = tracker.formatCandidate({
        completed: false,
        file: 'test.js',
        startLine: 10,
        endLine: 10,
        description: 'Test',
        impact: 85,
      });

      expect(line).toContain('test.js:10 -');
      expect(line).not.toContain('10-10');
    });
  });
});
