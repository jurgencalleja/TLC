import { describe, it, expect } from 'vitest';
import {
  parseTeamDocsArgs,
  formatDocsSummary,
  createTeamDocsCommand,
} from './team-docs-command.js';

describe('team-docs-command', () => {
  describe('parseTeamDocsArgs', () => {
    it('returns defaults for empty args', () => {
      const options = parseTeamDocsArgs('');

      expect(options.action).toBe('all');
      expect(options.role).toBeNull();
      expect(options.output).toBeNull();
      expect(options.dryRun).toBe(false);
    });

    it('parses all action', () => {
      const options = parseTeamDocsArgs('all');
      expect(options.action).toBe('all');
    });

    it('parses workflow action', () => {
      const options = parseTeamDocsArgs('workflow');
      expect(options.action).toBe('workflow');
    });

    it('parses onboarding action', () => {
      const options = parseTeamDocsArgs('onboarding');
      expect(options.action).toBe('onboarding');
    });

    it('parses role action with role name', () => {
      const options = parseTeamDocsArgs('role engineer');

      expect(options.action).toBe('role');
      expect(options.role).toBe('engineer');
    });

    it('parses role directly', () => {
      const options = parseTeamDocsArgs('engineer');

      expect(options.action).toBe('role');
      expect(options.role).toBe('engineer');
    });

    it('parses --output flag', () => {
      const options = parseTeamDocsArgs('workflow --output docs/workflow.md');
      expect(options.output).toBe('docs/workflow.md');
    });

    it('parses --project flag', () => {
      const options = parseTeamDocsArgs('all --project MyProject');
      expect(options.projectName).toBe('MyProject');
    });

    it('parses --team-size flag', () => {
      const options = parseTeamDocsArgs('all --team-size 5');
      expect(options.teamSize).toBe(5);
    });

    it('parses --dry-run flag', () => {
      const options = parseTeamDocsArgs('all --dry-run');
      expect(options.dryRun).toBe(true);
    });

    it('parses multiple flags', () => {
      const options = parseTeamDocsArgs('workflow --output out.md --project Test --dry-run');

      expect(options.action).toBe('workflow');
      expect(options.output).toBe('out.md');
      expect(options.projectName).toBe('Test');
      expect(options.dryRun).toBe(true);
    });

    it('handles case insensitive roles', () => {
      expect(parseTeamDocsArgs('ENGINEER').role).toBe('engineer');
      expect(parseTeamDocsArgs('Po').role).toBe('po');
      expect(parseTeamDocsArgs('QA').role).toBe('qa');
    });
  });

  describe('formatDocsSummary', () => {
    it('formats summary with files', () => {
      const result = {
        docsDir: '/project/docs/team',
        files: [
          { name: 'TEAM-WORKFLOW.md', path: '/project/docs/team/TEAM-WORKFLOW.md' },
          { name: 'ONBOARDING.md', path: '/project/docs/team/ONBOARDING.md' },
        ],
      };

      const summary = formatDocsSummary(result);

      expect(summary).toContain('Team Documentation Generated');
      expect(summary).toContain('/project/docs/team');
      expect(summary).toContain('TEAM-WORKFLOW.md');
      expect(summary).toContain('ONBOARDING.md');
    });

    it('includes quick links table', () => {
      const result = {
        docsDir: '/docs',
        files: [],
      };

      const summary = formatDocsSummary(result);

      expect(summary).toContain('Quick Links');
      expect(summary).toContain('| Document | Audience |');
      expect(summary).toContain('All team members');
      expect(summary).toContain('Engineers');
    });
  });

  describe('createTeamDocsCommand', () => {
    it('creates command handler', () => {
      const handler = createTeamDocsCommand();

      expect(handler.execute).toBeDefined();
      expect(handler.parseArgs).toBeDefined();
      expect(handler.loadProjectConfig).toBeDefined();
      expect(handler.formatDocsSummary).toBeDefined();
    });

    it('exposes ROLES constant', () => {
      const handler = createTeamDocsCommand();

      expect(handler.ROLES).toBeDefined();
      expect(handler.ROLES.ENGINEER).toBe('engineer');
    });

    it('exposes parseArgs function', () => {
      const handler = createTeamDocsCommand();
      const options = handler.parseArgs('engineer --output test.md');

      expect(options.role).toBe('engineer');
      expect(options.output).toBe('test.md');
    });
  });

  describe('executeTeamDocsCommand integration', () => {
    it('generates role guide without writing', async () => {
      const handler = createTeamDocsCommand();
      const result = await handler.execute('engineer --dry-run', {
        projectDir: '/tmp',
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Engineer');
    });

    it('generates workflow without writing', async () => {
      const handler = createTeamDocsCommand();
      const result = await handler.execute('workflow', {
        projectDir: '/tmp',
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Team Workflow');
    });

    it('generates onboarding without writing', async () => {
      const handler = createTeamDocsCommand();
      const result = await handler.execute('onboarding', {
        projectDir: '/tmp',
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain('Onboarding');
    });

    it('returns error for invalid role', async () => {
      const handler = createTeamDocsCommand();
      const result = await handler.execute('role invalid', {
        projectDir: '/tmp',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid role');
    });

    it('previews all docs in dry run', async () => {
      const handler = createTeamDocsCommand();
      const result = await handler.execute('all --dry-run', {
        projectDir: '/tmp',
      });

      expect(result.success).toBe(true);
      expect(result.preview).toBeDefined();
      expect(result.preview.files).toContain('TEAM-WORKFLOW.md');
    });

    it('uses custom project name', async () => {
      const handler = createTeamDocsCommand();
      const result = await handler.execute('onboarding --project TestApp', {
        projectDir: '/tmp',
      });

      expect(result.output).toContain('TestApp');
    });

    it('uses custom team size', async () => {
      const handler = createTeamDocsCommand();
      const result = await handler.execute('workflow --team-size 10', {
        projectDir: '/tmp',
      });

      expect(result.output).toContain('10+');
    });
  });
});
