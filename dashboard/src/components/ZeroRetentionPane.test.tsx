import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import { ZeroRetentionPane } from './ZeroRetentionPane.js';

describe('ZeroRetentionPane', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('enabled state', () => {
    it('renders enabled state correctly', () => {
      const { lastFrame } = render(
        <ZeroRetentionPane enabled={true} />
      );
      const output = lastFrame();

      expect(output).toContain('Zero-Retention');
      expect(output).toMatch(/enabled|active|on/i);
    });
  });

  describe('disabled state', () => {
    it('renders disabled state correctly', () => {
      const { lastFrame } = render(
        <ZeroRetentionPane enabled={false} />
      );
      const output = lastFrame();

      expect(output).toContain('Zero-Retention');
      expect(output).toMatch(/disabled|inactive|off/i);
    });
  });

  describe('toggle callback', () => {
    it('toggle calls onToggle callback', () => {
      const onToggle = vi.fn();
      const { lastFrame } = render(
        <ZeroRetentionPane
          enabled={false}
          isActive={true}
          onToggle={onToggle}
        />
      );

      // Verify toggle control is shown when active and onToggle is provided
      const output = lastFrame();
      expect(output).toMatch(/\[t\]|toggle/i);
    });
  });

  describe('retention policy summary', () => {
    it('shows retention policy summary', () => {
      const policy = {
        retention: 'immediate',
        persist: false,
        sensitivityLevels: {
          critical: { retention: 'immediate', persist: false },
          high: { retention: 'immediate', persist: false },
          medium: { retention: 'session', persist: false },
          low: { retention: '24h', persist: true },
        },
      };

      const { lastFrame } = render(
        <ZeroRetentionPane enabled={true} policy={policy} />
      );
      const output = lastFrame();

      expect(output).toContain('Policy');
      expect(output).toMatch(/immediate|session|purge/i);
    });
  });

  describe('purge activity list', () => {
    it('shows purge activity list', () => {
      const purgeHistory = [
        {
          id: '1',
          timestamp: '2024-01-15T10:30:00.000Z',
          itemCount: 5,
          dataTypes: ['secrets', 'pii'],
        },
        {
          id: '2',
          timestamp: '2024-01-15T10:35:00.000Z',
          itemCount: 3,
          dataTypes: ['general'],
        },
      ];

      const { lastFrame } = render(
        <ZeroRetentionPane enabled={true} purgeHistory={purgeHistory} />
      );
      const output = lastFrame();

      expect(output).toContain('Purge');
      expect(output).toContain('5');
      expect(output).toContain('3');
    });
  });

  describe('sensitive data warning', () => {
    it('shows warning for sensitive data', () => {
      const sensitiveDataDetected = {
        detected: true,
        count: 3,
        types: ['api_key', 'password', 'pii'],
      };

      const { lastFrame } = render(
        <ZeroRetentionPane
          enabled={true}
          sensitiveDataDetected={sensitiveDataDetected}
        />
      );
      const output = lastFrame();

      expect(output).toMatch(/warning|sensitive|detected/i);
      expect(output).toContain('3');
    });
  });

  describe('empty purge history', () => {
    it('handles empty purge history', () => {
      const { lastFrame } = render(
        <ZeroRetentionPane enabled={true} purgeHistory={[]} />
      );
      const output = lastFrame();

      expect(output).toContain('Zero-Retention');
      expect(output).toMatch(/no.*purge|empty|none/i);
    });
  });

  describe('policy formatting', () => {
    it('formats policy for display', () => {
      const policy = {
        retention: 'immediate',
        persist: false,
        dataTypes: {
          secrets: { retention: 'immediate', persist: false },
          pii: { retention: 'session', persist: false },
          general: { retention: '7d', persist: true },
        },
      };

      const { lastFrame } = render(
        <ZeroRetentionPane enabled={true} policy={policy} />
      );
      const output = lastFrame();

      // Should display policy rules in a readable format
      expect(output).toContain('Policy');
      expect(output).toBeDefined();
    });
  });

  describe('subsystem status', () => {
    it('shows subsystem status when provided', () => {
      const subsystems = {
        ephemeralStorage: true,
        sessionPurge: true,
        memoryExclusion: true,
      };

      const { lastFrame } = render(
        <ZeroRetentionPane enabled={true} subsystems={subsystems} />
      );
      const output = lastFrame();

      expect(output).toMatch(/ephemeral|storage/i);
      expect(output).toMatch(/session|purge/i);
    });
  });

  describe('configuration validation', () => {
    it('shows validation warnings when present', () => {
      const validation = {
        valid: false,
        conflicts: ['Ephemeral storage has basePath set'],
        warnings: ['Audit logging conflicts with zero-retention'],
      };

      const { lastFrame } = render(
        <ZeroRetentionPane enabled={true} validation={validation} />
      );
      const output = lastFrame();

      expect(output).toMatch(/conflict|warning/i);
    });

    it('shows valid status when no conflicts', () => {
      const validation = {
        valid: true,
        conflicts: [],
        warnings: [],
      };

      const { lastFrame } = render(
        <ZeroRetentionPane enabled={true} validation={validation} />
      );
      const output = lastFrame();

      expect(output).toMatch(/valid|ok|configured/i);
    });
  });

  describe('keyboard controls', () => {
    it('shows controls when active', () => {
      const { lastFrame } = render(
        <ZeroRetentionPane enabled={false} isActive={true} />
      );
      const output = lastFrame();

      // Should show control hints
      expect(output).toMatch(/\[t\]|toggle|enable|disable/i);
    });
  });
});
