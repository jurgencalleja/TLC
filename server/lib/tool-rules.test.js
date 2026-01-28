import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_TOOLS,
  TOOL_FILE_PATHS,
  getTLCCoreRules,
  generateAgentsMd,
  generateCursorRules,
  generateAntigravityRules,
  generateWindsurfRules,
  generateCopilotRules,
  generateContinueRules,
  generateCodyRules,
  generateAmazonQRules,
  generateAiderRules,
  generateToolRules,
  generateAllToolRules,
  getSupportedTools,
  getToolFilePath,
  createToolRulesGenerator,
} from './tool-rules.js';

describe('tool-rules', () => {
  describe('SUPPORTED_TOOLS', () => {
    it('defines all supported tool constants', () => {
      expect(SUPPORTED_TOOLS.AGENTS_MD).toBe('agents-md');
      expect(SUPPORTED_TOOLS.CURSOR).toBe('cursor');
      expect(SUPPORTED_TOOLS.ANTIGRAVITY).toBe('antigravity');
      expect(SUPPORTED_TOOLS.WINDSURF).toBe('windsurf');
      expect(SUPPORTED_TOOLS.COPILOT).toBe('copilot');
      expect(SUPPORTED_TOOLS.CONTINUE).toBe('continue');
      expect(SUPPORTED_TOOLS.CODY).toBe('cody');
      expect(SUPPORTED_TOOLS.AMAZON_Q).toBe('amazon-q');
      expect(SUPPORTED_TOOLS.AIDER).toBe('aider');
    });
  });

  describe('TOOL_FILE_PATHS', () => {
    it('has file path for each tool', () => {
      expect(TOOL_FILE_PATHS[SUPPORTED_TOOLS.AGENTS_MD]).toBe('AGENTS.md');
      expect(TOOL_FILE_PATHS[SUPPORTED_TOOLS.CURSOR]).toBe('.cursor/rules/tlc.mdc');
      expect(TOOL_FILE_PATHS[SUPPORTED_TOOLS.ANTIGRAVITY]).toBe('.antigravity/rules.md');
      expect(TOOL_FILE_PATHS[SUPPORTED_TOOLS.WINDSURF]).toBe('.windsurfrules');
      expect(TOOL_FILE_PATHS[SUPPORTED_TOOLS.COPILOT]).toBe('.github/copilot-instructions.md');
      expect(TOOL_FILE_PATHS[SUPPORTED_TOOLS.CONTINUE]).toBe('.continue/rules/tlc.md');
      expect(TOOL_FILE_PATHS[SUPPORTED_TOOLS.CODY]).toBe('.cody/instructions.md');
      expect(TOOL_FILE_PATHS[SUPPORTED_TOOLS.AMAZON_Q]).toBe('.amazonq/rules/tlc.md');
      expect(TOOL_FILE_PATHS[SUPPORTED_TOOLS.AIDER]).toBe('.aider.conf.yml');
    });
  });

  describe('getTLCCoreRules', () => {
    it('returns default rules', () => {
      const rules = getTLCCoreRules();

      expect(rules.projectName).toBe('Project');
      expect(rules.testFramework).toBe('vitest');
      expect(rules.principles).toBeDefined();
      expect(rules.principles.length).toBeGreaterThan(0);
    });

    it('uses custom project name', () => {
      const rules = getTLCCoreRules({ projectName: 'MyApp' });
      expect(rules.projectName).toBe('MyApp');
    });

    it('uses custom test framework', () => {
      const rules = getTLCCoreRules({ testFramework: 'jest' });
      expect(rules.testFramework).toBe('jest');
    });

    it('includes workflow steps', () => {
      const rules = getTLCCoreRules();

      expect(rules.workflow).toBeDefined();
      expect(rules.workflow.length).toBeGreaterThan(0);
      expect(rules.workflow.some((s) => s.includes('ROADMAP'))).toBe(true);
    });

    it('includes test-first pattern', () => {
      const rules = getTLCCoreRules();

      expect(rules.testFirst.red).toBeDefined();
      expect(rules.testFirst.green).toBeDefined();
      expect(rules.testFirst.refactor).toBeDefined();
    });

    it('includes task markers', () => {
      const rules = getTLCCoreRules();

      expect(rules.taskMarkers.available).toBe('[ ]');
      expect(rules.taskMarkers.inProgress).toBe('[>@{user}]');
      expect(rules.taskMarkers.completed).toBe('[x@{user}]');
    });

    it('includes artifact locations', () => {
      const rules = getTLCCoreRules();

      expect(rules.artifacts.roadmap).toBeDefined();
      expect(rules.artifacts.plans).toBeDefined();
      expect(rules.artifacts.tests).toBeDefined();
      expect(rules.artifacts.bugs).toBeDefined();
    });
  });

  describe('generateAgentsMd', () => {
    it('generates AGENTS.md content', () => {
      const content = generateAgentsMd();

      expect(content).toContain('# AGENTS.md');
      expect(content).toContain('TLC');
      expect(content).toContain('Test-First Development');
    });

    it('includes project name', () => {
      const content = generateAgentsMd({ projectName: 'TestProject' });
      expect(content).toContain('TestProject');
    });

    it('includes principles', () => {
      const content = generateAgentsMd();

      expect(content).toContain('Tests define behavior');
      expect(content).toContain('Red → Green → Refactor');
    });

    it('includes workflow steps', () => {
      const content = generateAgentsMd();

      expect(content).toContain('ROADMAP.md');
      expect(content).toContain('PLAN.md');
      expect(content).toContain('Claim task');
    });

    it('includes task markers table', () => {
      const content = generateAgentsMd();

      expect(content).toContain('| Marker | Meaning |');
      expect(content).toContain('[ ]');
      expect(content).toContain('[>@{user}]');
    });

    it('includes test framework', () => {
      const content = generateAgentsMd({ testFramework: 'jest' });
      expect(content).toContain('jest');
    });
  });

  describe('generateCursorRules', () => {
    it('generates Cursor MDC format', () => {
      const content = generateCursorRules();

      expect(content).toContain('---');
      expect(content).toContain('description:');
      expect(content).toContain('globs:');
      expect(content).toContain('alwaysApply: true');
    });

    it('includes TLC rules', () => {
      const content = generateCursorRules();

      expect(content).toContain('TLC');
      expect(content).toContain('Test-First');
      expect(content).toContain('PLAN.md');
    });

    it('includes file patterns', () => {
      const content = generateCursorRules();

      expect(content).toContain('*.ts');
      expect(content).toContain('*.js');
      expect(content).toContain('*.tsx');
    });

    it('includes task claiming instructions', () => {
      const content = generateCursorRules();

      expect(content).toContain('[ ]');
      expect(content).toContain('[>@yourname]');
      expect(content).toContain('[x@yourname]');
    });
  });

  describe('generateAntigravityRules', () => {
    it('generates Antigravity format', () => {
      const content = generateAntigravityRules();

      expect(content).toContain('# TLC Rules for Antigravity');
      expect(content).toContain('TLC (Test-Led Coding)');
    });

    it('includes workflow', () => {
      const content = generateAntigravityRules();

      expect(content).toContain('Core Workflow');
      expect(content).toContain('ROADMAP.md');
    });

    it('includes test-first pattern', () => {
      const content = generateAntigravityRules();

      expect(content).toContain('Red');
      expect(content).toContain('Green');
      expect(content).toContain('Refactor');
    });

    it('uses custom project name', () => {
      const content = generateAntigravityRules({ projectName: 'MyApp' });
      expect(content).toContain('MyApp');
    });
  });

  describe('generateWindsurfRules', () => {
    it('generates Windsurf format', () => {
      const content = generateWindsurfRules();

      expect(content).toContain('# TLC (Test-Led Coding) Rules');
    });

    it('includes concise principles', () => {
      const content = generateWindsurfRules();

      expect(content).toContain('Principles');
      expect(content).toContain('Tests define behavior');
    });

    it('includes workflow', () => {
      const content = generateWindsurfRules();

      expect(content).toContain('Workflow');
      expect(content).toContain('ROADMAP.md');
      expect(content).toContain('PLAN.md');
    });

    it('includes test framework', () => {
      const content = generateWindsurfRules({ testFramework: 'mocha' });
      expect(content).toContain('mocha');
    });
  });

  describe('generateCopilotRules', () => {
    it('generates Copilot format', () => {
      const content = generateCopilotRules();

      expect(content).toContain('# GitHub Copilot Instructions');
      expect(content).toContain('TLC');
    });

    it('includes code generation guidance', () => {
      const content = generateCopilotRules();

      expect(content).toContain('When Generating Code');
      expect(content).toContain('Check for existing tests');
      expect(content).toContain('Write tests first');
    });

    it('includes project structure table', () => {
      const content = generateCopilotRules();

      expect(content).toContain('| Purpose | Location |');
      expect(content).toContain('roadmap');
    });

    it('uses custom project name', () => {
      const content = generateCopilotRules({ projectName: 'TestApp' });
      expect(content).toContain('TestApp');
    });
  });

  describe('generateContinueRules', () => {
    it('generates Continue format', () => {
      const content = generateContinueRules();

      expect(content).toContain('# TLC Rules for Continue');
      expect(content).toContain('Test-Led Coding');
    });

    it('includes numbered workflow', () => {
      const content = generateContinueRules();

      expect(content).toContain('1.');
      expect(content).toContain('2.');
      expect(content).toContain('ROADMAP.md');
    });

    it('includes task claiming', () => {
      const content = generateContinueRules();

      expect(content).toContain('Task Claiming');
      expect(content).toContain('[ ]');
      expect(content).toContain('[>@{user}]');
    });
  });

  describe('generateCodyRules', () => {
    it('generates Cody format', () => {
      const content = generateCodyRules();

      expect(content).toContain('# Cody Instructions');
      expect(content).toContain('TLC');
    });

    it('includes answering guidance', () => {
      const content = generateCodyRules();

      expect(content).toContain('When Answering Questions');
      expect(content).toContain('ROADMAP.md');
    });

    it('includes code generation guidance', () => {
      const content = generateCodyRules();

      expect(content).toContain('When Generating Code');
      expect(content).toContain('tests exist');
      expect(content).toContain('write tests first');
    });

    it('uses custom project name', () => {
      const content = generateCodyRules({ projectName: 'MyCodyProject' });
      expect(content).toContain('MyCodyProject');
    });
  });

  describe('generateAmazonQRules', () => {
    it('generates Amazon Q format', () => {
      const content = generateAmazonQRules();

      expect(content).toContain('# Amazon Q Developer Rules');
      expect(content).toContain('TLC');
    });

    it('includes test-first code block', () => {
      const content = generateAmazonQRules();

      expect(content).toContain('```');
      expect(content).toContain('Red:');
      expect(content).toContain('Green:');
      expect(content).toContain('Refactor:');
    });

    it('uses custom project name', () => {
      const content = generateAmazonQRules({ projectName: 'AWSProject' });
      expect(content).toContain('AWSProject');
    });
  });

  describe('generateAiderRules', () => {
    it('generates Aider YAML format', () => {
      const content = generateAiderRules();

      expect(content).toContain('# Aider Configuration');
      expect(content).toContain('project_name:');
      expect(content).toContain('test_framework:');
    });

    it('includes read files list', () => {
      const content = generateAiderRules();

      expect(content).toContain('read:');
      expect(content).toContain('.planning/ROADMAP.md');
      expect(content).toContain('.planning/phases/*-PLAN.md');
    });

    it('includes auto-commit settings', () => {
      const content = generateAiderRules();

      expect(content).toContain('auto_commits:');
      expect(content).toContain('dirty_commits:');
    });

    it('includes system prompt', () => {
      const content = generateAiderRules();

      expect(content).toContain('extra_system_prompt:');
      expect(content).toContain('TLC (Test-Led Coding)');
      expect(content).toContain('PRINCIPLES:');
      expect(content).toContain('WORKFLOW:');
    });

    it('uses custom project name', () => {
      const content = generateAiderRules({ projectName: 'AiderProject' });
      expect(content).toContain('project_name: "AiderProject"');
    });

    it('uses custom test framework', () => {
      const content = generateAiderRules({ testFramework: 'pytest' });
      expect(content).toContain('test_framework: "pytest"');
    });
  });

  describe('generateToolRules', () => {
    it('generates rules for agents-md', () => {
      const content = generateToolRules(SUPPORTED_TOOLS.AGENTS_MD);
      expect(content).toContain('AGENTS.md');
    });

    it('generates rules for cursor', () => {
      const content = generateToolRules(SUPPORTED_TOOLS.CURSOR);
      expect(content).toContain('Cursor');
    });

    it('generates rules for windsurf', () => {
      const content = generateToolRules(SUPPORTED_TOOLS.WINDSURF);
      expect(content).toContain('TLC');
    });

    it('throws for unsupported tool', () => {
      expect(() => generateToolRules('unknown-tool')).toThrow('Unsupported tool');
    });

    it('passes options to generator', () => {
      const content = generateToolRules(SUPPORTED_TOOLS.AGENTS_MD, {
        projectName: 'TestProject',
      });
      expect(content).toContain('TestProject');
    });
  });

  describe('generateAllToolRules', () => {
    it('generates rules for all tools', () => {
      const results = generateAllToolRules();

      expect(Object.keys(results).length).toBe(9);
      expect(results[SUPPORTED_TOOLS.AGENTS_MD]).toBeDefined();
      expect(results[SUPPORTED_TOOLS.CURSOR]).toBeDefined();
      expect(results[SUPPORTED_TOOLS.AIDER]).toBeDefined();
    });

    it('includes content and path for each tool', () => {
      const results = generateAllToolRules();

      for (const tool of Object.values(SUPPORTED_TOOLS)) {
        expect(results[tool].content).toBeDefined();
        expect(results[tool].path).toBeDefined();
        expect(results[tool].content.length).toBeGreaterThan(0);
      }
    });

    it('passes options to all generators', () => {
      const results = generateAllToolRules({ projectName: 'SharedProject' });

      expect(results[SUPPORTED_TOOLS.AGENTS_MD].content).toContain('SharedProject');
      expect(results[SUPPORTED_TOOLS.COPILOT].content).toContain('SharedProject');
    });
  });

  describe('getSupportedTools', () => {
    it('returns all supported tools', () => {
      const tools = getSupportedTools();

      expect(tools.length).toBe(9);
      expect(tools).toContain(SUPPORTED_TOOLS.AGENTS_MD);
      expect(tools).toContain(SUPPORTED_TOOLS.CURSOR);
      expect(tools).toContain(SUPPORTED_TOOLS.AIDER);
    });
  });

  describe('getToolFilePath', () => {
    it('returns file path for valid tool', () => {
      expect(getToolFilePath(SUPPORTED_TOOLS.CURSOR)).toBe('.cursor/rules/tlc.mdc');
      expect(getToolFilePath(SUPPORTED_TOOLS.AGENTS_MD)).toBe('AGENTS.md');
    });

    it('returns null for unknown tool', () => {
      expect(getToolFilePath('unknown')).toBeNull();
    });
  });

  describe('createToolRulesGenerator', () => {
    it('creates generator with default options', () => {
      const generator = createToolRulesGenerator({ projectName: 'DefaultProject' });

      const content = generator.generateToolRules(SUPPORTED_TOOLS.AGENTS_MD);
      expect(content).toContain('DefaultProject');
    });

    it('allows option override', () => {
      const generator = createToolRulesGenerator({ projectName: 'Default' });

      const content = generator.generateToolRules(SUPPORTED_TOOLS.AGENTS_MD, {
        projectName: 'Override',
      });
      expect(content).toContain('Override');
    });

    it('exposes all methods', () => {
      const generator = createToolRulesGenerator();

      expect(generator.generateToolRules).toBeDefined();
      expect(generator.generateAllToolRules).toBeDefined();
      expect(generator.getSupportedTools).toBeDefined();
      expect(generator.getToolFilePath).toBeDefined();
      expect(generator.getTLCCoreRules).toBeDefined();
    });

    it('exposes constants', () => {
      const generator = createToolRulesGenerator();

      expect(generator.SUPPORTED_TOOLS).toBeDefined();
      expect(generator.TOOL_FILE_PATHS).toBeDefined();
    });
  });
});
