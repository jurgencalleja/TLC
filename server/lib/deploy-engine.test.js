import { describe, it, expect, beforeEach, vi } from 'vitest';

const { createDeployEngine } = await import('./deploy-engine.js');

function createMockSsh() {
  return {
    exec: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
    execStream: vi.fn().mockResolvedValue(0),
    upload: vi.fn().mockResolvedValue(),
  };
}

describe('DeployEngine', () => {
  let engine;
  let mockSsh;

  beforeEach(() => {
    mockSsh = createMockSsh();
    engine = createDeployEngine({ sshClient: mockSsh });
  });

  describe('deploy', () => {
    it('executes git clone + docker compose + nginx steps', async () => {
      const sshConfig = { host: '1.2.3.4', username: 'deploy', privateKeyPath: '/key' };
      const project = { name: 'myapp', repoUrl: 'git@github.com:user/myapp.git' };
      const progress = [];

      await engine.deploy(sshConfig, project, { domain: 'myapp.dev', branch: 'main' }, (step) => progress.push(step));

      // Should have called ssh exec multiple times
      expect(mockSsh.exec.mock.calls.length).toBeGreaterThan(0);
      // Should have progress steps
      expect(progress.length).toBeGreaterThan(0);
      // Verify key steps happened
      const commands = mockSsh.exec.mock.calls.map(c => c[1]);
      expect(commands.some(c => c.includes('git'))).toBe(true);
      expect(commands.some(c => c.includes('docker'))).toBe(true);
    });

    it('generates correct Nginx config for project domain', async () => {
      const sshConfig = { host: '1.2.3.4', username: 'deploy', privateKeyPath: '/key' };
      const project = { name: 'myapp', repoUrl: 'git@github.com:user/myapp.git' };

      await engine.deploy(sshConfig, project, { domain: 'myapp.dev', branch: 'main' });

      // Should write nginx config
      const commands = mockSsh.exec.mock.calls.map(c => c[1]);
      const nginxWrite = commands.find(c => c.includes('sites-available') || c.includes('nginx'));
      expect(nginxWrite).toBeTruthy();
    });
  });

  describe('deployBranch', () => {
    it('creates subdomain config for branch', async () => {
      const sshConfig = { host: '1.2.3.4', username: 'deploy', privateKeyPath: '/key' };
      const project = { name: 'myapp', repoUrl: 'git@github.com:user/myapp.git' };

      await engine.deployBranch(sshConfig, project, 'feat-login', 'myapp.dev');

      const commands = mockSsh.exec.mock.calls.map(c => c[1]);
      expect(commands.some(c => c.includes('feat-login'))).toBe(true);
    });

    it('sanitizes branch name for DNS', async () => {
      const sshConfig = { host: '1.2.3.4', username: 'deploy', privateKeyPath: '/key' };
      const project = { name: 'myapp', repoUrl: 'git@github.com:user/myapp.git' };

      await engine.deployBranch(sshConfig, project, 'feature/login-page', 'myapp.dev');

      const commands = mockSsh.exec.mock.calls.map(c => c[1]);
      // Should contain sanitized name (slashes → dashes)
      expect(commands.some(c => c.includes('feature-login-page'))).toBe(true);
    });

    it('allocates unique port', async () => {
      mockSsh.exec.mockImplementation(async (config, cmd) => {
        if (cmd.includes('cat') && cmd.includes('ports.json')) {
          return { stdout: '{}', stderr: '', exitCode: 0 };
        }
        return { stdout: '', stderr: '', exitCode: 0 };
      });

      const sshConfig = { host: '1.2.3.4', username: 'deploy', privateKeyPath: '/key' };
      const project = { name: 'myapp', repoUrl: 'git@github.com:user/myapp.git' };

      const result = await engine.deployBranch(sshConfig, project, 'main', 'myapp.dev');
      expect(result.port).toBeGreaterThan(0);
    });
  });

  describe('rollback', () => {
    it('checks out previous commit', async () => {
      const sshConfig = { host: '1.2.3.4', username: 'deploy', privateKeyPath: '/key' };

      await engine.rollback(sshConfig, { name: 'myapp' });

      const commands = mockSsh.exec.mock.calls.map(c => c[1]);
      expect(commands.some(c => c.includes('git') && c.includes('HEAD~1'))).toBe(true);
    });
  });

  describe('cleanupBranch', () => {
    it('removes container and nginx config', async () => {
      const sshConfig = { host: '1.2.3.4', username: 'deploy', privateKeyPath: '/key' };

      await engine.cleanupBranch(sshConfig, { name: 'myapp' }, 'feat-login');

      const commands = mockSsh.exec.mock.calls.map(c => c[1]);
      expect(commands.some(c => c.includes('docker') && (c.includes('stop') || c.includes('rm')))).toBe(true);
      expect(commands.some(c => c.includes('rm') && c.includes('sites-enabled'))).toBe(true);
    });
  });

  describe('listDeployments', () => {
    it('returns active deploys', async () => {
      mockSsh.exec.mockResolvedValue({
        stdout: 'main\nfeat-login\n',
        stderr: '',
        exitCode: 0,
      });

      const sshConfig = { host: '1.2.3.4', username: 'deploy', privateKeyPath: '/key' };
      const deploys = await engine.listDeployments(sshConfig, { name: 'myapp' });
      expect(Array.isArray(deploys)).toBe(true);
    });
  });
});
