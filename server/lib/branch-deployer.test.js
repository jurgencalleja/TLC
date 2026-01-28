import { describe, it, expect } from 'vitest';
import {
  DEPLOYMENT_STATUS,
  sanitizeBranchName,
  generateSubdomain,
  generateContainerName,
  generatePort,
  generateProxyConfig,
  createBranchDeployer,
} from './branch-deployer.js';

describe('branch-deployer', () => {
  describe('DEPLOYMENT_STATUS', () => {
    it('defines all statuses', () => {
      expect(DEPLOYMENT_STATUS.PENDING).toBe('pending');
      expect(DEPLOYMENT_STATUS.CLONING).toBe('cloning');
      expect(DEPLOYMENT_STATUS.BUILDING).toBe('building');
      expect(DEPLOYMENT_STATUS.STARTING).toBe('starting');
      expect(DEPLOYMENT_STATUS.RUNNING).toBe('running');
      expect(DEPLOYMENT_STATUS.FAILED).toBe('failed');
      expect(DEPLOYMENT_STATUS.STOPPED).toBe('stopped');
    });
  });

  describe('sanitizeBranchName', () => {
    it('converts to lowercase', () => {
      expect(sanitizeBranchName('MAIN')).toBe('main');
      expect(sanitizeBranchName('Feature')).toBe('feature');
    });

    it('replaces invalid characters with dashes', () => {
      expect(sanitizeBranchName('feature/auth')).toBe('feature-auth');
      expect(sanitizeBranchName('feature_test')).toBe('feature-test');
      expect(sanitizeBranchName('feature@special#chars')).toBe('feature-special-chars');
    });

    it('collapses multiple dashes', () => {
      expect(sanitizeBranchName('feature--auth')).toBe('feature-auth');
      expect(sanitizeBranchName('a---b---c')).toBe('a-b-c');
    });

    it('removes leading and trailing dashes', () => {
      expect(sanitizeBranchName('-feature-')).toBe('feature');
      expect(sanitizeBranchName('--test--')).toBe('test');
    });

    it('truncates to 63 characters', () => {
      const longName = 'a'.repeat(100);
      expect(sanitizeBranchName(longName).length).toBe(63);
    });

    it('handles empty/null input', () => {
      expect(sanitizeBranchName(null)).toBe('unknown');
      expect(sanitizeBranchName('')).toBe('unknown');
    });

    it('handles real branch names', () => {
      expect(sanitizeBranchName('feature/user-auth')).toBe('feature-user-auth');
      expect(sanitizeBranchName('bugfix/ISSUE-123')).toBe('bugfix-issue-123');
      expect(sanitizeBranchName('release/v1.0.0')).toBe('release-v1-0-0');
    });
  });

  describe('generateSubdomain', () => {
    it('creates subdomain from branch and domain', () => {
      expect(generateSubdomain('main', 'app.example.com')).toBe('main.app.example.com');
    });

    it('sanitizes branch name', () => {
      expect(generateSubdomain('feature/auth', 'app.example.com')).toBe('feature-auth.app.example.com');
    });

    it('handles complex branch names', () => {
      expect(generateSubdomain('feature/ISSUE-123_auth', 'dev.app.com')).toBe('feature-issue-123-auth.dev.app.com');
    });
  });

  describe('generateContainerName', () => {
    it('creates container name from project and branch', () => {
      expect(generateContainerName('myapp', 'main')).toBe('tlc-myapp-main');
    });

    it('sanitizes both project and branch', () => {
      expect(generateContainerName('My App', 'feature/auth')).toBe('tlc-my-app-feature-auth');
    });

    it('handles special characters', () => {
      expect(generateContainerName('app@v2', 'release/1.0')).toBe('tlc-app-v2-release-1-0');
    });
  });

  describe('generatePort', () => {
    it('generates port from base port', () => {
      const port = generatePort('main', 10000);
      expect(port).toBeGreaterThanOrEqual(10000);
      expect(port).toBeLessThan(20000);
    });

    it('generates consistent port for same branch', () => {
      const port1 = generatePort('feature-auth', 10000);
      const port2 = generatePort('feature-auth', 10000);
      expect(port1).toBe(port2);
    });

    it('generates different ports for different branches', () => {
      const port1 = generatePort('main', 10000);
      const port2 = generatePort('develop', 10000);
      expect(port1).not.toBe(port2);
    });

    it('uses default base port', () => {
      const port = generatePort('main');
      expect(port).toBeGreaterThanOrEqual(10000);
    });
  });

  describe('generateProxyConfig', () => {
    describe('caddy', () => {
      it('generates Caddy config', () => {
        const config = generateProxyConfig({
          type: 'caddy',
          subdomain: 'feature.app.com',
          targetPort: 10001,
        });

        expect(config).toContain('feature.app.com');
        expect(config).toContain('reverse_proxy localhost:10001');
        expect(config).toContain('tls internal');
      });

      it('omits tls for ssl=false', () => {
        const config = generateProxyConfig({
          type: 'caddy',
          subdomain: 'feature.app.com',
          targetPort: 10001,
          ssl: false,
        });

        expect(config).not.toContain('tls');
      });
    });

    describe('nginx', () => {
      it('generates nginx config', () => {
        const config = generateProxyConfig({
          type: 'nginx',
          subdomain: 'feature.app.com',
          targetPort: 10001,
        });

        expect(config).toContain('server_name feature.app.com');
        expect(config).toContain('proxy_pass http://localhost:10001');
        expect(config).toContain('proxy_http_version 1.1');
      });

      it('includes WebSocket headers', () => {
        const config = generateProxyConfig({
          type: 'nginx',
          subdomain: 'feature.app.com',
          targetPort: 10001,
        });

        expect(config).toContain('Upgrade');
        expect(config).toContain('Connection');
      });
    });

    it('throws for unknown proxy type', () => {
      expect(() => generateProxyConfig({
        type: 'unknown',
        subdomain: 'test.com',
        targetPort: 3000,
      })).toThrow('Unknown proxy type');
    });
  });

  describe('createBranchDeployer', () => {
    it('creates deployer with methods', () => {
      const deployer = createBranchDeployer();

      expect(deployer.deploy).toBeDefined();
      expect(deployer.stop).toBeDefined();
      expect(deployer.status).toBeDefined();
      expect(deployer.logs).toBeDefined();
      expect(deployer.list).toBeDefined();
      expect(deployer.getDeployment).toBeDefined();
    });

    it('exposes helper functions', () => {
      const deployer = createBranchDeployer();

      expect(deployer.generateSubdomain).toBeDefined();
      expect(deployer.generateContainerName).toBeDefined();
      expect(deployer.generatePort).toBeDefined();
    });

    it('exposes DEPLOYMENT_STATUS', () => {
      const deployer = createBranchDeployer();
      expect(deployer.DEPLOYMENT_STATUS).toBeDefined();
      expect(deployer.DEPLOYMENT_STATUS.RUNNING).toBe('running');
    });

    it('uses provided options', () => {
      const deployer = createBranchDeployer({
        workDir: '/custom/path',
        baseDomain: 'custom.com',
        basePort: 20000,
      });

      expect(deployer.generateSubdomain('main', 'custom.com')).toBe('main.custom.com');
    });
  });
});
