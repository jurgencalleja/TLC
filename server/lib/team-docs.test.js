import { describe, it, expect } from 'vitest';
import {
  ROLES,
  COMMANDS_BY_ROLE,
  ROLE_DESCRIPTIONS,
  PITFALLS,
  generateRoleGuide,
  generateTeamWorkflow,
  generateOnboardingGuide,
  generateAllDocs,
  createTeamDocsGenerator,
} from './team-docs.js';

describe('team-docs', () => {
  describe('ROLES', () => {
    it('defines role constants', () => {
      expect(ROLES.ENGINEER).toBe('engineer');
      expect(ROLES.PO).toBe('po');
      expect(ROLES.QA).toBe('qa');
      expect(ROLES.LEAD).toBe('lead');
    });
  });

  describe('COMMANDS_BY_ROLE', () => {
    it('has commands for engineers', () => {
      const cmds = COMMANDS_BY_ROLE[ROLES.ENGINEER];

      expect(cmds).toBeDefined();
      expect(cmds.some(c => c.cmd.includes('claim'))).toBe(true);
      expect(cmds.some(c => c.cmd.includes('build'))).toBe(true);
    });

    it('has commands for PO', () => {
      const cmds = COMMANDS_BY_ROLE[ROLES.PO];

      expect(cmds).toBeDefined();
      expect(cmds.some(c => c.cmd.includes('plan'))).toBe(true);
      expect(cmds.some(c => c.cmd.includes('verify'))).toBe(true);
    });

    it('has commands for QA', () => {
      const cmds = COMMANDS_BY_ROLE[ROLES.QA];

      expect(cmds).toBeDefined();
      expect(cmds.some(c => c.cmd.includes('bug'))).toBe(true);
      expect(cmds.some(c => c.cmd.includes('verify'))).toBe(true);
    });

    it('has commands for lead', () => {
      const cmds = COMMANDS_BY_ROLE[ROLES.LEAD];

      expect(cmds).toBeDefined();
      expect(cmds.some(c => c.cmd.includes('merge'))).toBe(true);
      expect(cmds.some(c => c.cmd.includes('quality'))).toBe(true);
    });
  });

  describe('ROLE_DESCRIPTIONS', () => {
    it('has description for each role', () => {
      expect(ROLE_DESCRIPTIONS[ROLES.ENGINEER]).toBeDefined();
      expect(ROLE_DESCRIPTIONS[ROLES.PO]).toBeDefined();
      expect(ROLE_DESCRIPTIONS[ROLES.QA]).toBeDefined();
      expect(ROLE_DESCRIPTIONS[ROLES.LEAD]).toBeDefined();
    });

    it('includes title, summary, responsibilities, workflow', () => {
      const eng = ROLE_DESCRIPTIONS[ROLES.ENGINEER];

      expect(eng.title).toBe('Engineer');
      expect(eng.summary).toBeDefined();
      expect(eng.responsibilities.length).toBeGreaterThan(0);
      expect(eng.workflow.length).toBeGreaterThan(0);
    });
  });

  describe('PITFALLS', () => {
    it('has pitfalls for engineers', () => {
      const pitfalls = PITFALLS[ROLES.ENGINEER];

      expect(pitfalls.length).toBeGreaterThan(0);
      expect(pitfalls[0].mistake).toBeDefined();
      expect(pitfalls[0].solution).toBeDefined();
    });

    it('has pitfalls for each role', () => {
      expect(PITFALLS[ROLES.ENGINEER].length).toBeGreaterThan(0);
      expect(PITFALLS[ROLES.PO].length).toBeGreaterThan(0);
      expect(PITFALLS[ROLES.QA].length).toBeGreaterThan(0);
      expect(PITFALLS[ROLES.LEAD].length).toBeGreaterThan(0);
    });
  });

  describe('generateRoleGuide', () => {
    it('generates engineer guide', () => {
      const guide = generateRoleGuide(ROLES.ENGINEER);

      expect(guide).toContain('Engineer');
      expect(guide).toContain('Responsibilities');
      expect(guide).toContain('Workflow');
      expect(guide).toContain('Commands');
      expect(guide).toContain('Pitfalls');
    });

    it('generates PO guide', () => {
      const guide = generateRoleGuide(ROLES.PO);

      expect(guide).toContain('Product Owner');
      expect(guide).toContain('requirements');
      expect(guide).toContain('/tlc:plan');
    });

    it('generates QA guide', () => {
      const guide = generateRoleGuide(ROLES.QA);

      expect(guide).toContain('QA');
      expect(guide).toContain('verify');
      expect(guide).toContain('bug');
    });

    it('generates lead guide', () => {
      const guide = generateRoleGuide(ROLES.LEAD);

      expect(guide).toContain('Tech Lead');
      expect(guide).toContain('merge');
      expect(guide).toContain('quality');
    });

    it('handles unknown role', () => {
      const guide = generateRoleGuide('unknown');

      expect(guide).toContain('Unknown Role');
    });

    it('includes quick start section', () => {
      const guide = generateRoleGuide(ROLES.ENGINEER);

      expect(guide).toContain('Quick Start');
      expect(guide).toContain('```bash');
    });

    it('includes command table', () => {
      const guide = generateRoleGuide(ROLES.ENGINEER);

      expect(guide).toContain('| Command | Description |');
      expect(guide).toContain('/tlc:claim');
    });
  });

  describe('generateTeamWorkflow', () => {
    it('generates workflow document', () => {
      const workflow = generateTeamWorkflow();

      expect(workflow).toContain('Team Workflow');
      expect(workflow).toContain('Overview');
      expect(workflow).toContain('Workflow');
      expect(workflow).toContain('Phase Lifecycle');
    });

    it('includes workflow diagram', () => {
      const workflow = generateTeamWorkflow();

      expect(workflow).toContain('PO');
      expect(workflow).toContain('Engineer');
      expect(workflow).toContain('QA');
      expect(workflow).toContain('Tech Lead');
    });

    it('includes all phases', () => {
      const workflow = generateTeamWorkflow();

      expect(workflow).toContain('Planning');
      expect(workflow).toContain('Building');
      expect(workflow).toContain('Verification');
      expect(workflow).toContain('Integration');
    });

    it('includes communication section', () => {
      const workflow = generateTeamWorkflow();

      expect(workflow).toContain('Communication');
      expect(workflow).toContain('Task Claiming');
      expect(workflow).toContain('Status Updates');
    });

    it('includes best practices', () => {
      const workflow = generateTeamWorkflow();

      expect(workflow).toContain('Best Practices');
      expect(workflow).toContain('Pull before claiming');
    });

    it('uses custom team size', () => {
      const workflow = generateTeamWorkflow({ teamSize: 5 });

      expect(workflow).toContain('5+');
    });
  });

  describe('generateOnboardingGuide', () => {
    it('generates onboarding guide', () => {
      const guide = generateOnboardingGuide();

      expect(guide).toContain('Onboarding');
      expect(guide).toContain('Prerequisites');
      expect(guide).toContain('Setup');
      expect(guide).toContain('First Task');
    });

    it('includes prerequisites checklist', () => {
      const guide = generateOnboardingGuide();

      expect(guide).toContain('Git installed');
      expect(guide).toContain('Node.js');
      expect(guide).toContain('Claude Code');
    });

    it('includes setup commands', () => {
      const guide = generateOnboardingGuide();

      expect(guide).toContain('git clone');
      expect(guide).toContain('npm install');
      expect(guide).toContain('npm test');
    });

    it('includes first task walkthrough', () => {
      const guide = generateOnboardingGuide();

      expect(guide).toContain('/tlc:progress');
      expect(guide).toContain('/tlc:claim');
      expect(guide).toContain('/tlc:build');
    });

    it('includes key concepts', () => {
      const guide = generateOnboardingGuide();

      expect(guide).toContain('Test-First');
      expect(guide).toContain('Red');
      expect(guide).toContain('Green');
      expect(guide).toContain('Refactor');
    });

    it('includes onboarding checklist', () => {
      const guide = generateOnboardingGuide();

      expect(guide).toContain('Onboarding Checklist');
      expect(guide).toContain('- [ ]');
      expect(guide).toContain('30 minutes');
    });

    it('uses custom project name', () => {
      const guide = generateOnboardingGuide({ projectName: 'MyApp' });

      expect(guide).toContain('MyApp');
    });
  });

  describe('generateAllDocs', () => {
    it('generates all documents', () => {
      const docs = generateAllDocs();

      expect(docs.teamWorkflow).toBeDefined();
      expect(docs.onboarding).toBeDefined();
      expect(docs.engineerGuide).toBeDefined();
      expect(docs.poGuide).toBeDefined();
      expect(docs.qaGuide).toBeDefined();
      expect(docs.leadGuide).toBeDefined();
    });

    it('each document has content', () => {
      const docs = generateAllDocs();

      expect(docs.teamWorkflow.length).toBeGreaterThan(100);
      expect(docs.onboarding.length).toBeGreaterThan(100);
      expect(docs.engineerGuide.length).toBeGreaterThan(100);
    });

    it('passes options to generators', () => {
      const docs = generateAllDocs({ projectName: 'TestProject', teamSize: 10 });

      expect(docs.teamWorkflow).toContain('10+');
      expect(docs.onboarding).toContain('TestProject');
    });
  });

  describe('createTeamDocsGenerator', () => {
    it('creates generator with methods', () => {
      const generator = createTeamDocsGenerator();

      expect(generator.generateRoleGuide).toBeDefined();
      expect(generator.generateTeamWorkflow).toBeDefined();
      expect(generator.generateOnboardingGuide).toBeDefined();
      expect(generator.generateAllDocs).toBeDefined();
    });

    it('exposes constants', () => {
      const generator = createTeamDocsGenerator();

      expect(generator.ROLES).toBeDefined();
      expect(generator.COMMANDS_BY_ROLE).toBeDefined();
      expect(generator.ROLE_DESCRIPTIONS).toBeDefined();
      expect(generator.PITFALLS).toBeDefined();
    });

    it('uses provided options', () => {
      const generator = createTeamDocsGenerator({ projectName: 'MyProject' });
      const guide = generator.generateOnboardingGuide();

      expect(guide).toContain('MyProject');
    });

    it('allows option override', () => {
      const generator = createTeamDocsGenerator({ projectName: 'Default' });
      const guide = generator.generateOnboardingGuide({ projectName: 'Override' });

      expect(guide).toContain('Override');
    });
  });
});
