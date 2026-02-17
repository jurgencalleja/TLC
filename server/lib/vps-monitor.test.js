import { describe, it, expect, beforeEach, vi } from 'vitest';

const { createVpsMonitor } = await import('./vps-monitor.js');

function createMockSsh() {
  return {
    exec: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
  };
}

describe('VPS Monitor', () => {
  let monitor;
  let mockSsh;

  beforeEach(() => {
    mockSsh = createMockSsh();
    monitor = createVpsMonitor({ sshClient: mockSsh });
  });

  describe('getServerMetrics', () => {
    it('parses disk usage from df output', async () => {
      mockSsh.exec.mockImplementation(async (config, cmd) => {
        if (cmd.includes('df')) return { stdout: '/dev/sda1 50G 20G 28G 42% /', stderr: '', exitCode: 0 };
        if (cmd.includes('free')) return { stdout: '              total        used        free\nMem:        8000000     4000000     3000000', stderr: '', exitCode: 0 };
        if (cmd.includes('nproc')) return { stdout: '4', stderr: '', exitCode: 0 };
        if (cmd.includes('/proc/stat')) return { stdout: 'cpu  1000 200 300 7000 100 0 0 0', stderr: '', exitCode: 0 };
        if (cmd.includes('uptime')) return { stdout: ' 12:00:00 up 30 days', stderr: '', exitCode: 0 };
        if (cmd.includes('docker')) return { stdout: '[]', stderr: '', exitCode: 0 };
        return { stdout: '', stderr: '', exitCode: 0 };
      });

      const metrics = await monitor.getServerMetrics({ host: '1.2.3.4', username: 'deploy' });
      expect(metrics.disk).toBeDefined();
      expect(metrics.disk.usedPercent).toBe(42);
    });

    it('parses memory from free output', async () => {
      mockSsh.exec.mockImplementation(async (config, cmd) => {
        if (cmd.includes('df')) return { stdout: '/dev/sda1 50G 20G 28G 42% /', stderr: '', exitCode: 0 };
        if (cmd.includes('free')) return { stdout: '              total        used        free\nMem:        8000000     4000000     3000000', stderr: '', exitCode: 0 };
        if (cmd.includes('nproc')) return { stdout: '4', stderr: '', exitCode: 0 };
        if (cmd.includes('/proc/stat')) return { stdout: 'cpu  1000 200 300 7000 100 0 0 0', stderr: '', exitCode: 0 };
        if (cmd.includes('uptime')) return { stdout: ' 12:00:00 up 30 days', stderr: '', exitCode: 0 };
        if (cmd.includes('docker')) return { stdout: '[]', stderr: '', exitCode: 0 };
        return { stdout: '', stderr: '', exitCode: 0 };
      });

      const metrics = await monitor.getServerMetrics({ host: '1.2.3.4', username: 'deploy' });
      expect(metrics.memory).toBeDefined();
      expect(metrics.memory.totalKb).toBe(8000000);
      expect(metrics.memory.usedKb).toBe(4000000);
    });
  });

  describe('checkAlerts', () => {
    it('returns warning for disk > 80%', () => {
      const alerts = monitor.checkAlerts({ disk: { usedPercent: 85 }, memory: { usedPercent: 50 }, containers: [] });
      expect(alerts.some(a => a.level === 'warning' && a.type === 'disk')).toBe(true);
    });

    it('returns critical for disk > 90%', () => {
      const alerts = monitor.checkAlerts({ disk: { usedPercent: 95 }, memory: { usedPercent: 50 }, containers: [] });
      expect(alerts.some(a => a.level === 'critical' && a.type === 'disk')).toBe(true);
    });

    it('returns alert for crashed container', () => {
      const alerts = monitor.checkAlerts({
        disk: { usedPercent: 30 },
        memory: { usedPercent: 50 },
        containers: [{ name: 'myapp', state: 'exited', exitCode: 1 }],
      });
      expect(alerts.some(a => a.type === 'container')).toBe(true);
    });

    it('returns no alerts when everything is healthy', () => {
      const alerts = monitor.checkAlerts({
        disk: { usedPercent: 30 },
        memory: { usedPercent: 50 },
        containers: [{ name: 'myapp', state: 'running', exitCode: 0 }],
      });
      expect(alerts).toHaveLength(0);
    });
  });

  describe('checkSslExpiry', () => {
    it('parses cert expiry date', async () => {
      mockSsh.exec.mockResolvedValue({
        stdout: 'notAfter=Mar 15 00:00:00 2026 GMT',
        stderr: '',
        exitCode: 0,
      });

      const expiry = await monitor.checkSslExpiry({ host: '1.2.3.4', username: 'deploy' }, 'myapp.dev');
      expect(expiry.domain).toBe('myapp.dev');
      expect(expiry.expiresAt).toBeTruthy();
    });
  });
});
