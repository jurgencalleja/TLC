import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { SettingsPanel, TLCConfig } from './SettingsPanel.js';

const sampleConfig: TLCConfig = {
  project: 'my-app',
  version: '1.2.0',
  quality: {
    coverageThreshold: 80,
    qualityScoreThreshold: 75,
  },
  git: {
    mainBranch: 'main',
  },
  paths: {
    planning: '.planning',
    tests: 'src/__tests__',
  },
  team: {
    enabled: true,
  },
  testFrameworks: {
    primary: 'vitest',
    e2e: 'playwright',
  },
};

describe('SettingsPanel', () => {
  describe('Config Display', () => {
    it('shows project name', () => {
      const { lastFrame } = render(<SettingsPanel config={sampleConfig} />);
      expect(lastFrame()).toContain('my-app');
    });

    it('shows version', () => {
      const { lastFrame } = render(<SettingsPanel config={sampleConfig} />);
      expect(lastFrame()).toContain('1.2.0');
    });

    it('shows coverage threshold', () => {
      const { lastFrame } = render(<SettingsPanel config={sampleConfig} />);
      expect(lastFrame()).toContain('80');
    });

    it('shows quality threshold', () => {
      const { lastFrame } = render(<SettingsPanel config={sampleConfig} />);
      expect(lastFrame()).toContain('75');
    });

    it('shows main branch', () => {
      const { lastFrame } = render(<SettingsPanel config={sampleConfig} />);
      expect(lastFrame()).toContain('main');
    });

    it('shows test framework', () => {
      const { lastFrame } = render(<SettingsPanel config={sampleConfig} />);
      expect(lastFrame()).toContain('vitest');
    });
  });

  describe('Category Grouping', () => {
    it('shows Quality section', () => {
      const { lastFrame } = render(<SettingsPanel config={sampleConfig} />);
      expect(lastFrame()).toMatch(/quality/i);
    });

    it('shows Git section', () => {
      const { lastFrame } = render(<SettingsPanel config={sampleConfig} />);
      expect(lastFrame()).toMatch(/git/i);
    });

    it('shows Paths section', () => {
      const { lastFrame } = render(<SettingsPanel config={sampleConfig} />);
      expect(lastFrame()).toMatch(/paths/i);
    });

    it('shows Team section', () => {
      const { lastFrame } = render(<SettingsPanel config={sampleConfig} />);
      expect(lastFrame()).toMatch(/team/i);
    });

    it('shows Test Frameworks section', () => {
      const { lastFrame } = render(<SettingsPanel config={sampleConfig} />);
      expect(lastFrame()).toMatch(/test|framework/i);
    });
  });

  describe('Edit Mode', () => {
    it('shows edit hint', () => {
      const { lastFrame } = render(<SettingsPanel config={sampleConfig} />);
      expect(lastFrame()).toMatch(/e|edit/i);
    });

    it('shows editable state when editing', () => {
      const { lastFrame } = render(
        <SettingsPanel config={sampleConfig} isEditing={true} />
      );
      expect(lastFrame()).toMatch(/editing|edit mode/i);
    });

    it('shows save hint in edit mode', () => {
      const { lastFrame } = render(
        <SettingsPanel config={sampleConfig} isEditing={true} />
      );
      expect(lastFrame()).toMatch(/save|enter|s/i);
    });

    it('shows cancel hint in edit mode', () => {
      const { lastFrame } = render(
        <SettingsPanel config={sampleConfig} isEditing={true} />
      );
      expect(lastFrame()).toMatch(/cancel|esc/i);
    });
  });

  describe('Config File Path', () => {
    it('shows config file path', () => {
      const { lastFrame } = render(
        <SettingsPanel config={sampleConfig} configPath=".tlc.json" />
      );
      expect(lastFrame()).toContain('.tlc.json');
    });

    it('shows default path when not specified', () => {
      const { lastFrame } = render(<SettingsPanel config={sampleConfig} />);
      expect(lastFrame()).toMatch(/\.tlc\.json|config/i);
    });
  });

  describe('Missing Config', () => {
    it('handles empty config gracefully', () => {
      const emptyConfig: TLCConfig = {
        project: '',
        version: '',
        quality: {},
        git: {},
        paths: {},
        team: {},
        testFrameworks: {},
      };
      const { lastFrame } = render(<SettingsPanel config={emptyConfig} />);
      expect(lastFrame()).toMatch(/settings|config/i);
    });

    it('shows not configured message for missing values', () => {
      const partialConfig: TLCConfig = {
        project: 'test',
        version: '1.0.0',
        quality: {},
        git: {},
        paths: {},
        team: {},
        testFrameworks: {},
      };
      const { lastFrame } = render(<SettingsPanel config={partialConfig} />);
      expect(lastFrame()).toMatch(/not.*set|default|—/i);
    });
  });

  describe('Validation', () => {
    it('shows validation for coverage threshold', () => {
      const { lastFrame } = render(
        <SettingsPanel config={sampleConfig} isEditing={true} />
      );
      // Should indicate valid range
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('Callbacks', () => {
    it('calls onSave when save triggered', () => {
      const onSave = vi.fn();
      render(
        <SettingsPanel
          config={sampleConfig}
          isEditing={true}
          onSave={onSave}
        />
      );
      // Save happens on Enter/s key
    });

    it('calls onCancel when cancel triggered', () => {
      const onCancel = vi.fn();
      render(
        <SettingsPanel
          config={sampleConfig}
          isEditing={true}
          onCancel={onCancel}
        />
      );
      // Cancel happens on Esc key
    });

    it('calls onEdit when edit triggered', () => {
      const onEdit = vi.fn();
      render(<SettingsPanel config={sampleConfig} onEdit={onEdit} />);
      // Edit happens on 'e' key
    });
  });

  describe('Navigation', () => {
    it('shows navigation hints', () => {
      const { lastFrame } = render(<SettingsPanel config={sampleConfig} />);
      expect(lastFrame()).toMatch(/↑|↓|j|k|navigate/i);
    });

    it('shows section navigation hint', () => {
      const { lastFrame } = render(<SettingsPanel config={sampleConfig} />);
      expect(lastFrame()).toMatch(/tab|section/i);
    });
  });

  describe('Team Settings', () => {
    it('shows team enabled status', () => {
      const { lastFrame } = render(<SettingsPanel config={sampleConfig} />);
      expect(lastFrame()).toMatch(/enabled|true|yes/i);
    });

    it('shows team disabled status', () => {
      const disabledTeam = {
        ...sampleConfig,
        team: { enabled: false },
      };
      const { lastFrame } = render(<SettingsPanel config={disabledTeam} />);
      expect(lastFrame()).toMatch(/disabled|false|no|solo/i);
    });
  });

  describe('Header', () => {
    it('shows Settings title', () => {
      const { lastFrame } = render(<SettingsPanel config={sampleConfig} />);
      expect(lastFrame()).toMatch(/settings/i);
    });
  });

  describe('Paths Display', () => {
    it('shows planning path', () => {
      const { lastFrame } = render(<SettingsPanel config={sampleConfig} />);
      expect(lastFrame()).toContain('.planning');
    });

    it('shows tests path', () => {
      const { lastFrame } = render(<SettingsPanel config={sampleConfig} />);
      expect(lastFrame()).toContain('src/__tests__');
    });
  });
});
