import { describe, it, expect, beforeEach } from 'vitest';
import { createProjectStore, ProjectStore, Project } from './projectStore.js';

const sampleProjects: Project[] = [
  {
    id: '1',
    name: 'TLC',
    description: 'Test-Led Coding framework',
    phase: { current: 33, total: 40, name: 'Multi-Model Router' },
    tests: { passing: 1180, failing: 20, total: 1200 },
    coverage: 87,
    lastActivity: '2 min ago',
  },
  {
    id: '2',
    name: 'Other Project',
    description: 'Another project',
    phase: { current: 1, total: 5, name: 'Setup' },
    tests: { passing: 10, failing: 0, total: 10 },
    coverage: 100,
    lastActivity: '1 hour ago',
  },
];

describe('projectStore', () => {
  let store: ProjectStore;

  beforeEach(() => {
    store = createProjectStore();
  });

  describe('Projects List', () => {
    it('starts with empty projects', () => {
      expect(store.getState().projects).toEqual([]);
    });

    it('sets projects', () => {
      store.getState().setProjects(sampleProjects);
      expect(store.getState().projects).toEqual(sampleProjects);
    });

    it('adds a project', () => {
      store.getState().addProject(sampleProjects[0]);
      expect(store.getState().projects).toHaveLength(1);
    });

    it('removes a project', () => {
      store.getState().setProjects(sampleProjects);
      store.getState().removeProject('1');
      expect(store.getState().projects).toHaveLength(1);
      expect(store.getState().projects[0].id).toBe('2');
    });

    it('updates a project', () => {
      store.getState().setProjects(sampleProjects);
      store.getState().updateProject('1', { coverage: 95 });
      expect(store.getState().projects[0].coverage).toBe(95);
    });
  });

  describe('Selected Project', () => {
    it('starts with no selected project', () => {
      expect(store.getState().selectedProject).toBeNull();
    });

    it('selects project by ID', () => {
      store.getState().setProjects(sampleProjects);
      store.getState().selectProject('1');
      expect(store.getState().selectedProject?.id).toBe('1');
    });

    it('clears selection', () => {
      store.getState().setProjects(sampleProjects);
      store.getState().selectProject('1');
      store.getState().clearSelection();
      expect(store.getState().selectedProject).toBeNull();
    });

    it('returns null for non-existent ID', () => {
      store.getState().setProjects(sampleProjects);
      store.getState().selectProject('nonexistent');
      expect(store.getState().selectedProject).toBeNull();
    });
  });

  describe('Loading State', () => {
    it('starts not loading', () => {
      expect(store.getState().loading).toBe(false);
    });

    it('sets loading state', () => {
      store.getState().setLoading(true);
      expect(store.getState().loading).toBe(true);
    });
  });

  describe('Error State', () => {
    it('starts with no error', () => {
      expect(store.getState().error).toBeNull();
    });

    it('sets error', () => {
      store.getState().setError('Failed to load');
      expect(store.getState().error).toBe('Failed to load');
    });

    it('clears error', () => {
      store.getState().setError('Error');
      store.getState().clearError();
      expect(store.getState().error).toBeNull();
    });
  });

  describe('Filtering', () => {
    it('filters by search query', () => {
      store.getState().setProjects(sampleProjects);
      const filtered = store.getState().getFilteredProjects('TLC');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('TLC');
    });

    it('returns all when no filter', () => {
      store.getState().setProjects(sampleProjects);
      const filtered = store.getState().getFilteredProjects('');
      expect(filtered).toHaveLength(2);
    });

    it('is case insensitive', () => {
      store.getState().setProjects(sampleProjects);
      const filtered = store.getState().getFilteredProjects('tlc');
      expect(filtered).toHaveLength(1);
    });
  });
});
