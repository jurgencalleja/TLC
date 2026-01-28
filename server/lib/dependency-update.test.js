import { describe, it, expect } from 'vitest';
import {
  parseNpmOutdatedOutput,
  parsePipOutdatedOutput,
  categorizeUpdates,
  formatOutdatedReport,
  generateUpdatePlan,
} from './dependency-update.js';

describe('dependency-update', () => {
  describe('parseNpmOutdatedOutput', () => {
    it('parses npm outdated JSON output', () => {
      const output = {
        lodash: {
          current: '4.17.15',
          wanted: '4.17.21',
          latest: '4.17.21',
          dependent: 'my-project',
          location: 'node_modules/lodash',
        },
        react: {
          current: '17.0.2',
          wanted: '17.0.2',
          latest: '18.2.0',
          dependent: 'my-project',
        },
      };

      const result = parseNpmOutdatedOutput(JSON.stringify(output));

      expect(result.packages).toHaveLength(2);
      expect(result.packages[0].name).toBe('lodash');
      expect(result.packages[0].current).toBe('4.17.15');
      expect(result.packages[0].latest).toBe('4.17.21');
    });

    it('handles empty output (all up to date)', () => {
      const result = parseNpmOutdatedOutput('{}');

      expect(result.packages).toHaveLength(0);
    });

    it('returns null for invalid JSON', () => {
      const result = parseNpmOutdatedOutput('not json');

      expect(result).toBeNull();
    });
  });

  describe('parsePipOutdatedOutput', () => {
    it('parses pip list --outdated JSON output', () => {
      const output = [
        { name: 'requests', version: '2.25.0', latest_version: '2.28.0' },
        { name: 'django', version: '3.2.0', latest_version: '4.2.0' },
      ];

      const result = parsePipOutdatedOutput(JSON.stringify(output));

      expect(result.packages).toHaveLength(2);
      expect(result.packages[0].name).toBe('requests');
      expect(result.packages[0].current).toBe('2.25.0');
      expect(result.packages[0].latest).toBe('2.28.0');
    });

    it('handles empty array', () => {
      const result = parsePipOutdatedOutput('[]');

      expect(result.packages).toHaveLength(0);
    });
  });

  describe('categorizeUpdates', () => {
    it('categorizes by version bump type', () => {
      const packages = [
        { name: 'patch-pkg', current: '1.0.0', latest: '1.0.1' },
        { name: 'minor-pkg', current: '1.0.0', latest: '1.1.0' },
        { name: 'major-pkg', current: '1.0.0', latest: '2.0.0' },
      ];

      const result = categorizeUpdates(packages);

      expect(result.patch).toHaveLength(1);
      expect(result.minor).toHaveLength(1);
      expect(result.major).toHaveLength(1);
    });

    it('handles pre-release versions', () => {
      const packages = [
        { name: 'beta-pkg', current: '1.0.0', latest: '2.0.0-beta.1' },
      ];

      const result = categorizeUpdates(packages);

      expect(result.major).toHaveLength(1);
    });

    it('handles empty array', () => {
      const result = categorizeUpdates([]);

      expect(result.patch).toHaveLength(0);
      expect(result.minor).toHaveLength(0);
      expect(result.major).toHaveLength(0);
    });
  });

  describe('generateUpdatePlan', () => {
    it('creates safe update plan for patch/minor', () => {
      const packages = [
        { name: 'lodash', current: '4.17.15', latest: '4.17.21' },
        { name: 'axios', current: '0.21.0', latest: '0.21.4' },
      ];

      const plan = generateUpdatePlan(packages, 'npm');

      expect(plan.safe).toHaveLength(2);
      expect(plan.breaking).toHaveLength(0);
      expect(plan.safeCommand).toContain('npm install');
    });

    it('separates major updates as breaking', () => {
      const packages = [
        { name: 'lodash', current: '4.17.15', latest: '4.17.21' },
        { name: 'react', current: '17.0.2', latest: '18.2.0' },
      ];

      const plan = generateUpdatePlan(packages, 'npm');

      expect(plan.safe).toHaveLength(1);
      expect(plan.breaking).toHaveLength(1);
      expect(plan.breaking[0].name).toBe('react');
    });

    it('generates pip commands', () => {
      const packages = [
        { name: 'requests', current: '2.25.0', latest: '2.28.0' },
      ];

      const plan = generateUpdatePlan(packages, 'pip');

      expect(plan.safeCommand).toContain('pip install');
    });
  });

  describe('formatOutdatedReport', () => {
    it('shows package counts', () => {
      const outdated = {
        packages: [
          { name: 'lodash', current: '4.17.15', latest: '4.17.21' },
          { name: 'react', current: '17.0.2', latest: '18.2.0' },
        ],
      };

      const report = formatOutdatedReport(outdated);

      expect(report).toContain('2');
      expect(report).toContain('lodash');
      expect(report).toContain('react');
    });

    it('shows all up to date message', () => {
      const outdated = { packages: [] };

      const report = formatOutdatedReport(outdated);

      expect(report.toLowerCase()).toContain('up to date');
    });

    it('highlights breaking changes', () => {
      const outdated = {
        packages: [
          { name: 'react', current: '17.0.2', latest: '18.2.0' },
        ],
      };

      const report = formatOutdatedReport(outdated);

      expect(report).toContain('major');
    });

    it('shows update commands', () => {
      const outdated = {
        packages: [
          { name: 'lodash', current: '4.17.15', latest: '4.17.21' },
        ],
      };

      const report = formatOutdatedReport(outdated, 'npm');

      expect(report).toContain('npm');
    });
  });
});
