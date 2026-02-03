/**
 * TLC Introspection Module Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { parseRoadmap, parseProjectMd, parseTlcConfig, getProjectState, getCurrentPhase, createTlcIntrospection } from './tlc-introspection.js';

describe('tlc-introspection', () => {
  describe('parseRoadmap', () => {
    it('parses phases from ROADMAP.md', () => {
      const content = `
## Milestone: v1.0
### Phase 1: Core [x]
### Phase 2: Tests [>]
### Phase 3: Deploy [ ]
`;
      const phases = parseRoadmap(content);
      expect(phases.length).toBe(3);
      expect(phases[0].status).toBe('complete');
      expect(phases[1].status).toBe('current');
      expect(phases[2].status).toBe('pending');
    });

    it('extracts phase names', () => {
      const content = `### Phase 1: Core Infrastructure [x]`;
      const phases = parseRoadmap(content);
      expect(phases[0].name).toBe('Core Infrastructure');
      expect(phases[0].number).toBe(1);
    });

    it('groups phases by milestone', () => {
      const content = `
## Milestone: v1.0
### Phase 1: Core [x]
## Milestone: v2.0
### Phase 2: New [>]
`;
      const phases = parseRoadmap(content);
      expect(phases[0].milestone).toBe('v1.0');
      expect(phases[1].milestone).toBe('v2.0');
    });
  });

  describe('parseProjectMd', () => {
    it('extracts project name', () => {
      const content = `# My Project\n\nDescription here`;
      const project = parseProjectMd(content);
      expect(project.name).toBe('My Project');
    });

    it('extracts description', () => {
      const content = `# Project\n\nThis is a description.\n\n## Section`;
      const project = parseProjectMd(content);
      expect(project.description).toContain('description');
    });

    it('handles missing content gracefully', () => {
      const project = parseProjectMd('');
      expect(project.name).toBe('Untitled');
    });
  });

  describe('parseTlcConfig', () => {
    it('parses .tlc.json', () => {
      const config = parseTlcConfig('{"project": "test", "testFrameworks": {"primary": "vitest"}}');
      expect(config.project).toBe('test');
      expect(config.testFrameworks.primary).toBe('vitest');
    });

    it('returns defaults for invalid JSON', () => {
      const config = parseTlcConfig('invalid');
      expect(config.project).toBe('unknown');
    });
  });

  describe('getProjectState', () => {
    it('returns complete project state', async () => {
      const mockFs = {
        readFile: vi.fn()
          .mockResolvedValueOnce('# Test Project\nDesc')
          .mockResolvedValueOnce('### Phase 1: Test [x]')
          .mockResolvedValueOnce('{"project": "test"}')
      };
      const state = await getProjectState({ fs: mockFs, basePath: '/test' });
      expect(state.project).toBeDefined();
      expect(state.phases).toBeDefined();
      expect(state.config).toBeDefined();
    });

    it('handles missing files', async () => {
      const mockFs = {
        readFile: vi.fn().mockRejectedValue(new Error('ENOENT'))
      };
      const state = await getProjectState({ fs: mockFs, basePath: '/test' });
      expect(state.project.name).toBe('Untitled');
    });
  });

  describe('getCurrentPhase', () => {
    it('returns current phase', () => {
      const phases = [
        { number: 1, status: 'complete' },
        { number: 2, status: 'current' },
        { number: 3, status: 'pending' }
      ];
      const current = getCurrentPhase(phases);
      expect(current.number).toBe(2);
    });

    it('returns first pending if no current', () => {
      const phases = [
        { number: 1, status: 'complete' },
        { number: 2, status: 'pending' }
      ];
      const current = getCurrentPhase(phases);
      expect(current.number).toBe(2);
    });
  });

  describe('createTlcIntrospection', () => {
    it('creates introspection instance', () => {
      const introspection = createTlcIntrospection({ basePath: '/test' });
      expect(introspection.getState).toBeDefined();
      expect(introspection.getPhases).toBeDefined();
      expect(introspection.getCurrentPhase).toBeDefined();
    });

    it('caches state', async () => {
      const mockFs = {
        readFile: vi.fn().mockResolvedValue('# Test')
      };
      const introspection = createTlcIntrospection({ basePath: '/test', fs: mockFs });
      await introspection.getState();
      await introspection.getState();
      // Should only read once due to caching
      expect(mockFs.readFile).toHaveBeenCalledTimes(3); // PROJECT.md, ROADMAP.md, .tlc.json
    });
  });
});
