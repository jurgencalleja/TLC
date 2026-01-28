import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { ServicesPane, formatUptime, getStatusInfo } from './ServicesPane.js';

describe('ServicesPane', () => {
  describe('formatUptime', () => {
    it('returns dash for undefined', () => {
      expect(formatUptime(undefined)).toBe('-');
    });

    it('formats seconds', () => {
      expect(formatUptime(45000)).toBe('45s');
    });

    it('formats minutes and seconds', () => {
      expect(formatUptime(125000)).toBe('2m 5s');
    });

    it('formats hours and minutes', () => {
      expect(formatUptime(3700000)).toBe('1h 1m');
    });
  });

  describe('getStatusInfo', () => {
    it('returns healthy info when all running', () => {
      const services = [
        { name: 'api', state: 'running', health: 'healthy' },
        { name: 'web', state: 'running', health: 'healthy' },
      ];

      const info = getStatusInfo(services);

      expect(info.text).toContain('healthy');
      expect(info.running).toBe(2);
      expect(info.total).toBe(2);
    });

    it('returns stopped info when none running', () => {
      const services = [
        { name: 'api', state: 'stopped' },
        { name: 'web', state: 'stopped' },
      ];

      const info = getStatusInfo(services);

      expect(info.text).toBe('Stopped');
      expect(info.running).toBe(0);
    });

    it('returns partial info when some running', () => {
      const services = [
        { name: 'api', state: 'running' },
        { name: 'web', state: 'stopped' },
      ];

      const info = getStatusInfo(services);

      expect(info.text).toContain('1/2');
    });
  });

  describe('component rendering', () => {
    it('renders empty state when no services', () => {
      const { lastFrame } = render(<ServicesPane services={[]} isActive={false} />);
      const output = lastFrame();

      expect(output).toContain('No services');
    });

    it('renders service cards', () => {
      const services = [
        { name: 'api', type: 'express', port: 3001, state: 'running' as const },
        { name: 'web', type: 'vite', port: 3000, state: 'running' as const },
      ];

      const { lastFrame } = render(<ServicesPane services={services} isActive={false} />);
      const output = lastFrame();

      expect(output).toContain('api');
      expect(output).toContain('web');
      expect(output).toContain('express');
      expect(output).toContain('vite');
    });

    it('shows stack status summary', () => {
      const services = [
        { name: 'api', type: 'express', port: 3001, state: 'running' as const },
        { name: 'db', type: 'postgres', port: 5432, state: 'stopped' as const },
      ];

      const { lastFrame } = render(<ServicesPane services={services} isActive={false} />);
      const output = lastFrame();

      expect(output).toContain('1/2');
    });

    it('shows state icons', () => {
      const services = [
        { name: 'api', type: 'express', port: 3001, state: 'running' as const },
        { name: 'worker', type: 'node', port: 3002, state: 'stopped' as const },
      ];

      const { lastFrame } = render(<ServicesPane services={services} isActive={false} />);
      const output = lastFrame();

      expect(output).toContain('🟢');
      expect(output).toContain('⚪');
    });

    it('shows controls when active', () => {
      const services = [
        { name: 'api', type: 'express', port: 3001, state: 'running' as const },
      ];

      const { lastFrame } = render(<ServicesPane services={services} isActive={true} />);
      const output = lastFrame();

      expect(output).toContain('[r]');
    });

    it('hides controls when inactive', () => {
      const services = [
        { name: 'api', type: 'express', port: 3001, state: 'running' as const },
      ];

      const { lastFrame } = render(<ServicesPane services={services} isActive={false} />);
      const output = lastFrame();

      expect(output).not.toContain('[r] Restart');
    });
  });
});
