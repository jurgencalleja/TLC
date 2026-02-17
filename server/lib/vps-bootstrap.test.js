import { describe, it, expect } from 'vitest';

const { generateBootstrapScript, checkBootstrapStatus } = await import('./vps-bootstrap.js');

describe('VPS Bootstrap', () => {
  describe('generateBootstrapScript', () => {
    it('returns a valid bash script', () => {
      const script = generateBootstrapScript({ deployUser: 'deploy' });
      expect(script).toContain('#!/bin/bash');
    });

    it('includes Docker install step', () => {
      const script = generateBootstrapScript({});
      expect(script).toContain('docker');
      expect(script).toMatch(/get.docker.com|install.*docker/i);
    });

    it('includes Nginx install step', () => {
      const script = generateBootstrapScript({});
      expect(script).toContain('nginx');
      expect(script).toMatch(/apt.*install.*nginx|install.*nginx/i);
    });

    it('includes UFW firewall config (ports 22, 80, 443)', () => {
      const script = generateBootstrapScript({});
      expect(script).toContain('ufw');
      expect(script).toContain('22');
      expect(script).toContain('80');
      expect(script).toContain('443');
    });

    it('includes Certbot install for SSL', () => {
      const script = generateBootstrapScript({});
      expect(script).toContain('certbot');
    });

    it('creates deploy user when specified', () => {
      const script = generateBootstrapScript({ deployUser: 'deploy' });
      expect(script).toContain('deploy');
      expect(script).toMatch(/useradd|adduser/);
    });

    it('is idempotent (checks before installing)', () => {
      const script = generateBootstrapScript({});
      // Should check if Docker already installed
      expect(script).toMatch(/which docker|command -v docker|docker.*--version/);
    });
  });

  describe('checkBootstrapStatus', () => {
    it('parses installed components from SSH output', () => {
      const output = {
        docker: 'Docker version 24.0.0, build abc123',
        nginx: 'nginx/1.22.1',
        certbot: 'certbot 2.0.0',
        ufw: 'Status: active',
      };
      const status = checkBootstrapStatus(output);
      expect(status.docker).toBe(true);
      expect(status.nginx).toBe(true);
      expect(status.certbot).toBe(true);
      expect(status.firewall).toBe(true);
    });

    it('detects missing components', () => {
      const output = {
        docker: 'command not found',
        nginx: 'command not found',
        certbot: 'command not found',
        ufw: 'Status: inactive',
      };
      const status = checkBootstrapStatus(output);
      expect(status.docker).toBe(false);
      expect(status.nginx).toBe(false);
      expect(status.certbot).toBe(false);
      expect(status.firewall).toBe(false);
    });
  });
});
