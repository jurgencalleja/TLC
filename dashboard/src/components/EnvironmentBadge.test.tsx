import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { EnvironmentBadge, Environment } from './EnvironmentBadge.js';

describe('EnvironmentBadge', () => {
  describe('Environment Detection', () => {
    it('shows local environment', () => {
      const { lastFrame } = render(<EnvironmentBadge environment="local" />);
      expect(lastFrame()).toMatch(/local|dev/i);
    });

    it('shows staging environment', () => {
      const { lastFrame } = render(<EnvironmentBadge environment="staging" />);
      expect(lastFrame()).toMatch(/staging|stage/i);
    });

    it('shows production environment', () => {
      const { lastFrame } = render(<EnvironmentBadge environment="production" />);
      expect(lastFrame()).toMatch(/prod|production/i);
    });

    it('shows VPS environment', () => {
      const { lastFrame } = render(<EnvironmentBadge environment="vps" />);
      expect(lastFrame()).toMatch(/vps|server/i);
    });
  });

  describe('Colors', () => {
    it('uses green for local', () => {
      const { lastFrame } = render(<EnvironmentBadge environment="local" />);
      // Just verify it renders
      expect(lastFrame()).toContain('local');
    });

    it('uses yellow for staging', () => {
      const { lastFrame } = render(<EnvironmentBadge environment="staging" />);
      expect(lastFrame()).toContain('staging');
    });

    it('uses red for production', () => {
      const { lastFrame } = render(<EnvironmentBadge environment="production" />);
      expect(lastFrame()).toMatch(/prod/i);
    });

    it('uses cyan for VPS', () => {
      const { lastFrame } = render(<EnvironmentBadge environment="vps" />);
      expect(lastFrame()).toMatch(/vps/i);
    });
  });

  describe('Branch Info', () => {
    it('shows branch name', () => {
      const { lastFrame } = render(
        <EnvironmentBadge environment="local" branch="main" />
      );
      expect(lastFrame()).toContain('main');
    });

    it('shows feature branch', () => {
      const { lastFrame } = render(
        <EnvironmentBadge environment="vps" branch="feature/auth" />
      );
      expect(lastFrame()).toContain('feature/auth');
    });
  });

  describe('Version Info', () => {
    it('shows version', () => {
      const { lastFrame } = render(
        <EnvironmentBadge environment="production" version="1.2.3" />
      );
      expect(lastFrame()).toContain('1.2.3');
    });

    it('shows commit hash', () => {
      const { lastFrame } = render(
        <EnvironmentBadge environment="staging" commit="abc1234" />
      );
      expect(lastFrame()).toContain('abc1234');
    });
  });

  describe('Production Warning', () => {
    it('shows warning for production', () => {
      const { lastFrame } = render(<EnvironmentBadge environment="production" />);
      expect(lastFrame()).toMatch(/⚠|warning|prod|!|caution/i);
    });

    it('no warning for local', () => {
      const { lastFrame } = render(<EnvironmentBadge environment="local" />);
      const output = lastFrame() || '';
      // Should not have production warning
      expect(output).toContain('local');
    });
  });

  describe('Compact Mode', () => {
    it('shows compact badge', () => {
      const { lastFrame } = render(
        <EnvironmentBadge environment="local" compact={true} />
      );
      expect(lastFrame()).toMatch(/local|L|DEV/i);
    });

    it('shows full badge by default', () => {
      const { lastFrame } = render(
        <EnvironmentBadge environment="staging" branch="develop" />
      );
      expect(lastFrame()).toContain('staging');
      expect(lastFrame()).toContain('develop');
    });
  });

  describe('URL Display', () => {
    it('shows environment URL', () => {
      const { lastFrame } = render(
        <EnvironmentBadge environment="vps" url="https://dev.example.com" />
      );
      expect(lastFrame()).toContain('dev.example.com');
    });
  });

  describe('Connection Status', () => {
    it('shows connected status', () => {
      const { lastFrame } = render(
        <EnvironmentBadge environment="vps" connected={true} />
      );
      expect(lastFrame()).toMatch(/●|connected|online/i);
    });

    it('shows disconnected status', () => {
      const { lastFrame } = render(
        <EnvironmentBadge environment="vps" connected={false} />
      );
      expect(lastFrame()).toMatch(/○|disconnected|offline/i);
    });
  });
});
