/**
 * Deploy Branch Command Tests
 */
import { describe, it, expect, vi } from 'vitest';
import {
  parseDeployArgs,
  validateDeployment,
  formatDeploymentStatus,
  formatSecurityGateResults,
  createDeployBranchCommand,
} from './deploy-branch.js';

describe('deploy-branch command', () => {
  describe('parseDeployArgs', () => {
    it('parses branch name', () => {
      const args = parseDeployArgs(['main']);
      expect(args.branch).toBe('main');
    });

    it('parses --force flag', () => {
      const args = parseDeployArgs(['main', '--force']);
      expect(args.branch).toBe('main');
      expect(args.force).toBe(true);
    });

    it('parses --dry-run flag', () => {
      const args = parseDeployArgs(['dev', '--dry-run']);
      expect(args.dryRun).toBe(true);
    });

    it('parses --skip-gates flag', () => {
      const args = parseDeployArgs(['feature/x', '--skip-gates']);
      expect(args.skipGates).toBe(true);
    });

    it('parses --strategy option', () => {
      const args = parseDeployArgs(['main', '--strategy', 'blue-green']);
      expect(args.strategy).toBe('blue-green');
    });

    it('parses --approver option', () => {
      const args = parseDeployArgs(['main', '--approver', 'bob']);
      expect(args.approver).toBe('bob');
    });

    it('returns help for --help flag', () => {
      const args = parseDeployArgs(['--help']);
      expect(args.help).toBe(true);
    });

    it('uses current branch when not specified', () => {
      const args = parseDeployArgs([], { currentBranch: 'feature/test' });
      expect(args.branch).toBe('feature/test');
    });
  });

  describe('validateDeployment', () => {
    it('validates deployment can proceed', async () => {
      const mockCheck = vi.fn().mockResolvedValue({
        hasUncommittedChanges: false,
        branchExists: true,
        isProtected: false,
      });

      const result = await validateDeployment({
        branch: 'feature/x',
        checkFn: mockCheck,
      });

      expect(result.valid).toBe(true);
    });

    it('rejects uncommitted changes', async () => {
      const mockCheck = vi.fn().mockResolvedValue({
        hasUncommittedChanges: true,
        branchExists: true,
      });

      const result = await validateDeployment({
        branch: 'feature/x',
        checkFn: mockCheck,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('uncommitted');
    });

    it('rejects non-existent branch', async () => {
      const mockCheck = vi.fn().mockResolvedValue({
        hasUncommittedChanges: false,
        branchExists: false,
      });

      const result = await validateDeployment({
        branch: 'feature/nonexistent',
        checkFn: mockCheck,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('requires approval for protected branches', async () => {
      const mockCheck = vi.fn().mockResolvedValue({
        hasUncommittedChanges: false,
        branchExists: true,
        isProtected: true,
      });

      const result = await validateDeployment({
        branch: 'main',
        checkFn: mockCheck,
      });

      expect(result.requiresApproval).toBe(true);
    });
  });

  describe('formatDeploymentStatus', () => {
    it('formats pending status', () => {
      const output = formatDeploymentStatus({
        id: 'deploy-123',
        state: 'pending',
        branch: 'main',
      });

      expect(output).toContain('deploy-123');
      expect(output).toContain('pending');
      expect(output).toContain('main');
    });

    it('formats completed status with duration', () => {
      const output = formatDeploymentStatus({
        id: 'deploy-123',
        state: 'completed',
        branch: 'main',
        duration: 120000,
      });

      expect(output).toContain('completed');
      expect(output).toContain('2m'); // 2 minutes
    });

    it('formats failed status with error', () => {
      const output = formatDeploymentStatus({
        id: 'deploy-123',
        state: 'failed',
        branch: 'main',
        error: 'Health check timeout',
      });

      expect(output).toContain('failed');
      expect(output).toContain('Health check timeout');
    });

    it('includes URL when available', () => {
      const output = formatDeploymentStatus({
        id: 'deploy-123',
        state: 'completed',
        branch: 'feature-x',
        url: 'https://feature-x.example.com',
      });

      expect(output).toContain('https://feature-x.example.com');
    });
  });

  describe('formatSecurityGateResults', () => {
    it('formats all gates passed', () => {
      const results = {
        passed: true,
        gates: {
          sast: { status: 'passed', duration: 5000 },
          dependencies: { status: 'passed', duration: 3000 },
        },
      };

      const output = formatSecurityGateResults(results);

      expect(output).toContain('✓');
      expect(output).toContain('sast');
      expect(output).toContain('passed');
    });

    it('formats failed gates with findings', () => {
      const results = {
        passed: false,
        gates: {
          sast: {
            status: 'failed',
            findings: [
              { severity: 'high', message: 'SQL injection vulnerability' },
            ],
          },
        },
      };

      const output = formatSecurityGateResults(results);

      expect(output).toContain('✗');
      expect(output).toContain('SQL injection');
    });

    it('includes summary count', () => {
      const results = {
        passed: false,
        gates: {
          sast: { status: 'passed' },
          dast: { status: 'failed', findings: [{}, {}] },
          container: { status: 'passed' },
        },
      };

      const output = formatSecurityGateResults(results);

      expect(output).toContain('2/3'); // 2 passed out of 3
    });
  });

  describe('createDeployBranchCommand', () => {
    it('creates command with name and description', () => {
      const command = createDeployBranchCommand();
      expect(command.name).toBe('deploy');
      expect(command.description).toBeDefined();
    });

    it('has execute function', () => {
      const command = createDeployBranchCommand();
      expect(command.execute).toBeDefined();
    });

    it('executes feature branch deployment', async () => {
      const mockClassify = vi.fn().mockReturnValue('feature');
      const mockGates = vi.fn().mockResolvedValue({ passed: true, gates: {} });
      const mockDeploy = vi.fn().mockResolvedValue({ state: 'completed' });

      const command = createDeployBranchCommand({
        classifier: { classify: mockClassify },
        securityGates: { runAll: mockGates },
        executor: { execute: mockDeploy },
      });

      const result = await command.execute(['feature/test'], {});

      expect(mockClassify).toHaveBeenCalledWith('feature/test');
      expect(mockGates).toHaveBeenCalled();
      expect(mockDeploy).toHaveBeenCalled();
    });

    it('requires approval for stable branch', async () => {
      const mockClassify = vi.fn().mockReturnValue('stable');
      const mockApproval = vi.fn().mockResolvedValue({ status: 'pending', id: 'req-123' });

      const command = createDeployBranchCommand({
        classifier: { classify: mockClassify },
        approval: { createRequest: mockApproval },
      });

      const result = await command.execute(['main'], {});

      expect(result.requiresApproval).toBe(true);
      expect(mockApproval).toHaveBeenCalled();
    });

    it('blocks on failed security gates', async () => {
      const mockClassify = vi.fn().mockReturnValue('dev');
      const mockGates = vi.fn().mockResolvedValue({
        passed: false,
        gates: { sast: { status: 'failed', findings: [{}] } },
      });

      const command = createDeployBranchCommand({
        classifier: { classify: mockClassify },
        securityGates: { runAll: mockGates },
      });

      const result = await command.execute(['dev'], {});

      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('security');
    });

    it('allows --skip-gates with warning', async () => {
      const mockClassify = vi.fn().mockReturnValue('feature');
      const mockDeploy = vi.fn().mockResolvedValue({ state: 'completed' });

      const command = createDeployBranchCommand({
        classifier: { classify: mockClassify },
        executor: { execute: mockDeploy },
      });

      const result = await command.execute(['feature/x', '--skip-gates'], {});

      expect(result.warning).toContain('skipped');
      expect(mockDeploy).toHaveBeenCalled();
    });

    it('shows dry run without deploying', async () => {
      const mockClassify = vi.fn().mockReturnValue('feature');
      const mockGates = vi.fn().mockResolvedValue({ passed: true, gates: {} });
      const mockDeploy = vi.fn();

      const command = createDeployBranchCommand({
        classifier: { classify: mockClassify },
        securityGates: { runAll: mockGates },
        executor: { execute: mockDeploy },
      });

      const result = await command.execute(['feature/x', '--dry-run'], {});

      expect(result.dryRun).toBe(true);
      expect(mockDeploy).not.toHaveBeenCalled();
    });

    it('logs audit events', async () => {
      const mockClassify = vi.fn().mockReturnValue('feature');
      const mockGates = vi.fn().mockResolvedValue({ passed: true, gates: {} });
      const mockDeploy = vi.fn().mockResolvedValue({ state: 'completed' });
      const mockAudit = vi.fn();

      const command = createDeployBranchCommand({
        classifier: { classify: mockClassify },
        securityGates: { runAll: mockGates },
        executor: { execute: mockDeploy },
        audit: { log: mockAudit },
      });

      await command.execute(['feature/x'], { user: 'alice' });

      expect(mockAudit).toHaveBeenCalledWith(expect.objectContaining({
        event: 'deployment_started',
        user: 'alice',
      }));
    });
  });
});
