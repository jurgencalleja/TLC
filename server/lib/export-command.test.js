import { describe, it, expect } from 'vitest';
import {
  parseExportArgs,
  loadProjectConfig,
  formatToolList,
  formatDetectionResult,
  formatExportSummary,
  executeExportCommand,
  createExportCommand,
} from './export-command.js';
import { SUPPORTED_TOOLS } from './tool-rules.js';
import { AI_TOOLS } from './tool-detector.js';

describe('export-command', () => {
  describe('parseExportArgs', () => {
    it('returns defaults for empty args', () => {
      const options = parseExportArgs('');

      expect(options.tools).toEqual([]);
      expect(options.projectName).toBeNull();
      expect(options.testFramework).toBeNull();
      expect(options.output).toBeNull();
      expect(options.dryRun).toBe(false);
      expect(options.detect).toBe(false);
      expect(options.list).toBe(false);
    });

    it('parses --all flag', () => {
      const options = parseExportArgs('--all');
      expect(options.tools.length).toBe(9);
    });

    it('parses all as action', () => {
      const options = parseExportArgs('all');
      expect(options.tools.length).toBe(9);
    });

    it('parses --tool flag', () => {
      const options = parseExportArgs('--tool cursor');
      expect(options.tools).toContain('cursor');
    });

    it('parses multiple --tool flags', () => {
      const options = parseExportArgs('--tool cursor --tool copilot');

      expect(options.tools).toContain('cursor');
      expect(options.tools).toContain('copilot');
    });

    it('parses direct tool name', () => {
      const options = parseExportArgs('cursor');
      expect(options.tools).toContain('cursor');
    });

    it('parses --project flag', () => {
      const options = parseExportArgs('--project MyApp');
      expect(options.projectName).toBe('MyApp');
    });

    it('parses --framework flag', () => {
      const options = parseExportArgs('--framework jest');
      expect(options.testFramework).toBe('jest');
    });

    it('parses --output flag', () => {
      const options = parseExportArgs('--output /tmp/output');
      expect(options.output).toBe('/tmp/output');
    });

    it('parses --dry-run flag', () => {
      const options = parseExportArgs('--dry-run');
      expect(options.dryRun).toBe(true);
    });

    it('parses --detect flag', () => {
      const options = parseExportArgs('--detect');
      expect(options.detect).toBe(true);
    });

    it('parses --list flag', () => {
      const options = parseExportArgs('--list');
      expect(options.list).toBe(true);
    });

    it('parses multiple flags together', () => {
      const options = parseExportArgs('cursor --project Test --dry-run');

      expect(options.tools).toContain('cursor');
      expect(options.projectName).toBe('Test');
      expect(options.dryRun).toBe(true);
    });
  });

  describe('loadProjectConfig', () => {
    it('returns defaults for non-existent directory', () => {
      const config = loadProjectConfig('/nonexistent/path');

      expect(config.projectName).toBe('Project');
      expect(config.testFramework).toBe('vitest');
    });
  });

  describe('formatToolList', () => {
    it('generates tool list markdown', () => {
      const output = formatToolList();

      expect(output).toContain('# Supported AI Tools');
      expect(output).toContain('| Tool | File Path |');
    });

    it('includes all tools', () => {
      const output = formatToolList();

      expect(output).toContain('Cursor');
      expect(output).toContain('Copilot');
      expect(output).toContain('Aider');
      expect(output).toContain('AGENTS.md');
    });

    it('includes file paths', () => {
      const output = formatToolList();

      expect(output).toContain('.cursor/rules/tlc.mdc');
      expect(output).toContain('.github/copilot-instructions.md');
      expect(output).toContain('.aider.conf.yml');
    });

    it('includes usage examples', () => {
      const output = formatToolList();

      expect(output).toContain('Usage');
      expect(output).toContain('/tlc:export all');
      expect(output).toContain('/tlc:export cursor');
      expect(output).toContain('--detect');
    });
  });

  describe('formatDetectionResult', () => {
    it('formats unknown detection', () => {
      const detection = {
        primaryTool: AI_TOOLS.UNKNOWN,
        confidence: 0,
        allDetected: [],
        sources: { environment: [], process: [], configFiles: [] },
      };

      const output = formatDetectionResult(detection);

      expect(output).toContain('AI Tool Detection');
      expect(output).toContain('No AI tool detected');
    });

    it('formats detected tool', () => {
      const detection = {
        primaryTool: AI_TOOLS.CURSOR,
        confidence: 75,
        allDetected: [{ tool: AI_TOOLS.CURSOR, confidence: 75 }],
        sources: {
          environment: [AI_TOOLS.CURSOR],
          process: [AI_TOOLS.CURSOR],
          configFiles: [],
        },
      };

      const output = formatDetectionResult(detection);

      expect(output).toContain('Cursor');
      expect(output).toContain('75%');
      expect(output).toContain('Detection Sources');
    });

    it('formats multiple detected tools', () => {
      const detection = {
        primaryTool: AI_TOOLS.CURSOR,
        confidence: 75,
        allDetected: [
          { tool: AI_TOOLS.CURSOR, confidence: 75 },
          { tool: AI_TOOLS.COPILOT, confidence: 40 },
        ],
        sources: {
          environment: [AI_TOOLS.CURSOR, AI_TOOLS.COPILOT],
          process: [AI_TOOLS.CURSOR],
          configFiles: [],
        },
      };

      const output = formatDetectionResult(detection);

      expect(output).toContain('All Detected Tools');
      expect(output).toContain('Cursor');
      expect(output).toContain('GitHub Copilot');
    });
  });

  describe('formatExportSummary', () => {
    it('formats export summary', () => {
      const result = {
        projectName: 'TestProject',
        testFramework: 'vitest',
        files: [
          { path: 'AGENTS.md', written: true },
          { path: '.cursor/rules/tlc.mdc', written: true },
        ],
      };

      const output = formatExportSummary(result);

      expect(output).toContain('TLC Rules Exported');
      expect(output).toContain('TestProject');
      expect(output).toContain('vitest');
      expect(output).toContain('AGENTS.md');
      expect(output).toContain('.cursor/rules/tlc.mdc');
    });

    it('shows file status', () => {
      const result = {
        projectName: 'Test',
        testFramework: 'jest',
        files: [
          { path: 'AGENTS.md', written: true },
          { path: '.cursor/rules/tlc.mdc', written: false },
        ],
      };

      const output = formatExportSummary(result);

      expect(output).toContain('[Created]');
      expect(output).toContain('[Skipped]');
    });

    it('includes next steps', () => {
      const result = {
        projectName: 'Test',
        testFramework: 'vitest',
        files: [],
      };

      const output = formatExportSummary(result);

      expect(output).toContain('Next Steps');
      expect(output).toContain('Commit');
      expect(output).toContain('ROADMAP.md');
    });
  });

  describe('executeExportCommand', () => {
    it('handles --list flag', async () => {
      const result = await executeExportCommand('--list', {
        projectDir: '/tmp',
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Supported AI Tools');
    });

    it('handles --detect flag', async () => {
      const result = await executeExportCommand('--detect', {
        projectDir: '/tmp',
      });

      expect(result.success).toBe(true);
      expect(result.detection).toBeDefined();
      expect(result.output).toContain('AI Tool Detection');
    });

    it('handles unknown tool error', async () => {
      const result = await executeExportCommand('--tool unknown-tool', {
        projectDir: '/tmp',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown tool');
    });

    it('handles dry run', async () => {
      const result = await executeExportCommand('cursor --dry-run', {
        projectDir: '/tmp',
      });

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(result.output).toContain('Would generate');
      expect(result.files[0].written).toBe(false);
    });

    it('generates rules for specific tool', async () => {
      const result = await executeExportCommand('cursor --dry-run', {
        projectDir: '/tmp',
      });

      expect(result.success).toBe(true);
      expect(result.files.length).toBe(1);
      expect(result.files[0].tool).toBe('cursor');
    });

    it('generates rules for all tools', async () => {
      const result = await executeExportCommand('all --dry-run', {
        projectDir: '/tmp',
      });

      expect(result.success).toBe(true);
      expect(result.files.length).toBe(9);
    });

    it('uses custom project name', async () => {
      const result = await executeExportCommand('cursor --project MyApp --dry-run', {
        projectDir: '/tmp',
      });

      expect(result.success).toBe(true);
      expect(result.projectName).toBe('MyApp');
      expect(result.files[0].content).toContain('MyApp');
    });

    it('uses custom test framework', async () => {
      const result = await executeExportCommand('cursor --framework jest --dry-run', {
        projectDir: '/tmp',
      });

      expect(result.success).toBe(true);
      expect(result.testFramework).toBe('jest');
    });
  });

  describe('createExportCommand', () => {
    it('creates command handler', () => {
      const handler = createExportCommand();

      expect(handler.execute).toBeDefined();
      expect(handler.parseArgs).toBeDefined();
      expect(handler.loadProjectConfig).toBeDefined();
      expect(handler.formatToolList).toBeDefined();
      expect(handler.formatDetectionResult).toBeDefined();
      expect(handler.formatExportSummary).toBeDefined();
    });

    it('exposes constants', () => {
      const handler = createExportCommand();

      expect(handler.SUPPORTED_TOOLS).toBeDefined();
      expect(handler.AI_TOOLS).toBeDefined();
    });

    it('executes with default options', async () => {
      const handler = createExportCommand({ projectDir: '/tmp' });
      const result = await handler.execute('--list');

      expect(result.success).toBe(true);
    });

    it('merges context options', async () => {
      const handler = createExportCommand({ projectDir: '/default' });
      const result = await handler.execute('--detect', { projectDir: '/tmp' });

      expect(result.success).toBe(true);
    });
  });
});
