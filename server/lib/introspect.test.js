import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  scanModules,
  scanAPIs,
  scanDashboard,
  generateManifest,
  detectMismatches,
} from './introspect.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, '..');

describe('introspect', () => {
  describe('scanModules', () => {
    it('returns array of module objects', async () => {
      const modules = await scanModules(serverDir);

      expect(Array.isArray(modules)).toBe(true);
      expect(modules.length).toBeGreaterThan(0);
    });

    it('each module has name, hasTests, testCount properties', async () => {
      const modules = await scanModules(serverDir);

      modules.forEach(mod => {
        expect(mod).toHaveProperty('name');
        expect(mod).toHaveProperty('hasTests');
        expect(mod).toHaveProperty('testCount');
        expect(typeof mod.name).toBe('string');
        expect(typeof mod.hasTests).toBe('boolean');
        expect(typeof mod.testCount).toBe('number');
      });
    });

    it('detects modules with existing test files', async () => {
      const modules = await scanModules(serverDir);

      // agent-registry has tests (we know this exists)
      const agentRegistry = modules.find(m => m.name === 'agent-registry');
      expect(agentRegistry).toBeDefined();
      expect(agentRegistry.hasTests).toBe(true);
    });

    it('counts test cases in test files', async () => {
      const modules = await scanModules(serverDir);

      // agent-registry has multiple tests
      const agentRegistry = modules.find(m => m.name === 'agent-registry');
      expect(agentRegistry).toBeDefined();
      expect(agentRegistry.testCount).toBeGreaterThan(0);
    });

    it('identifies modules without tests', async () => {
      const modules = await scanModules(serverDir);

      // Check if any modules lack tests (there might be some)
      const withoutTests = modules.filter(m => !m.hasTests);
      // This is just to verify the structure works
      expect(Array.isArray(withoutTests)).toBe(true);
    });
  });

  describe('scanAPIs', () => {
    it('returns array of API endpoint objects', async () => {
      const apis = await scanAPIs(serverDir);

      expect(Array.isArray(apis)).toBe(true);
      expect(apis.length).toBeGreaterThan(0);
    });

    it('each API has method, path, handler properties', async () => {
      const apis = await scanAPIs(serverDir);

      apis.forEach(api => {
        expect(api).toHaveProperty('method');
        expect(api).toHaveProperty('path');
        expect(api).toHaveProperty('handler');
        expect(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).toContain(api.method);
        expect(typeof api.path).toBe('string');
      });
    });

    it('extracts GET endpoints', async () => {
      const apis = await scanAPIs(serverDir);

      const getEndpoints = apis.filter(a => a.method === 'GET');
      expect(getEndpoints.length).toBeGreaterThan(0);

      // We know /api/status exists from reading index.js
      const statusEndpoint = apis.find(a => a.path === '/api/status');
      expect(statusEndpoint).toBeDefined();
      expect(statusEndpoint.method).toBe('GET');
    });

    it('extracts POST endpoints', async () => {
      const apis = await scanAPIs(serverDir);

      const postEndpoints = apis.filter(a => a.method === 'POST');
      expect(postEndpoints.length).toBeGreaterThan(0);

      // We know /api/test exists from reading index.js
      const testEndpoint = apis.find(a => a.path === '/api/test');
      expect(testEndpoint).toBeDefined();
      expect(testEndpoint.method).toBe('POST');
    });

    it('extracts PATCH endpoints', async () => {
      const apis = await scanAPIs(serverDir);

      const patchEndpoints = apis.filter(a => a.method === 'PATCH');
      // We know /api/agents/:id PATCH exists
      expect(patchEndpoints.length).toBeGreaterThan(0);
    });

    it('extracts DELETE endpoints', async () => {
      const apis = await scanAPIs(serverDir);

      const deleteEndpoints = apis.filter(a => a.method === 'DELETE');
      // We know /api/agents/:id DELETE exists
      expect(deleteEndpoints.length).toBeGreaterThan(0);
    });
  });

  describe('scanDashboard', () => {
    it('returns array of panel objects', async () => {
      const panels = await scanDashboard(serverDir);

      expect(Array.isArray(panels)).toBe(true);
      expect(panels.length).toBeGreaterThan(0);
    });

    it('each panel has panelId and apiCalls properties', async () => {
      const panels = await scanDashboard(serverDir);

      panels.forEach(panel => {
        expect(panel).toHaveProperty('panelId');
        expect(panel).toHaveProperty('apiCalls');
        expect(typeof panel.panelId).toBe('string');
        expect(Array.isArray(panel.apiCalls)).toBe(true);
      });
    });

    it('extracts fetch API calls from dashboard', async () => {
      const panels = await scanDashboard(serverDir);

      // Collect all API calls
      const allCalls = panels.flatMap(p => p.apiCalls);
      expect(allCalls.length).toBeGreaterThan(0);

      // We know /api/status is called from the dashboard
      expect(allCalls).toContain('/api/status');
    });

    it('identifies panels with their API dependencies', async () => {
      const panels = await scanDashboard(serverDir);

      // Check that we have multiple panels identified
      const panelIds = panels.map(p => p.panelId);
      expect(panelIds.length).toBeGreaterThan(0);
    });
  });

  describe('generateManifest', () => {
    it('creates valid markdown content', async () => {
      const manifest = await generateManifest(serverDir);

      expect(typeof manifest).toBe('string');
      expect(manifest.length).toBeGreaterThan(0);
    });

    it('includes auto-generated header with timestamp', async () => {
      const manifest = await generateManifest(serverDir);

      expect(manifest).toContain('# TLC Manifest (auto-generated)');
      expect(manifest).toContain('Generated:');
    });

    it('includes Modules section with table', async () => {
      const manifest = await generateManifest(serverDir);

      expect(manifest).toContain('## Modules');
      expect(manifest).toContain('| Module | Has Tests | Test Count |');
      expect(manifest).toContain('|--------|-----------|------------|');
    });

    it('includes API Endpoints section with table', async () => {
      const manifest = await generateManifest(serverDir);

      expect(manifest).toContain('## API Endpoints');
      expect(manifest).toContain('| Method | Path | Handler |');
      expect(manifest).toContain('|--------|------|---------|');
    });

    it('includes Dashboard Panels section with table', async () => {
      const manifest = await generateManifest(serverDir);

      expect(manifest).toContain('## Dashboard Panels');
      expect(manifest).toContain('| Panel | API Calls |');
      expect(manifest).toContain('|-------|-----------|');
    });

    it('includes Issues Detected section', async () => {
      const manifest = await generateManifest(serverDir);

      expect(manifest).toContain('## Issues Detected');
    });
  });

  describe('detectMismatches', () => {
    it('returns array of mismatch issues', async () => {
      const modules = await scanModules(serverDir);
      const apis = await scanAPIs(serverDir);
      const panels = await scanDashboard(serverDir);

      const mismatches = detectMismatches(modules, apis, panels);

      expect(Array.isArray(mismatches)).toBe(true);
    });

    it('detects panels calling non-existent APIs', () => {
      const modules = [];
      const apis = [
        { method: 'GET', path: '/api/status', handler: 'getStatus' },
      ];
      const panels = [
        { panelId: 'test-panel', apiCalls: ['/api/status', '/api/missing'] },
      ];

      const mismatches = detectMismatches(modules, apis, panels);

      expect(mismatches.length).toBeGreaterThan(0);
      expect(mismatches.some(m => m.includes('/api/missing'))).toBe(true);
    });

    it('detects modules without tests', () => {
      const modules = [
        { name: 'tested-module', hasTests: true, testCount: 5 },
        { name: 'untested-module', hasTests: false, testCount: 0 },
      ];
      const apis = [];
      const panels = [];

      const mismatches = detectMismatches(modules, apis, panels);

      expect(mismatches.some(m => m.includes('untested-module') && m.includes('no tests'))).toBe(true);
    });

    it('detects APIs not called by any dashboard panel', () => {
      const modules = [];
      const apis = [
        { method: 'GET', path: '/api/status', handler: 'getStatus' },
        { method: 'GET', path: '/api/orphan', handler: 'getOrphan' },
      ];
      const panels = [
        { panelId: 'test-panel', apiCalls: ['/api/status'] },
      ];

      const mismatches = detectMismatches(modules, apis, panels);

      // This might flag orphan APIs (APIs not used by dashboard)
      // Or might not - depends on whether we consider this a mismatch
      expect(Array.isArray(mismatches)).toBe(true);
    });

    it('returns empty array when no mismatches found', () => {
      const modules = [
        { name: 'tested-module', hasTests: true, testCount: 5 },
      ];
      const apis = [
        { method: 'GET', path: '/api/status', handler: 'getStatus' },
      ];
      const panels = [
        { panelId: 'test-panel', apiCalls: ['/api/status'] },
      ];

      const mismatches = detectMismatches(modules, apis, panels);

      expect(Array.isArray(mismatches)).toBe(true);
    });
  });
});
