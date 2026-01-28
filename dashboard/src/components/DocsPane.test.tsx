import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import {
  DocsPane,
  getMethodColor,
  formatMethod,
  groupByTag,
  countByMethod,
} from './DocsPane.js';

describe('DocsPane', () => {
  describe('getMethodColor', () => {
    it('returns green for GET', () => {
      expect(getMethodColor('GET')).toBe('green');
      expect(getMethodColor('get')).toBe('green');
    });

    it('returns yellow for POST', () => {
      expect(getMethodColor('POST')).toBe('yellow');
    });

    it('returns blue for PUT', () => {
      expect(getMethodColor('PUT')).toBe('blue');
    });

    it('returns cyan for PATCH', () => {
      expect(getMethodColor('PATCH')).toBe('cyan');
    });

    it('returns red for DELETE', () => {
      expect(getMethodColor('DELETE')).toBe('red');
    });

    it('returns gray for unknown', () => {
      expect(getMethodColor('OPTIONS')).toBe('gray');
    });
  });

  describe('formatMethod', () => {
    it('formats method to fixed width', () => {
      expect(formatMethod('GET').length).toBe(7);
      expect(formatMethod('DELETE').length).toBe(7);
    });

    it('uppercases method', () => {
      expect(formatMethod('get')).toBe('GET    ');
    });
  });

  describe('groupByTag', () => {
    it('groups routes by first tag', () => {
      const routes = [
        { method: 'GET', path: '/users', tags: ['users'] },
        { method: 'POST', path: '/users', tags: ['users'] },
        { method: 'GET', path: '/posts', tags: ['posts'] },
      ];

      const grouped = groupByTag(routes);

      expect(grouped['users']).toHaveLength(2);
      expect(grouped['posts']).toHaveLength(1);
    });

    it('uses default for routes without tags', () => {
      const routes = [
        { method: 'GET', path: '/health' },
      ];

      const grouped = groupByTag(routes);

      expect(grouped['default']).toHaveLength(1);
    });
  });

  describe('countByMethod', () => {
    it('counts routes by method', () => {
      const routes = [
        { method: 'GET', path: '/a' },
        { method: 'GET', path: '/b' },
        { method: 'POST', path: '/c' },
      ];

      const counts = countByMethod(routes);

      expect(counts['GET']).toBe(2);
      expect(counts['POST']).toBe(1);
    });

    it('uppercases method names', () => {
      const routes = [
        { method: 'get', path: '/a' },
        { method: 'Get', path: '/b' },
      ];

      const counts = countByMethod(routes);

      expect(counts['GET']).toBe(2);
    });
  });

  describe('component rendering', () => {
    it('renders empty state when no routes', () => {
      const { lastFrame } = render(
        <DocsPane routes={[]} isActive={false} />
      );
      const output = lastFrame();

      expect(output).toContain('No routes documented');
      expect(output).toContain('/tlc:docs');
    });

    it('renders route count', () => {
      const routes = [
        { method: 'GET', path: '/users' },
        { method: 'POST', path: '/users' },
      ];

      const { lastFrame } = render(
        <DocsPane routes={routes} isActive={false} />
      );
      const output = lastFrame();

      expect(output).toContain('2 endpoints');
    });

    it('renders routes list', () => {
      const routes = [
        { method: 'GET', path: '/users' },
        { method: 'POST', path: '/posts' },
      ];

      const { lastFrame } = render(
        <DocsPane routes={routes} isActive={false} />
      );
      const output = lastFrame();

      expect(output).toContain('GET');
      expect(output).toContain('/users');
      expect(output).toContain('POST');
      expect(output).toContain('/posts');
    });

    it('renders method summary', () => {
      const routes = [
        { method: 'GET', path: '/a' },
        { method: 'GET', path: '/b' },
        { method: 'POST', path: '/c' },
      ];

      const { lastFrame } = render(
        <DocsPane routes={routes} isActive={false} />
      );
      const output = lastFrame();

      expect(output).toContain('GET');
      expect(output).toContain('POST');
    });

    it('renders spec file path', () => {
      const routes = [{ method: 'GET', path: '/test' }];

      const { lastFrame } = render(
        <DocsPane
          routes={routes}
          specFile="docs/api/openapi.json"
          isActive={false}
        />
      );
      const output = lastFrame();

      expect(output).toContain('Spec:');
      expect(output).toContain('openapi.json');
    });

    it('renders selected route details', () => {
      const routes = [
        { method: 'GET', path: '/users', summary: 'List all users', tags: ['users'] },
      ];

      const { lastFrame } = render(
        <DocsPane
          routes={routes}
          selectedRoute={routes[0]}
          isActive={false}
        />
      );
      const output = lastFrame();

      expect(output).toContain('List all users');
      expect(output).toContain('users');
    });

    it('renders controls when active', () => {
      const routes = [{ method: 'GET', path: '/test' }];

      const { lastFrame } = render(
        <DocsPane routes={routes} isActive={true} />
      );
      const output = lastFrame();

      expect(output).toContain('Navigate');
      expect(output).toContain('Refresh');
      expect(output).toContain('Open spec');
    });

    it('hides controls when inactive', () => {
      const routes = [{ method: 'GET', path: '/test' }];

      const { lastFrame } = render(
        <DocsPane routes={routes} isActive={false} />
      );
      const output = lastFrame();

      expect(output).not.toContain('Refresh');
    });

    it('truncates long route lists', () => {
      const routes = Array.from({ length: 15 }, (_, i) => ({
        method: 'GET',
        path: `/route-${i}`,
      }));

      const { lastFrame } = render(
        <DocsPane routes={routes} isActive={false} />
      );
      const output = lastFrame();

      expect(output).toContain('and 5 more');
    });
  });
});
