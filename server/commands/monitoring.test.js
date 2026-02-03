/**
 * Monitoring Command Tests
 */
import { describe, it, expect, vi } from 'vitest';
import {
  parseMonitoringArgs,
  runStatusCommand,
  runMetricsCommand,
  runAlertsCommand,
  runIncidentsCommand,
  createMonitoringCommand,
} from './monitoring.js';

describe('monitoring command', () => {
  describe('parseMonitoringArgs', () => {
    it('parses status subcommand', () => {
      const args = parseMonitoringArgs(['status']);
      expect(args.subcommand).toBe('status');
    });

    it('parses metrics subcommand', () => {
      const args = parseMonitoringArgs(['metrics', '--format', 'prometheus']);
      expect(args.subcommand).toBe('metrics');
      expect(args.format).toBe('prometheus');
    });

    it('parses alerts subcommand', () => {
      const args = parseMonitoringArgs(['alerts', '--severity', 'critical']);
      expect(args.subcommand).toBe('alerts');
      expect(args.severity).toBe('critical');
    });

    it('parses incidents subcommand', () => {
      const args = parseMonitoringArgs(['incidents', '--status', 'open']);
      expect(args.subcommand).toBe('incidents');
      expect(args.status).toBe('open');
    });

    it('parses --json flag', () => {
      const args = parseMonitoringArgs(['status', '--json']);
      expect(args.json).toBe(true);
    });
  });

  describe('runStatusCommand', () => {
    it('shows health status', async () => {
      const result = await runStatusCommand({});
      expect(result.health).toBeDefined();
    });
  });

  describe('runMetricsCommand', () => {
    it('returns metrics', async () => {
      const result = await runMetricsCommand({});
      expect(result.metrics).toBeDefined();
    });

    it('formats as Prometheus', async () => {
      const result = await runMetricsCommand({ format: 'prometheus' });
      expect(result.output).toContain('# TYPE');
    });
  });

  describe('runAlertsCommand', () => {
    it('lists alerts', async () => {
      const result = await runAlertsCommand({});
      expect(result.alerts).toBeDefined();
    });

    it('filters by severity', async () => {
      const mockAlerts = [
        { severity: 'critical' },
        { severity: 'warning' },
      ];
      const result = await runAlertsCommand({ severity: 'critical', mockAlerts });
      expect(result.alerts.every(a => a.severity === 'critical')).toBe(true);
    });
  });

  describe('runIncidentsCommand', () => {
    it('lists incidents', async () => {
      const result = await runIncidentsCommand({});
      expect(result.incidents).toBeDefined();
    });
  });

  describe('createMonitoringCommand', () => {
    it('creates command with name', () => {
      const command = createMonitoringCommand();
      expect(command.name).toBe('monitor');
    });

    it('has execute function', () => {
      const command = createMonitoringCommand();
      expect(command.execute).toBeDefined();
    });

    it('executes subcommands', async () => {
      const command = createMonitoringCommand();
      const result = await command.execute(['status'], {});
      expect(result).toBeDefined();
    });
  });
});
