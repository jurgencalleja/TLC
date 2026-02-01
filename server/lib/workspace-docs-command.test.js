import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { WorkspaceDocsCommand } = await import('./workspace-docs-command.js');

describe('WorkspaceDocsCommand', () => {
  let tempDir;
  let command;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-docs-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create a mock repo with package.json
   */
  function createRepo(name, options = {}) {
    const repoPath = path.join(tempDir, name);
    fs.mkdirSync(repoPath, { recursive: true });

    fs.writeFileSync(
      path.join(repoPath, 'package.json'),
      JSON.stringify({
        name: options.packageName || name,
        version: options.version || '1.0.0',
        description: options.description || `${name} service`,
        scripts: options.scripts || { test: 'echo "pass"', start: 'node index.js' },
        dependencies: options.dependencies || {},
      }, null, 2)
    );

    // Create .tlc.json for initialized repos
    if (options.hasTlc !== false) {
      fs.writeFileSync(
        path.join(repoPath, '.tlc.json'),
        JSON.stringify({ project: name }, null, 2)
      );
    }

    // Create .env.example if requested
    if (options.envVars) {
      const envContent = Object.entries(options.envVars)
        .map(([key, val]) => `${key}=${val}`)
        .join('\n');
      fs.writeFileSync(path.join(repoPath, '.env.example'), envContent);
    }

    // Create src/index.js if requested
    if (options.hasIndex) {
      fs.mkdirSync(path.join(repoPath, 'src'), { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, 'src', 'index.js'),
        options.indexContent || 'module.exports = {};'
      );
    }

    return repoPath;
  }

  /**
   * Helper to create workspace config
   */
  function initWorkspace(repos) {
    const config = {
      root: tempDir,
      repos: repos,
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(
      path.join(tempDir, '.tlc-workspace.json'),
      JSON.stringify(config, null, 2)
    );
    return config;
  }

  describe('constructor', () => {
    it('loads workspace config from root directory', () => {
      createRepo('repo-a');
      initWorkspace(['repo-a']);

      command = new WorkspaceDocsCommand(tempDir);

      expect(command.isWorkspaceInitialized()).toBe(true);
    });

    it('handles missing workspace config', () => {
      command = new WorkspaceDocsCommand(tempDir);

      expect(command.isWorkspaceInitialized()).toBe(false);
    });
  });

  describe('readme', () => {
    it('generates READMEs for all workspace repos', async () => {
      createRepo('service-a', { description: 'Service A handles auth' });
      createRepo('service-b', { description: 'Service B handles data' });
      initWorkspace(['service-a', 'service-b']);

      command = new WorkspaceDocsCommand(tempDir);
      const result = await command.readme();

      expect(result.success).toBe(true);
      expect(result.generated).toHaveLength(2);
      expect(result.generated).toContain('service-a');
      expect(result.generated).toContain('service-b');
    });

    it('writes README.md files to each repo', async () => {
      createRepo('my-service', { description: 'My awesome service' });
      initWorkspace(['my-service']);

      command = new WorkspaceDocsCommand(tempDir);
      await command.readme();

      const readmePath = path.join(tempDir, 'my-service', 'README.md');
      expect(fs.existsSync(readmePath)).toBe(true);

      const content = fs.readFileSync(readmePath, 'utf-8');
      expect(content).toContain('# my-service');
      expect(content).toContain('My awesome service');
    });

    it('respects output directory option', async () => {
      createRepo('api-service');
      initWorkspace(['api-service']);
      const outputDir = path.join(tempDir, 'generated-docs');

      command = new WorkspaceDocsCommand(tempDir);
      const result = await command.readme({ outputDir });

      const readmePath = path.join(outputDir, 'api-service', 'README.md');
      expect(fs.existsSync(readmePath)).toBe(true);
    });

    it('handles empty workspace', async () => {
      initWorkspace([]);

      command = new WorkspaceDocsCommand(tempDir);
      const result = await command.readme();

      expect(result.success).toBe(true);
      expect(result.generated).toHaveLength(0);
      expect(result.message).toContain('No repos');
    });

    it('throws if workspace not initialized', async () => {
      command = new WorkspaceDocsCommand(tempDir);

      await expect(command.readme()).rejects.toThrow(/not initialized/i);
    });
  });

  describe('flow', () => {
    it('generates cross-repo flow diagrams', async () => {
      createRepo('frontend', {
        hasIndex: true,
        indexContent: `
          const api = require('workspace:api-service');
          fetch('http://api-service:3000/users');
        `,
      });
      createRepo('api-service', { hasIndex: true });
      initWorkspace(['frontend', 'api-service']);

      command = new WorkspaceDocsCommand(tempDir);
      const result = await command.flow();

      expect(result.success).toBe(true);
      expect(result.diagram).toContain('flowchart');
    });

    it('writes flow diagram to file', async () => {
      createRepo('service-a', { hasIndex: true });
      createRepo('service-b', { hasIndex: true });
      initWorkspace(['service-a', 'service-b']);

      command = new WorkspaceDocsCommand(tempDir);
      await command.flow();

      const diagramPath = path.join(tempDir, '.planning', 'workspace-flow.md');
      expect(fs.existsSync(diagramPath)).toBe(true);
    });

    it('respects output directory option', async () => {
      createRepo('svc');
      initWorkspace(['svc']);
      const outputDir = path.join(tempDir, 'diagrams');

      command = new WorkspaceDocsCommand(tempDir);
      await command.flow({ outputDir });

      const diagramPath = path.join(outputDir, 'workspace-flow.md');
      expect(fs.existsSync(diagramPath)).toBe(true);
    });

    it('handles empty workspace', async () => {
      initWorkspace([]);

      command = new WorkspaceDocsCommand(tempDir);
      const result = await command.flow();

      expect(result.success).toBe(true);
      expect(result.diagram).toContain('No cross-repo communication');
    });
  });

  describe('summary', () => {
    it('generates service summaries for all repos', async () => {
      createRepo('auth-service', {
        description: 'Handles authentication',
        hasIndex: true,
        indexContent: 'module.exports = { authenticate, authorize };',
      });
      createRepo('user-service', {
        description: 'Manages users',
        hasIndex: true,
      });
      initWorkspace(['auth-service', 'user-service']);

      command = new WorkspaceDocsCommand(tempDir);
      const result = await command.summary();

      expect(result.success).toBe(true);
      expect(result.summaries).toHaveLength(2);
    });

    it('writes SERVICE-SUMMARY.md to each repo', async () => {
      createRepo('data-service', { description: 'Data processing service' });
      initWorkspace(['data-service']);

      command = new WorkspaceDocsCommand(tempDir);
      await command.summary();

      const summaryPath = path.join(tempDir, 'data-service', 'SERVICE-SUMMARY.md');
      expect(fs.existsSync(summaryPath)).toBe(true);

      const content = fs.readFileSync(summaryPath, 'utf-8');
      expect(content).toContain('# data-service');
      expect(content).toContain('Data processing service');
    });

    it('respects output directory option', async () => {
      createRepo('api');
      initWorkspace(['api']);
      const outputDir = path.join(tempDir, 'summaries');

      command = new WorkspaceDocsCommand(tempDir);
      await command.summary({ outputDir });

      const summaryPath = path.join(outputDir, 'api', 'SERVICE-SUMMARY.md');
      expect(fs.existsSync(summaryPath)).toBe(true);
    });

    it('handles empty workspace', async () => {
      initWorkspace([]);

      command = new WorkspaceDocsCommand(tempDir);
      const result = await command.summary();

      expect(result.success).toBe(true);
      expect(result.summaries).toHaveLength(0);
    });
  });

  describe('adr', () => {
    describe('create', () => {
      it('creates new ADR with prompts', async () => {
        initWorkspace([]);

        command = new WorkspaceDocsCommand(tempDir);
        const result = await command.adr({
          action: 'create',
          title: 'Use PostgreSQL for data storage',
          context: 'We need a reliable database',
          decision: 'Use PostgreSQL',
          consequences: 'Need to manage PostgreSQL infrastructure',
        });

        expect(result.success).toBe(true);
        expect(result.adr.number).toBe('0001');
        expect(result.adr.title).toBe('Use PostgreSQL for data storage');
      });

      it('auto-numbers ADRs sequentially', async () => {
        initWorkspace([]);
        const adrDir = path.join(tempDir, '.planning', 'adr');
        fs.mkdirSync(adrDir, { recursive: true });
        fs.writeFileSync(
          path.join(adrDir, '0001-first-decision.md'),
          '# ADR 0001: First Decision\n**Status:** accepted\n'
        );

        command = new WorkspaceDocsCommand(tempDir);
        const result = await command.adr({
          action: 'create',
          title: 'Second Decision',
          context: 'Context',
          decision: 'Decision',
          consequences: 'Consequences',
        });

        expect(result.adr.number).toBe('0002');
      });

      it('writes ADR file to .planning/adr/', async () => {
        initWorkspace([]);

        command = new WorkspaceDocsCommand(tempDir);
        await command.adr({
          action: 'create',
          title: 'Choose TypeScript',
          context: 'Need type safety',
          decision: 'Use TypeScript',
          consequences: 'Compile step required',
        });

        const adrDir = path.join(tempDir, '.planning', 'adr');
        const files = fs.readdirSync(adrDir);
        expect(files).toHaveLength(1);
        expect(files[0]).toMatch(/^0001-choose-typescript\.md$/);
      });
    });

    describe('list', () => {
      it('lists existing ADRs', async () => {
        initWorkspace([]);
        const adrDir = path.join(tempDir, '.planning', 'adr');
        fs.mkdirSync(adrDir, { recursive: true });
        fs.writeFileSync(
          path.join(adrDir, '0001-use-docker.md'),
          '# ADR 0001: Use Docker\n\n**Date:** 2024-01-15\n**Status:** accepted\n\n## Context\n\nNeed containerization\n\n## Decision\n\nUse Docker\n\n## Consequences\n\nNeed Docker installed\n'
        );
        fs.writeFileSync(
          path.join(adrDir, '0002-use-kubernetes.md'),
          '# ADR 0002: Use Kubernetes\n\n**Date:** 2024-01-20\n**Status:** proposed\n\n## Context\n\nNeed orchestration\n\n## Decision\n\nUse K8s\n\n## Consequences\n\nComplex setup\n'
        );

        command = new WorkspaceDocsCommand(tempDir);
        const result = await command.adr({ action: 'list' });

        expect(result.success).toBe(true);
        expect(result.adrs).toHaveLength(2);
        expect(result.adrs[0].number).toBe('0001');
        expect(result.adrs[0].title).toBe('Use Docker');
        expect(result.adrs[0].status).toBe('accepted');
        expect(result.adrs[1].number).toBe('0002');
        expect(result.adrs[1].status).toBe('proposed');
      });

      it('returns empty array when no ADRs exist', async () => {
        initWorkspace([]);

        command = new WorkspaceDocsCommand(tempDir);
        const result = await command.adr({ action: 'list' });

        expect(result.success).toBe(true);
        expect(result.adrs).toHaveLength(0);
      });
    });

    it('defaults to list action', async () => {
      initWorkspace([]);

      command = new WorkspaceDocsCommand(tempDir);
      const result = await command.adr({});

      expect(result.success).toBe(true);
      expect(result.adrs).toBeDefined();
    });
  });

  describe('all', () => {
    it('generates all documentation at once', async () => {
      createRepo('main-service', {
        description: 'Main service',
        hasIndex: true,
      });
      initWorkspace(['main-service']);

      command = new WorkspaceDocsCommand(tempDir);
      const result = await command.all();

      expect(result.success).toBe(true);
      expect(result.readme).toBeDefined();
      expect(result.flow).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('writes all doc files', async () => {
      createRepo('svc', { description: 'A service', hasIndex: true });
      initWorkspace(['svc']);

      command = new WorkspaceDocsCommand(tempDir);
      await command.all();

      // README
      expect(fs.existsSync(path.join(tempDir, 'svc', 'README.md'))).toBe(true);

      // Flow diagram
      expect(fs.existsSync(path.join(tempDir, '.planning', 'workspace-flow.md'))).toBe(true);

      // Summary
      expect(fs.existsSync(path.join(tempDir, 'svc', 'SERVICE-SUMMARY.md'))).toBe(true);
    });

    it('respects output directory option', async () => {
      createRepo('app');
      initWorkspace(['app']);
      const outputDir = path.join(tempDir, 'all-docs');

      command = new WorkspaceDocsCommand(tempDir);
      await command.all({ outputDir });

      expect(fs.existsSync(path.join(outputDir, 'app', 'README.md'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'workspace-flow.md'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'app', 'SERVICE-SUMMARY.md'))).toBe(true);
    });

    it('handles empty workspace', async () => {
      initWorkspace([]);

      command = new WorkspaceDocsCommand(tempDir);
      const result = await command.all();

      expect(result.success).toBe(true);
      expect(result.readme.generated).toHaveLength(0);
      expect(result.summary.summaries).toHaveLength(0);
    });
  });

  describe('parseArgs', () => {
    it('parses --docs readme', () => {
      command = new WorkspaceDocsCommand(tempDir);
      const options = command.parseArgs('--docs readme');

      expect(options.docsType).toBe('readme');
    });

    it('parses --docs flow', () => {
      command = new WorkspaceDocsCommand(tempDir);
      const options = command.parseArgs('--docs flow');

      expect(options.docsType).toBe('flow');
    });

    it('parses --docs summary', () => {
      command = new WorkspaceDocsCommand(tempDir);
      const options = command.parseArgs('--docs summary');

      expect(options.docsType).toBe('summary');
    });

    it('parses --docs adr', () => {
      command = new WorkspaceDocsCommand(tempDir);
      const options = command.parseArgs('--docs adr');

      expect(options.docsType).toBe('adr');
    });

    it('parses --docs all', () => {
      command = new WorkspaceDocsCommand(tempDir);
      const options = command.parseArgs('--docs all');

      expect(options.docsType).toBe('all');
    });

    it('parses --output option', () => {
      command = new WorkspaceDocsCommand(tempDir);
      const options = command.parseArgs('--docs readme --output /path/to/output');

      expect(options.outputDir).toBe('/path/to/output');
    });

    it('parses -o shorthand for output', () => {
      command = new WorkspaceDocsCommand(tempDir);
      const options = command.parseArgs('--docs readme -o ./docs');

      expect(options.outputDir).toBe('./docs');
    });

    it('parses ADR action flags', () => {
      command = new WorkspaceDocsCommand(tempDir);

      const createOpts = command.parseArgs('--docs adr --create');
      expect(createOpts.adrAction).toBe('create');

      const listOpts = command.parseArgs('--docs adr --list');
      expect(listOpts.adrAction).toBe('list');
    });

    it('parses ADR create options', () => {
      command = new WorkspaceDocsCommand(tempDir);
      const options = command.parseArgs(
        '--docs adr --create --title "Use Redis" --context "Need caching" --decision "Redis" --consequences "Memory usage"'
      );

      expect(options.adrAction).toBe('create');
      expect(options.title).toBe('Use Redis');
      expect(options.context).toBe('Need caching');
      expect(options.decision).toBe('Redis');
      expect(options.consequences).toBe('Memory usage');
    });

    it('parses --help flag', () => {
      command = new WorkspaceDocsCommand(tempDir);
      const options = command.parseArgs('--help');

      expect(options.help).toBe(true);
    });
  });

  describe('run', () => {
    it('executes readme command from args', async () => {
      createRepo('test-svc', { description: 'Test service' });
      initWorkspace(['test-svc']);

      command = new WorkspaceDocsCommand(tempDir);
      const result = await command.run('--docs readme');

      expect(result.success).toBe(true);
      expect(result.generated).toBeDefined();
    });

    it('executes flow command from args', async () => {
      createRepo('svc');
      initWorkspace(['svc']);

      command = new WorkspaceDocsCommand(tempDir);
      const result = await command.run('--docs flow');

      expect(result.success).toBe(true);
      expect(result.diagram).toBeDefined();
    });

    it('executes summary command from args', async () => {
      createRepo('svc', { description: 'A service' });
      initWorkspace(['svc']);

      command = new WorkspaceDocsCommand(tempDir);
      const result = await command.run('--docs summary');

      expect(result.success).toBe(true);
      expect(result.summaries).toBeDefined();
    });

    it('executes adr list command from args', async () => {
      initWorkspace([]);

      command = new WorkspaceDocsCommand(tempDir);
      const result = await command.run('--docs adr --list');

      expect(result.success).toBe(true);
      expect(result.adrs).toBeDefined();
    });

    it('executes adr create command from args', async () => {
      initWorkspace([]);

      command = new WorkspaceDocsCommand(tempDir);
      const result = await command.run(
        '--docs adr --create --title "Test ADR" --context "Test context" --decision "Test decision" --consequences "Test consequences"'
      );

      expect(result.success).toBe(true);
      expect(result.adr).toBeDefined();
    });

    it('executes all command from args', async () => {
      createRepo('svc', { description: 'Service' });
      initWorkspace(['svc']);

      command = new WorkspaceDocsCommand(tempDir);
      const result = await command.run('--docs all');

      expect(result.success).toBe(true);
      expect(result.readme).toBeDefined();
      expect(result.flow).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('passes output directory to commands', async () => {
      createRepo('svc');
      initWorkspace(['svc']);
      const outputDir = path.join(tempDir, 'custom-output');

      command = new WorkspaceDocsCommand(tempDir);
      await command.run(`--docs readme --output ${outputDir}`);

      expect(fs.existsSync(path.join(outputDir, 'svc', 'README.md'))).toBe(true);
    });

    it('returns help text for --help flag', async () => {
      command = new WorkspaceDocsCommand(tempDir);
      const result = await command.run('--help');

      expect(result.success).toBe(true);
      expect(result.message).toContain('--docs');
      expect(result.message).toContain('readme');
      expect(result.message).toContain('flow');
      expect(result.message).toContain('summary');
      expect(result.message).toContain('adr');
      expect(result.message).toContain('all');
    });

    it('returns error for unknown docs type', async () => {
      initWorkspace([]);

      command = new WorkspaceDocsCommand(tempDir);
      const result = await command.run('--docs unknown');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown docs type');
    });

    it('defaults to help when no args provided', async () => {
      command = new WorkspaceDocsCommand(tempDir);
      const result = await command.run('');

      expect(result.success).toBe(true);
      expect(result.message).toContain('--docs');
    });
  });

  describe('getHelpText', () => {
    it('returns usage information', () => {
      command = new WorkspaceDocsCommand(tempDir);
      const help = command.getHelpText();

      expect(help).toContain('Usage:');
      expect(help).toContain('--docs');
      expect(help).toContain('--output');
    });

    it('documents all docs types', () => {
      command = new WorkspaceDocsCommand(tempDir);
      const help = command.getHelpText();

      expect(help).toContain('readme');
      expect(help).toContain('flow');
      expect(help).toContain('summary');
      expect(help).toContain('adr');
      expect(help).toContain('all');
    });

    it('documents ADR options', () => {
      command = new WorkspaceDocsCommand(tempDir);
      const help = command.getHelpText();

      expect(help).toContain('--create');
      expect(help).toContain('--list');
      expect(help).toContain('--title');
      expect(help).toContain('--context');
      expect(help).toContain('--decision');
      expect(help).toContain('--consequences');
    });

    it('includes examples', () => {
      command = new WorkspaceDocsCommand(tempDir);
      const help = command.getHelpText();

      expect(help).toContain('Examples:');
    });
  });

  describe('error handling', () => {
    it('handles workspace not initialized for all commands', async () => {
      command = new WorkspaceDocsCommand(tempDir);

      await expect(command.readme()).rejects.toThrow(/not initialized/i);
      await expect(command.flow()).rejects.toThrow(/not initialized/i);
      await expect(command.summary()).rejects.toThrow(/not initialized/i);
      await expect(command.all()).rejects.toThrow(/not initialized/i);
    });

    it('handles missing repo directory gracefully', async () => {
      initWorkspace(['nonexistent-repo']);

      command = new WorkspaceDocsCommand(tempDir);
      const result = await command.readme();

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('nonexistent-repo');
    });
  });
});
