import { describe, it, expect } from 'vitest';
import {
  HTTP_METHODS,
  detectFramework,
  extractRoutes,
  extractPathParams,
  normalizePathToOpenAPI,
  detectRequestBody,
  detectResponses,
  mergeRoutes,
  groupRoutesByBasePath,
  inferTags,
  generateOperationId,
} from './route-detector.js';

describe('route-detector', () => {
  describe('detectFramework', () => {
    it('detects Express', () => {
      expect(detectFramework("import express from 'express'")).toBe('express');
      expect(detectFramework("const express = require('express')")).toBe('express');
    });

    it('detects Fastify', () => {
      expect(detectFramework("import fastify from 'fastify'")).toBe('fastify');
    });

    it('detects Hono', () => {
      expect(detectFramework("import { Hono } from 'hono'")).toBe('hono');
    });

    it('detects Koa', () => {
      expect(detectFramework("import Koa from 'koa'")).toBe('koa');
    });

    it('returns null for unknown', () => {
      expect(detectFramework('console.log("hello")')).toBeNull();
    });
  });

  describe('extractRoutes', () => {
    it('extracts Express routes', () => {
      const content = `
        import express from 'express';
        const app = express();
        app.get('/users', getUsers);
        app.post('/users', createUser);
        app.get('/users/:id', getUser);
      `;

      const routes = extractRoutes(content, 'routes.js');

      expect(routes).toHaveLength(3);
      expect(routes[0]).toEqual({
        method: 'GET',
        path: '/users',
        framework: 'express',
        file: 'routes.js',
      });
      expect(routes[2].path).toBe('/users/:id');
    });

    it('extracts Express router routes', () => {
      const content = `
        import express from 'express';
        const router = express.Router();
        router.get('/items', getItems);
        router.delete('/items/:id', deleteItem);
      `;

      const routes = extractRoutes(content);

      expect(routes).toHaveLength(2);
      expect(routes[0].method).toBe('GET');
      expect(routes[1].method).toBe('DELETE');
    });

    it('extracts Fastify routes', () => {
      const content = `
        import fastify from 'fastify';
        const app = fastify();
        fastify.get('/api/data', handler);
        fastify.post('/api/data', handler);
      `;

      const routes = extractRoutes(content);

      expect(routes).toHaveLength(2);
      expect(routes[0].framework).toBe('fastify');
    });

    it('extracts Hono routes', () => {
      const content = `
        import { Hono } from 'hono';
        const app = new Hono();
        app.get('/health', (c) => c.json({ status: 'ok' }));
        app.post('/webhook', handler);
      `;

      const routes = extractRoutes(content);

      expect(routes).toHaveLength(2);
      expect(routes[0].framework).toBe('hono');
    });

    it('extracts routes from unknown framework', () => {
      const content = `
        server.get('/ping', pingHandler);
        server.post('/data', dataHandler);
      `;

      const routes = extractRoutes(content);

      expect(routes.length).toBeGreaterThanOrEqual(2);
      expect(routes[0].framework).toBe('unknown');
    });
  });

  describe('extractPathParams', () => {
    it('extracts Express-style params', () => {
      const params = extractPathParams('/users/:id/posts/:postId');

      expect(params).toHaveLength(2);
      expect(params[0].name).toBe('id');
      expect(params[1].name).toBe('postId');
      expect(params[0].in).toBe('path');
      expect(params[0].required).toBe(true);
    });

    it('extracts OpenAPI-style params', () => {
      const params = extractPathParams('/users/{id}/posts/{postId}');

      expect(params).toHaveLength(2);
      expect(params[0].name).toBe('id');
    });

    it('returns empty for no params', () => {
      const params = extractPathParams('/users');

      expect(params).toHaveLength(0);
    });
  });

  describe('normalizePathToOpenAPI', () => {
    it('converts Express params to OpenAPI', () => {
      expect(normalizePathToOpenAPI('/users/:id')).toBe('/users/{id}');
      expect(normalizePathToOpenAPI('/users/:userId/posts/:postId'))
        .toBe('/users/{userId}/posts/{postId}');
    });

    it('leaves OpenAPI paths unchanged', () => {
      expect(normalizePathToOpenAPI('/users/{id}')).toBe('/users/{id}');
    });

    it('handles paths without params', () => {
      expect(normalizePathToOpenAPI('/users')).toBe('/users');
    });
  });

  describe('detectRequestBody', () => {
    it('detects req.body.field access', () => {
      const content = `
        const name = req.body.name;
        const email = req.body.email;
      `;

      const body = detectRequestBody(content);

      expect(body).not.toBeNull();
      expect(body.hasBody).toBe(true);
      expect(body.fields).toContain('name');
      expect(body.fields).toContain('email');
    });

    it('detects destructured body', () => {
      const content = `
        const { username, password, rememberMe } = req.body;
      `;

      const body = detectRequestBody(content);

      expect(body.hasBody).toBe(true);
      expect(body.fields).toContain('username');
      expect(body.fields).toContain('password');
      expect(body.fields).toContain('rememberMe');
    });

    it('returns null for no body', () => {
      const content = `
        const id = req.params.id;
        res.json({ ok: true });
      `;

      const body = detectRequestBody(content);

      expect(body).toBeNull();
    });
  });

  describe('detectResponses', () => {
    it('detects res.status().json()', () => {
      const content = `
        res.status(200).json({ data });
        res.status(404).json({ error: 'Not found' });
      `;

      const responses = detectResponses(content);

      expect(responses.some(r => r.status === 200)).toBe(true);
      expect(responses.some(r => r.status === 404)).toBe(true);
    });

    it('detects res.json() as 200', () => {
      const content = `res.json({ users })`;

      const responses = detectResponses(content);

      expect(responses.some(r => r.status === 200)).toBe(true);
    });

    it('detects error patterns', () => {
      const content = `
        if (!user) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        if (error) {
          return res.status(500).json({ error: 'Internal server error' });
        }
      `;

      const responses = detectResponses(content);

      expect(responses.some(r => r.status === 401)).toBe(true);
      expect(responses.some(r => r.status === 500)).toBe(true);
    });
  });

  describe('mergeRoutes', () => {
    it('merges routes from multiple files', () => {
      const file1Routes = [
        { method: 'GET', path: '/users', file: 'users.js' },
        { method: 'POST', path: '/users', file: 'users.js' },
      ];
      const file2Routes = [
        { method: 'GET', path: '/posts', file: 'posts.js' },
      ];

      const merged = mergeRoutes([file1Routes, file2Routes]);

      expect(merged).toHaveLength(3);
    });

    it('deduplicates routes', () => {
      const routes1 = [{ method: 'GET', path: '/users' }];
      const routes2 = [{ method: 'GET', path: '/users' }];

      const merged = mergeRoutes([routes1, routes2]);

      expect(merged).toHaveLength(1);
    });

    it('sorts by path then method', () => {
      const routes = [
        { method: 'POST', path: '/users' },
        { method: 'GET', path: '/posts' },
        { method: 'GET', path: '/users' },
      ];

      const merged = mergeRoutes([routes]);

      expect(merged[0].path).toBe('/posts');
      expect(merged[1].path).toBe('/users');
      expect(merged[1].method).toBe('GET');
      expect(merged[2].method).toBe('POST');
    });
  });

  describe('groupRoutesByBasePath', () => {
    it('groups routes by first segment', () => {
      const routes = [
        { method: 'GET', path: '/users' },
        { method: 'GET', path: '/users/:id' },
        { method: 'GET', path: '/posts' },
        { method: 'POST', path: '/posts' },
      ];

      const groups = groupRoutesByBasePath(routes);

      expect(groups['/users']).toHaveLength(2);
      expect(groups['/posts']).toHaveLength(2);
    });

    it('handles root path', () => {
      const routes = [{ method: 'GET', path: '/' }];

      const groups = groupRoutesByBasePath(routes);

      expect(groups['/']).toHaveLength(1);
    });
  });

  describe('inferTags', () => {
    it('uses first path segment as tag', () => {
      expect(inferTags('/users')).toEqual(['users']);
      expect(inferTags('/users/:id')).toEqual(['users']);
      expect(inferTags('/api/v1/users')).toEqual(['api']);
    });

    it('returns root for empty path', () => {
      expect(inferTags('/')).toEqual(['root']);
    });

    it('cleans param syntax from tags', () => {
      expect(inferTags('/{version}/users')).toEqual(['version']);
    });
  });

  describe('generateOperationId', () => {
    it('generates camelCase operation ID', () => {
      expect(generateOperationId('GET', '/users')).toBe('getUsers');
      expect(generateOperationId('POST', '/users')).toBe('postUsers');
      expect(generateOperationId('GET', '/users/:id')).toBe('getUsersId');
    });

    it('handles nested paths', () => {
      expect(generateOperationId('GET', '/users/:id/posts'))
        .toBe('getUsersIdPosts');
    });

    it('handles root path', () => {
      expect(generateOperationId('GET', '/')).toBe('get');
    });
  });
});
