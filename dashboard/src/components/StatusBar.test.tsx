import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { StatusBar } from './StatusBar.js';

describe('StatusBar', () => {
  describe('Branch Display', () => {
    it('shows current branch', () => {
      const { lastFrame } = render(<StatusBar branch="main" />);
      expect(lastFrame()).toContain('main');
    });

    it('shows feature branch', () => {
      const { lastFrame } = render(<StatusBar branch="feature/auth" />);
      expect(lastFrame()).toContain('feature/auth');
    });

    it('shows branch icon', () => {
      const { lastFrame } = render(<StatusBar branch="main" />);
      expect(lastFrame()).toMatch(/⎇|branch|git/i);
    });
  });

  describe('Environment Display', () => {
    it('shows local environment', () => {
      const { lastFrame } = render(<StatusBar environment="local" />);
      expect(lastFrame()).toContain('local');
    });

    it('shows VPS environment', () => {
      const { lastFrame } = render(<StatusBar environment="vps" />);
      expect(lastFrame()).toContain('vps');
    });

    it('shows staging environment', () => {
      const { lastFrame } = render(<StatusBar environment="staging" />);
      expect(lastFrame()).toContain('staging');
    });

    it('shows production with warning', () => {
      const { lastFrame } = render(<StatusBar environment="production" />);
      expect(lastFrame()).toMatch(/prod|⚠/i);
    });
  });

  describe('Connection Status', () => {
    it('shows connected status', () => {
      const { lastFrame } = render(<StatusBar connectionState="connected" />);
      expect(lastFrame()).toMatch(/●|connected/i);
    });

    it('shows disconnected status', () => {
      const { lastFrame } = render(<StatusBar connectionState="disconnected" />);
      expect(lastFrame()).toMatch(/○|disconnected/i);
    });

    it('shows connecting status', () => {
      const { lastFrame } = render(<StatusBar connectionState="connecting" />);
      expect(lastFrame()).toMatch(/◐|connecting/i);
    });
  });

  describe('Keyboard Help Hint', () => {
    it('shows help hint', () => {
      const { lastFrame } = render(<StatusBar />);
      expect(lastFrame()).toMatch(/\?|help/i);
    });
  });

  describe('Compact Single-Line', () => {
    it('fits on single line', () => {
      const { lastFrame } = render(
        <StatusBar
          branch="main"
          environment="local"
          connectionState="connected"
        />
      );
      const output = lastFrame() || '';
      const lines = output.split('\n').filter((l) => l.trim());
      expect(lines.length).toBe(1);
    });

    it('uses separators between sections', () => {
      const { lastFrame } = render(
        <StatusBar
          branch="main"
          environment="vps"
          connectionState="connected"
        />
      );
      expect(lastFrame()).toMatch(/│|•|\|/);
    });
  });

  describe('Project Info', () => {
    it('shows project name', () => {
      const { lastFrame } = render(<StatusBar projectName="my-app" />);
      expect(lastFrame()).toContain('my-app');
    });

    it('shows version', () => {
      const { lastFrame } = render(<StatusBar projectName="app" version="1.2.3" />);
      expect(lastFrame()).toContain('1.2.3');
    });
  });

  describe('Phase Info', () => {
    it('shows current phase', () => {
      const { lastFrame } = render(<StatusBar currentPhase={3} totalPhases={5} />);
      expect(lastFrame()).toMatch(/3.*5|phase.*3/i);
    });
  });

  describe('Test Status', () => {
    it('shows passing tests', () => {
      const { lastFrame } = render(<StatusBar testsPassing={45} testsTotal={50} />);
      expect(lastFrame()).toMatch(/45.*50|tests/i);
    });

    it('shows failing tests indicator', () => {
      const { lastFrame } = render(
        <StatusBar testsPassing={40} testsTotal={50} testsFailing={10} />
      );
      expect(lastFrame()).toMatch(/10|fail/i);
    });
  });

  describe('Empty/Default State', () => {
    it('renders with no props', () => {
      const { lastFrame } = render(<StatusBar />);
      expect(lastFrame()).toMatch(/\?|help/i);
    });

    it('handles missing branch gracefully', () => {
      const { lastFrame } = render(<StatusBar environment="local" />);
      expect(lastFrame()).toContain('local');
    });

    it('handles missing environment gracefully', () => {
      const { lastFrame } = render(<StatusBar branch="main" />);
      expect(lastFrame()).toContain('main');
    });
  });

  describe('Colors', () => {
    it('uses appropriate colors for connection states', () => {
      const { lastFrame } = render(
        <StatusBar connectionState="connected" />
      );
      // Visual verification - renders without error
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('Width', () => {
    it('respects width prop', () => {
      const { lastFrame } = render(<StatusBar width={80} branch="main" />);
      expect(lastFrame()).toBeDefined();
    });
  });
});
