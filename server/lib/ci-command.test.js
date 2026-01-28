import { describe, it, expect } from 'vitest';
import {
  parseCIArgs,
  generateWorkflows,
  formatSummary,
  createCICommand,
} from './ci-command.js';

describe('ci-command', () => {
  describe('parseCIArgs', () => {
    it('returns defaults for empty args', () => {
      const options = parseCIArgs('');

      expect(options.type).toBe('test');
      expect(options.coverage).toBe(true);
      expect(options.lint).toBe(true);
      expect(options.dryRun).toBe(false);
    });

    it('parses --pr flag', () => {
      const options = parseCIArgs('--pr');
      expect(options.type).toBe('pr');
    });

    it('parses --test flag', () => {
      const options = parseCIArgs('--test');
      expect(options.type).toBe('test');
    });

    it('parses --both flag', () => {
      const options = parseCIArgs('--both');
      expect(options.type).toBe('both');
    });

    it('parses --no-coverage flag', () => {
      const options = parseCIArgs('--no-coverage');
      expect(options.coverage).toBe(false);
    });

    it('parses --no-lint flag', () => {
      const options = parseCIArgs('--no-lint');
      expect(options.lint).toBe(false);
    });

    it('parses --threshold value', () => {
      const options = parseCIArgs('--threshold 80');
      expect(options.coverageThreshold).toBe(80);
    });

    it('parses --node versions', () => {
      const options = parseCIArgs('--node 18,20,22');
      expect(options.nodeVersions).toEqual(['18', '20', '22']);
    });

    it('parses --branches', () => {
      const options = parseCIArgs('--branches main,develop');
      expect(options.branches).toEqual(['main', 'develop']);
    });

    it('parses --output path', () => {
      const options = parseCIArgs('--output custom.yml');
      expect(options.output).toBe('custom.yml');
    });

    it('parses --dry-run flag', () => {
      const options = parseCIArgs('--dry-run');
      expect(options.dryRun).toBe(true);
    });

    it('parses multiple flags', () => {
      const options = parseCIArgs('--both --no-coverage --threshold 90 --dry-run');

      expect(options.type).toBe('both');
      expect(options.coverage).toBe(false);
      expect(options.coverageThreshold).toBe(90);
      expect(options.dryRun).toBe(true);
    });

    it('handles whitespace in args', () => {
      const options = parseCIArgs('  --pr   --dry-run  ');
      expect(options.type).toBe('pr');
      expect(options.dryRun).toBe(true);
    });

    it('ignores unknown flags', () => {
      const options = parseCIArgs('--unknown --pr');
      expect(options.type).toBe('pr');
    });
  });

  describe('generateWorkflows', () => {
    it('generates test workflow', () => {
      const options = {
        type: 'test',
        coverage: true,
        lint: true,
        nodeVersions: ['20'],
        branches: ['main'],
      };

      const workflows = generateWorkflows(options, 'node');

      expect(workflows.test).toBeDefined();
      expect(workflows.test.filename).toBe('test.yml');
      expect(workflows.test.workflow.name).toBe('Tests');
    });

    it('generates PR workflow', () => {
      const options = {
        type: 'pr',
        coverage: true,
        lint: true,
        nodeVersions: ['20'],
        branches: ['main'],
      };

      const workflows = generateWorkflows(options, 'node');

      expect(workflows.pr).toBeDefined();
      expect(workflows.pr.filename).toBe('pr.yml');
      expect(workflows.pr.workflow.name).toBe('PR Tests');
    });

    it('generates both workflows', () => {
      const options = {
        type: 'both',
        coverage: true,
        lint: true,
        nodeVersions: ['20'],
        branches: ['main'],
      };

      const workflows = generateWorkflows(options, 'node');

      expect(workflows.test).toBeDefined();
      expect(workflows.pr).toBeDefined();
    });

    it('returns empty for unknown type', () => {
      const options = {
        type: 'unknown',
        coverage: true,
        lint: true,
        nodeVersions: ['20'],
        branches: ['main'],
      };

      const workflows = generateWorkflows(options, 'node');

      expect(Object.keys(workflows)).toHaveLength(0);
    });

    it('passes options to generators', () => {
      const options = {
        type: 'test',
        coverage: false,
        lint: false,
        nodeVersions: ['18', '20'],
        branches: ['main', 'develop'],
        coverageThreshold: 80,
      };

      const workflows = generateWorkflows(options, 'pnpm');
      const workflow = workflows.test.workflow;

      expect(workflow.jobs.test.strategy.matrix['node-version']).toContain('18');
      expect(workflow.jobs.test.strategy.matrix['node-version']).toContain('20');
    });

    it('uses pnpm package manager', () => {
      const options = {
        type: 'test',
        coverage: true,
        lint: true,
        nodeVersions: ['20'],
        branches: ['main'],
      };

      const workflows = generateWorkflows(options, 'pnpm');
      const steps = workflows.test.workflow.jobs.test.steps;

      expect(steps.some(s => s.uses?.includes('pnpm'))).toBe(true);
    });

    it('includes coverage threshold step', () => {
      const options = {
        type: 'test',
        coverage: true,
        lint: true,
        nodeVersions: ['20'],
        branches: ['main'],
        coverageThreshold: 80,
      };

      const workflows = generateWorkflows(options, 'node');
      const steps = workflows.test.workflow.jobs.test.steps;

      expect(steps.some(s => s.name?.includes('threshold'))).toBe(true);
    });
  });

  describe('formatSummary', () => {
    it('formats basic summary', () => {
      const workflows = {
        test: {
          filename: 'test.yml',
          workflow: {
            name: 'Tests',
            on: { push: {}, pull_request: {} },
            jobs: { test: { steps: [{}, {}, {}] } },
          },
        },
      };

      const options = { coverage: true, lint: true };
      const summary = formatSummary(workflows, 'node', options);

      expect(summary).toContain('GitHub Actions CI Configuration');
      expect(summary).toContain('node');
      expect(summary).toContain('test.yml');
      expect(summary).toContain('Tests');
    });

    it('includes coverage threshold', () => {
      const workflows = {
        test: {
          filename: 'test.yml',
          workflow: {
            name: 'Tests',
            on: { push: {} },
            jobs: { test: { steps: [] } },
          },
        },
      };

      const options = { coverage: true, lint: true, coverageThreshold: 80 };
      const summary = formatSummary(workflows, 'node', options);

      expect(summary).toContain('80%');
    });

    it('shows node versions', () => {
      const workflows = {
        test: {
          filename: 'test.yml',
          workflow: {
            name: 'Tests',
            on: { push: {} },
            jobs: {
              test: {
                strategy: { matrix: { 'node-version': ['18', '20'] } },
                steps: [],
              },
            },
          },
        },
      };

      const summary = formatSummary(workflows, 'node', { coverage: true, lint: true });

      expect(summary).toContain('18');
      expect(summary).toContain('20');
    });

    it('shows triggers', () => {
      const workflows = {
        pr: {
          filename: 'pr.yml',
          workflow: {
            name: 'PR Tests',
            on: { pull_request: {} },
            jobs: { test: { steps: [] } },
          },
        },
      };

      const summary = formatSummary(workflows, 'node', { coverage: true, lint: true });

      expect(summary).toContain('pull_request');
    });

    it('shows disabled coverage', () => {
      const workflows = {
        test: {
          filename: 'test.yml',
          workflow: {
            name: 'Tests',
            on: { push: {} },
            jobs: { test: { steps: [] } },
          },
        },
      };

      const summary = formatSummary(workflows, 'node', { coverage: false, lint: true });

      expect(summary).toContain('Disabled');
    });

    it('formats multiple workflows', () => {
      const workflows = {
        test: {
          filename: 'test.yml',
          workflow: { name: 'Tests', on: {}, jobs: { test: { steps: [] } } },
        },
        pr: {
          filename: 'pr.yml',
          workflow: { name: 'PR Tests', on: {}, jobs: { test: { steps: [] } } },
        },
      };

      const summary = formatSummary(workflows, 'node', { coverage: true, lint: true });

      expect(summary).toContain('test.yml');
      expect(summary).toContain('pr.yml');
    });
  });

  describe('createCICommand', () => {
    it('creates command handler', () => {
      const handler = createCICommand();

      expect(handler.execute).toBeDefined();
      expect(handler.parseArgs).toBeDefined();
      expect(handler.detectProjectFiles).toBeDefined();
      expect(handler.generateWorkflows).toBeDefined();
    });

    it('exposes parseArgs function', () => {
      const handler = createCICommand();
      const options = handler.parseArgs('--pr --dry-run');

      expect(options.type).toBe('pr');
      expect(options.dryRun).toBe(true);
    });

    it('exposes generateWorkflows function', () => {
      const handler = createCICommand();
      const workflows = handler.generateWorkflows({
        type: 'test',
        coverage: true,
        lint: true,
        nodeVersions: ['20'],
        branches: ['main'],
      }, 'node');

      expect(workflows.test).toBeDefined();
    });

    it('exposes detectPackageManager function', () => {
      const handler = createCICommand();
      const pm = handler.detectPackageManager({ 'pnpm-lock.yaml': true });

      expect(pm).toBe('pnpm');
    });
  });
});
