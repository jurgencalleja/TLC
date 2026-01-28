import { describe, it, expect } from 'vitest';
import {
  TEST_COMMANDS,
  NODE_VERSIONS,
  detectPackageManager,
  generateCheckoutStep,
  generateNodeSetupStep,
  generatePnpmSetupStep,
  generatePythonSetupStep,
  generateGoSetupStep,
  generateInstallStep,
  generateTestStep,
  generateLintStep,
  generateCoverageUploadStep,
  generatePRCommentStep,
  generateCoverageThresholdStep,
  generateTestWorkflow,
  generatePRWorkflow,
  serializeWorkflow,
  yamlSerialize,
  createGitHubActionsGenerator,
} from './github-actions.js';

describe('github-actions', () => {
  describe('TEST_COMMANDS', () => {
    it('has node commands', () => {
      expect(TEST_COMMANDS.node.install).toBe('npm ci');
      expect(TEST_COMMANDS.node.test).toBe('npm test');
    });

    it('has pnpm commands', () => {
      expect(TEST_COMMANDS.pnpm.install).toContain('pnpm');
    });

    it('has python commands', () => {
      expect(TEST_COMMANDS.python.test).toBe('pytest');
    });

    it('has go commands', () => {
      expect(TEST_COMMANDS.go.test).toContain('go test');
    });
  });

  describe('NODE_VERSIONS', () => {
    it('includes LTS versions', () => {
      expect(NODE_VERSIONS).toContain('18');
      expect(NODE_VERSIONS).toContain('20');
    });
  });

  describe('detectPackageManager', () => {
    it('detects pnpm', () => {
      expect(detectPackageManager({ 'pnpm-lock.yaml': true })).toBe('pnpm');
    });

    it('detects yarn', () => {
      expect(detectPackageManager({ 'yarn.lock': true })).toBe('yarn');
    });

    it('detects npm', () => {
      expect(detectPackageManager({ 'package-lock.json': true })).toBe('node');
    });

    it('detects python', () => {
      expect(detectPackageManager({ 'requirements.txt': true })).toBe('python');
      expect(detectPackageManager({ 'pyproject.toml': true })).toBe('python');
    });

    it('detects go', () => {
      expect(detectPackageManager({ 'go.mod': true })).toBe('go');
    });

    it('defaults to node', () => {
      expect(detectPackageManager({})).toBe('node');
    });
  });

  describe('generateCheckoutStep', () => {
    it('generates checkout action', () => {
      const step = generateCheckoutStep();

      expect(step.name).toBe('Checkout code');
      expect(step.uses).toContain('actions/checkout');
    });
  });

  describe('generateNodeSetupStep', () => {
    it('generates node setup with version', () => {
      const step = generateNodeSetupStep('20');

      expect(step.uses).toContain('actions/setup-node');
      expect(step.with['node-version']).toBe('20');
    });

    it('sets cache for npm', () => {
      const step = generateNodeSetupStep('20', 'node');
      expect(step.with.cache).toBe('npm');
    });

    it('sets cache for pnpm', () => {
      const step = generateNodeSetupStep('20', 'pnpm');
      expect(step.with.cache).toBe('pnpm');
    });

    it('sets cache for yarn', () => {
      const step = generateNodeSetupStep('20', 'yarn');
      expect(step.with.cache).toBe('yarn');
    });
  });

  describe('generatePnpmSetupStep', () => {
    it('generates pnpm setup', () => {
      const step = generatePnpmSetupStep();

      expect(step.uses).toContain('pnpm/action-setup');
      expect(step.with.version).toBeDefined();
    });
  });

  describe('generatePythonSetupStep', () => {
    it('generates python setup', () => {
      const step = generatePythonSetupStep('3.11');

      expect(step.uses).toContain('actions/setup-python');
      expect(step.with['python-version']).toBe('3.11');
    });
  });

  describe('generateGoSetupStep', () => {
    it('generates go setup', () => {
      const step = generateGoSetupStep('1.21');

      expect(step.uses).toContain('actions/setup-go');
      expect(step.with['go-version']).toBe('1.21');
    });
  });

  describe('generateInstallStep', () => {
    it('generates npm install', () => {
      const step = generateInstallStep('node');
      expect(step.run).toBe('npm ci');
    });

    it('generates pnpm install', () => {
      const step = generateInstallStep('pnpm');
      expect(step.run).toContain('pnpm install');
    });

    it('generates pip install', () => {
      const step = generateInstallStep('python');
      expect(step.run).toContain('pip install');
    });
  });

  describe('generateTestStep', () => {
    it('generates test command', () => {
      const step = generateTestStep('node', false);
      expect(step.run).toBe('npm test');
    });

    it('generates coverage command', () => {
      const step = generateTestStep('node', true);
      expect(step.run).toContain('coverage');
    });
  });

  describe('generateLintStep', () => {
    it('generates lint command', () => {
      const step = generateLintStep('node');
      expect(step.run).toContain('lint');
    });
  });

  describe('generateCoverageUploadStep', () => {
    it('generates codecov upload', () => {
      const step = generateCoverageUploadStep({ service: 'codecov' });
      expect(step.uses).toContain('codecov');
    });

    it('generates artifact upload fallback', () => {
      const step = generateCoverageUploadStep({ service: 'artifact' });
      expect(step.uses).toContain('upload-artifact');
    });
  });

  describe('generatePRCommentStep', () => {
    it('generates PR comment action', () => {
      const step = generatePRCommentStep('Test passed');

      expect(step.uses).toContain('github-script');
      expect(step.with.script).toContain('createComment');
    });

    it('only runs on pull requests', () => {
      const step = generatePRCommentStep('Test');
      expect(step.if).toContain('pull_request');
    });
  });

  describe('generateCoverageThresholdStep', () => {
    it('generates threshold check', () => {
      const step = generateCoverageThresholdStep(80);

      expect(step.run).toContain('80');
      expect(step.run).toContain('coverage');
    });

    it('uses custom threshold', () => {
      const step = generateCoverageThresholdStep(90);
      expect(step.run).toContain('90');
    });
  });

  describe('generateTestWorkflow', () => {
    it('generates complete workflow', () => {
      const workflow = generateTestWorkflow();

      expect(workflow.name).toBe('Tests');
      expect(workflow.on.push).toBeDefined();
      expect(workflow.on.pull_request).toBeDefined();
      expect(workflow.jobs.test).toBeDefined();
    });

    it('includes matrix for node versions', () => {
      const workflow = generateTestWorkflow({ nodeVersions: ['18', '20'] });

      expect(workflow.jobs.test.strategy.matrix['node-version']).toContain('18');
      expect(workflow.jobs.test.strategy.matrix['node-version']).toContain('20');
    });

    it('includes coverage steps when enabled', () => {
      const workflow = generateTestWorkflow({ withCoverage: true });
      const steps = workflow.jobs.test.steps;

      expect(steps.some(s => s.name?.includes('coverage'))).toBe(true);
    });

    it('includes lint step when enabled', () => {
      const workflow = generateTestWorkflow({ withLint: true });
      const steps = workflow.jobs.test.steps;

      expect(steps.some(s => s.name === 'Lint code')).toBe(true);
    });

    it('excludes lint step when disabled', () => {
      const workflow = generateTestWorkflow({ withLint: false });
      const steps = workflow.jobs.test.steps;

      expect(steps.some(s => s.name === 'Lint code')).toBe(false);
    });

    it('includes coverage threshold when specified', () => {
      const workflow = generateTestWorkflow({ coverageThreshold: 80 });
      const steps = workflow.jobs.test.steps;

      expect(steps.some(s => s.name?.includes('threshold'))).toBe(true);
    });
  });

  describe('generatePRWorkflow', () => {
    it('generates PR workflow', () => {
      const workflow = generatePRWorkflow();

      expect(workflow.name).toBe('PR Tests');
      expect(workflow.on.pull_request).toBeDefined();
    });

    it('sets permissions', () => {
      const workflow = generatePRWorkflow();

      expect(workflow.jobs.test.permissions).toBeDefined();
      expect(workflow.jobs.test.permissions['pull-requests']).toBe('write');
    });

    it('includes test report step', () => {
      const workflow = generatePRWorkflow({ reportToComment: true });
      const steps = workflow.jobs.test.steps;

      expect(steps.some(s => s.name?.includes('report'))).toBe(true);
    });
  });

  describe('yamlSerialize', () => {
    it('serializes primitives', () => {
      expect(yamlSerialize(null)).toBe('null');
      expect(yamlSerialize(true)).toBe('true');
      expect(yamlSerialize(42)).toBe('42');
    });

    it('serializes simple strings', () => {
      expect(yamlSerialize('hello')).toBe('hello');
    });

    it('quotes strings with special chars', () => {
      expect(yamlSerialize('key: value')).toContain("'");
      expect(yamlSerialize('$VAR')).toContain("'");
    });

    it('handles multiline strings', () => {
      const result = yamlSerialize('line1\nline2');
      expect(result).toContain('|');
    });

    it('serializes arrays', () => {
      const result = yamlSerialize(['a', 'b']);
      expect(result).toContain('- a');
      expect(result).toContain('- b');
    });

    it('serializes objects', () => {
      const result = yamlSerialize({ key: 'value' });
      expect(result).toContain('key: value');
    });
  });

  describe('serializeWorkflow', () => {
    it('serializes workflow to YAML', () => {
      const workflow = generateTestWorkflow();
      const yaml = serializeWorkflow(workflow);

      expect(yaml).toContain('name: Tests');
      expect(yaml).toContain('on:');
      expect(yaml).toContain('jobs:');
    });
  });

  describe('createGitHubActionsGenerator', () => {
    it('creates generator with methods', () => {
      const generator = createGitHubActionsGenerator();

      expect(generator.detectPackageManager).toBeDefined();
      expect(generator.generateTestWorkflow).toBeDefined();
      expect(generator.generatePRWorkflow).toBeDefined();
      expect(generator.serializeWorkflow).toBeDefined();
    });

    it('has step generators', () => {
      const generator = createGitHubActionsGenerator();

      expect(generator.steps.checkout).toBeDefined();
      expect(generator.steps.nodeSetup).toBeDefined();
      expect(generator.steps.test).toBeDefined();
    });

    it('uses provided options', () => {
      const generator = createGitHubActionsGenerator({ packageManager: 'pnpm' });
      const workflow = generator.generateTestWorkflow();

      const steps = workflow.jobs.test.steps;
      expect(steps.some(s => s.uses?.includes('pnpm'))).toBe(true);
    });
  });
});
