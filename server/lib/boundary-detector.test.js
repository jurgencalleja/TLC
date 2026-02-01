/**
 * Boundary Detector Tests
 */

import { describe, it, expect } from 'vitest';

describe('BoundaryDetector', () => {
  describe('service detection', () => {
    it('clusters related files together', async () => {
      const { BoundaryDetector } = await import('./boundary-detector.js');
      const detector = new BoundaryDetector({ minServiceSize: 2 });

      const graph = {
        nodes: [
          { id: '/auth/login.js', name: 'auth/login.js' },
          { id: '/auth/logout.js', name: 'auth/logout.js' },
          { id: '/auth/session.js', name: 'auth/session.js' },
          { id: '/users/model.js', name: 'users/model.js' },
          { id: '/users/api.js', name: 'users/api.js' },
        ],
        edges: [
          { fromName: 'auth/login.js', toName: 'auth/session.js' },
          { fromName: 'auth/logout.js', toName: 'auth/session.js' },
        ],
      };

      const result = detector.detect(graph);

      expect(result.services.length).toBeGreaterThanOrEqual(2);
      const authService = result.services.find(s => s.name === 'auth');
      expect(authService).toBeDefined();
      expect(authService.files).toHaveLength(3);
    });

    it('detects obvious boundaries (auth/, users/)', async () => {
      const { BoundaryDetector } = await import('./boundary-detector.js');
      const detector = new BoundaryDetector({ minServiceSize: 2 });

      const graph = {
        nodes: [
          { id: '/auth/login.js', name: 'auth/login.js' },
          { id: '/auth/token.js', name: 'auth/token.js' },
          { id: '/users/profile.js', name: 'users/profile.js' },
          { id: '/users/settings.js', name: 'users/settings.js' },
        ],
        edges: [],
      };

      const result = detector.detect(graph);

      const serviceNames = result.services.map(s => s.name);
      expect(serviceNames).toContain('auth');
      expect(serviceNames).toContain('users');
    });

    it('identifies shared utilities', async () => {
      const { BoundaryDetector } = await import('./boundary-detector.js');
      const detector = new BoundaryDetector({ minServiceSize: 2 });

      const graph = {
        nodes: [
          { id: '/auth/login.js', name: 'auth/login.js' },
          { id: '/auth/logout.js', name: 'auth/logout.js' },
          { id: '/users/api.js', name: 'users/api.js' },
          { id: '/users/model.js', name: 'users/model.js' },
          { id: '/utils/helpers.js', name: 'utils/helpers.js' },
          { id: '/utils/format.js', name: 'utils/format.js' },
        ],
        edges: [
          { fromName: 'auth/login.js', toName: 'utils/helpers.js' },
          { fromName: 'users/api.js', toName: 'utils/helpers.js' },
        ],
      };

      const result = detector.detect(graph);

      // utils/helpers.js is imported by both auth and users services
      expect(result.shared).toContain('utils/helpers.js');
    });

    it('scores boundary on coupling', async () => {
      const { BoundaryDetector } = await import('./boundary-detector.js');
      const detector = new BoundaryDetector({ minServiceSize: 2 });

      const graph = {
        nodes: [
          { id: '/clean/a.js', name: 'clean/a.js' },
          { id: '/clean/b.js', name: 'clean/b.js' },
          { id: '/clean/c.js', name: 'clean/c.js' },
          { id: '/messy/x.js', name: 'messy/x.js' },
          { id: '/messy/y.js', name: 'messy/y.js' },
          { id: '/other/z.js', name: 'other/z.js' },
        ],
        edges: [
          // Clean service has no external deps
          { fromName: 'clean/a.js', toName: 'clean/b.js' },
          // Messy service depends on multiple other services
          { fromName: 'messy/x.js', toName: 'clean/a.js' },
          { fromName: 'messy/x.js', toName: 'other/z.js' },
          { fromName: 'messy/y.js', toName: 'clean/b.js' },
        ],
      };

      const result = detector.detect(graph);

      const cleanService = result.services.find(s => s.name === 'clean');
      const messyService = result.services.find(s => s.name === 'messy');

      // Clean service should have higher quality (fewer external deps)
      expect(cleanService.quality).toBeGreaterThan(messyService.quality);
    });

    it('handles overlapping concerns', async () => {
      const { BoundaryDetector } = await import('./boundary-detector.js');
      const detector = new BoundaryDetector({ minServiceSize: 2 });

      const graph = {
        nodes: [
          { id: '/api/auth.js', name: 'api/auth.js' },
          { id: '/api/users.js', name: 'api/users.js' },
          { id: '/api/billing.js', name: 'api/billing.js' },
        ],
        edges: [
          { fromName: 'api/users.js', toName: 'api/auth.js' },
          { fromName: 'api/billing.js', toName: 'api/users.js' },
        ],
      };

      const result = detector.detect(graph);

      // Should still detect the api directory as a service
      expect(result.services.length).toBeGreaterThan(0);
    });
  });

  describe('bounded context detection', () => {
    it('detects auth context', async () => {
      const { BoundaryDetector } = await import('./boundary-detector.js');
      const detector = new BoundaryDetector({ minServiceSize: 2 });

      const graph = {
        nodes: [
          { id: '/auth/login.js', name: 'auth/login.js' },
          { id: '/auth/logout.js', name: 'auth/logout.js' },
          { id: '/auth/token.js', name: 'auth/token.js' },
        ],
        edges: [],
      };

      const result = detector.detect(graph);
      const authService = result.services.find(s => s.name === 'auth');

      expect(authService.context).toBe('auth');
    });

    it('detects users context', async () => {
      const { BoundaryDetector } = await import('./boundary-detector.js');
      const detector = new BoundaryDetector({ minServiceSize: 2 });

      const graph = {
        nodes: [
          { id: '/users/profile.js', name: 'users/profile.js' },
          { id: '/users/account.js', name: 'users/account.js' },
        ],
        edges: [],
      };

      const result = detector.detect(graph);
      const usersService = result.services.find(s => s.name === 'users');

      expect(usersService.context).toBe('users');
    });
  });

  describe('suggestions', () => {
    it('suggests extracting shared kernel', async () => {
      const { BoundaryDetector } = await import('./boundary-detector.js');
      const detector = new BoundaryDetector({ minServiceSize: 2 });

      const nodes = [];
      const edges = [];

      // Create multiple services using shared files
      for (let i = 0; i < 3; i++) {
        nodes.push({ id: `/svc${i}/a.js`, name: `svc${i}/a.js` });
        nodes.push({ id: `/svc${i}/b.js`, name: `svc${i}/b.js` });
      }

      // Shared files used by all services
      for (let j = 0; j < 6; j++) {
        nodes.push({ id: `/shared/util${j}.js`, name: `shared/util${j}.js` });
        for (let i = 0; i < 3; i++) {
          edges.push({ fromName: `svc${i}/a.js`, toName: `shared/util${j}.js` });
        }
      }

      const result = detector.detect({ nodes, edges });

      const extractSuggestion = result.suggestions.find(s => s.type === 'extract-shared');
      expect(extractSuggestion).toBeDefined();
    });

    it('suggests splitting large services', async () => {
      const { BoundaryDetector } = await import('./boundary-detector.js');
      const detector = new BoundaryDetector({ minServiceSize: 2 });

      const nodes = [];
      for (let i = 0; i < 25; i++) {
        nodes.push({ id: `/large/file${i}.js`, name: `large/file${i}.js` });
      }

      const result = detector.detect({ nodes, edges: [] });

      const splitSuggestion = result.suggestions.find(s => s.type === 'split-service');
      expect(splitSuggestion).toBeDefined();
      expect(splitSuggestion.service).toBe('large');
    });

    it('suggests merging small services', async () => {
      const { BoundaryDetector } = await import('./boundary-detector.js');
      const detector = new BoundaryDetector({ minServiceSize: 5 });

      const graph = {
        nodes: [
          { id: '/tiny1/a.js', name: 'tiny1/a.js' },
          { id: '/tiny1/b.js', name: 'tiny1/b.js' },
          { id: '/tiny1/c.js', name: 'tiny1/c.js' },
          { id: '/tiny2/d.js', name: 'tiny2/d.js' },
          { id: '/tiny2/e.js', name: 'tiny2/e.js' },
          { id: '/tiny2/f.js', name: 'tiny2/f.js' },
        ],
        edges: [],
      };

      const result = detector.detect(graph);

      // Both services have 3 files which is < minServiceSize of 5
      const mergeSuggestion = result.suggestions.find(s => s.type === 'merge-services');
      expect(mergeSuggestion).toBeDefined();
    });
  });

  describe('service dependencies', () => {
    it('tracks dependencies between services', async () => {
      const { BoundaryDetector } = await import('./boundary-detector.js');
      const detector = new BoundaryDetector({ minServiceSize: 2 });

      const graph = {
        nodes: [
          { id: '/api/routes.js', name: 'api/routes.js' },
          { id: '/api/handlers.js', name: 'api/handlers.js' },
          { id: '/db/models.js', name: 'db/models.js' },
          { id: '/db/queries.js', name: 'db/queries.js' },
        ],
        edges: [
          { fromName: 'api/handlers.js', toName: 'db/models.js' },
          { fromName: 'api/handlers.js', toName: 'db/queries.js' },
        ],
      };

      const result = detector.detect(graph);

      const apiService = result.services.find(s => s.name === 'api');
      expect(apiService.dependencies).toContain('db');
    });
  });

  describe('clustering', () => {
    it('finds connected components', async () => {
      const { BoundaryDetector } = await import('./boundary-detector.js');
      const detector = new BoundaryDetector();

      const nodes = [
        { name: 'a.js' },
        { name: 'b.js' },
        { name: 'c.js' },
        { name: 'x.js' },
        { name: 'y.js' },
      ];

      const edges = [
        { fromName: 'a.js', toName: 'b.js' },
        { fromName: 'b.js', toName: 'c.js' },
        { fromName: 'x.js', toName: 'y.js' },
      ];

      const clusters = detector.clusterFiles(nodes, edges);

      expect(clusters.length).toBe(2);
      expect(clusters[0]).toContain('a.js');
      expect(clusters[0]).toContain('b.js');
      expect(clusters[0]).toContain('c.js');
    });
  });

  describe('statistics', () => {
    it('provides useful stats', async () => {
      const { BoundaryDetector } = await import('./boundary-detector.js');
      const detector = new BoundaryDetector({ minServiceSize: 2 });

      const graph = {
        nodes: [
          { id: '/auth/a.js', name: 'auth/a.js' },
          { id: '/auth/b.js', name: 'auth/b.js' },
          { id: '/users/c.js', name: 'users/c.js' },
          { id: '/users/d.js', name: 'users/d.js' },
        ],
        edges: [
          { fromName: 'auth/a.js', toName: 'users/c.js' },
        ],
      };

      const result = detector.detect(graph);

      expect(result.stats).toBeDefined();
      expect(result.stats.totalServices).toBe(2);
      expect(typeof result.stats.averageCoupling).toBe('number');
    });
  });
});
