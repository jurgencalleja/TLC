/**
 * Architecture Rules Tests
 *
 * Detects single-writer violations, fake API calls,
 * stale re-exports, and raw API bypass patterns.
 */
import { describe, it, expect } from 'vitest';

const {
  checkSingleWriter,
  checkFakeApiCalls,
  checkStaleReexports,
  checkRawApiRequests,
} = require('./architecture-rules.js');

describe('Architecture Rules', () => {
  describe('checkSingleWriter', () => {
    it('detects db.insert(users) outside users.service', () => {
      const findings = checkSingleWriter(
        'src/leads/leads.service.ts',
        'const result = await db.insert(users).values(data);'
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('block');
      expect(findings[0].rule).toBe('single-writer');
      expect(findings[0].message).toContain('users');
    });

    it('passes when inside correct service file', () => {
      const findings = checkSingleWriter(
        'src/users/users.service.ts',
        'const result = await db.insert(users).values(data);'
      );
      expect(findings).toHaveLength(0);
    });

    it('detects db.update(companies) outside company.service', () => {
      const findings = checkSingleWriter(
        'src/api/controller.ts',
        'await db.update(companies).set({ status: "active" });'
      );
      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('companies');
    });

    it('handles singular service name for plural table', () => {
      // company.service.ts should be allowed to write to companies table
      const findings = checkSingleWriter(
        'src/company/company.service.ts',
        'await db.insert(companies).values(data);'
      );
      expect(findings).toHaveLength(0);
    });

    it('skips test files', () => {
      const findings = checkSingleWriter(
        'src/api/controller.test.ts',
        'await db.insert(users).values(data);'
      );
      expect(findings).toHaveLength(0);
    });
  });

  describe('checkFakeApiCalls', () => {
    it('detects setTimeout + resolve mock pattern', () => {
      const code = `
        function getUsers() {
          return new Promise((resolve) => {
            setTimeout(() => resolve([{ id: 1, name: 'Test' }]), 500);
          });
        }
      `;
      const findings = checkFakeApiCalls('src/api/users.ts', code);
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('block');
      expect(findings[0].rule).toBe('no-fake-api');
    });

    it('allows real setTimeout with function callback', () => {
      const code = `
        setTimeout(() => {
          refreshDashboard();
        }, 1000);
      `;
      const findings = checkFakeApiCalls('src/ui/dashboard.ts', code);
      expect(findings).toHaveLength(0);
    });

    it('skips test files', () => {
      const code = 'setTimeout(() => resolve(mockData), 500);';
      const findings = checkFakeApiCalls('src/api/users.test.ts', code);
      expect(findings).toHaveLength(0);
    });
  });

  describe('checkStaleReexports', () => {
    it('detects file with only module.exports = require(...)', () => {
      const code = "module.exports = require('./new-location');";
      const findings = checkStaleReexports('src/old-module.js', code);
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('warn');
      expect(findings[0].rule).toBe('stale-reexport');
    });

    it('passes file with real logic alongside export', () => {
      const code = `
        const helper = require('./utils');
        function doWork() { return helper.process(); }
        module.exports = { doWork };
      `;
      const findings = checkStaleReexports('src/module.js', code);
      expect(findings).toHaveLength(0);
    });

    it('detects export default re-export', () => {
      const code = "export { default } from './new-location';";
      const findings = checkStaleReexports('src/old-module.ts', code);
      expect(findings).toHaveLength(1);
    });
  });

  describe('checkRawApiRequests', () => {
    it('detects apiRequest("POST", "/api/...")', () => {
      const code = 'const result = await apiRequest("POST", "/api/companies", data);';
      const findings = checkRawApiRequests('src/components/form.tsx', code);
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('warn');
      expect(findings[0].rule).toBe('no-raw-api');
    });

    it('detects raw fetch("/api/...")', () => {
      const code = 'const res = await fetch("/api/leads", { method: "POST" });';
      const findings = checkRawApiRequests('src/components/leads.tsx', code);
      expect(findings).toHaveLength(1);
    });

    it('allows non-API fetch calls', () => {
      const code = 'const res = await fetch("https://cdn.example.com/data.json");';
      const findings = checkRawApiRequests('src/utils/loader.ts', code);
      expect(findings).toHaveLength(0);
    });

    it('allows fetch in API helper files', () => {
      const code = 'const res = await fetch("/api/companies");';
      const findings = checkRawApiRequests('src/lib/api.ts', code);
      expect(findings).toHaveLength(0);
    });

    it('skips test files', () => {
      const code = 'await apiRequest("POST", "/api/test", data);';
      const findings = checkRawApiRequests('src/components/form.test.tsx', code);
      expect(findings).toHaveLength(0);
    });
  });
});
