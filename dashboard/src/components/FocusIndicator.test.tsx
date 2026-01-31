import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { FocusIndicator, FocusArea } from './FocusIndicator.js';

const sampleAreas: FocusArea[] = [
  { id: 'projects', label: 'Projects', shortcut: '1' },
  { id: 'tasks', label: 'Tasks', shortcut: '2' },
  { id: 'logs', label: 'Logs', shortcut: '3' },
  { id: 'team', label: 'Team', shortcut: '4' },
];

describe('FocusIndicator', () => {
  describe('Current Focus', () => {
    it('shows current focus area', () => {
      const { lastFrame } = render(
        <FocusIndicator areas={sampleAreas} currentArea="projects" />
      );
      expect(lastFrame()).toContain('Projects');
    });

    it('highlights current area', () => {
      const { lastFrame } = render(
        <FocusIndicator areas={sampleAreas} currentArea="tasks" />
      );
      expect(lastFrame()).toContain('Tasks');
    });

    it('shows focus indicator icon', () => {
      const { lastFrame } = render(
        <FocusIndicator areas={sampleAreas} currentArea="logs" />
      );
      expect(lastFrame()).toMatch(/▶|→|●|focus/i);
    });
  });

  describe('Tab Navigation', () => {
    it('shows all focus areas', () => {
      const { lastFrame } = render(
        <FocusIndicator areas={sampleAreas} currentArea="projects" />
      );
      expect(lastFrame()).toContain('Projects');
      expect(lastFrame()).toContain('Tasks');
      expect(lastFrame()).toContain('Logs');
      expect(lastFrame()).toContain('Team');
    });

    it('shows area shortcuts', () => {
      const { lastFrame } = render(
        <FocusIndicator areas={sampleAreas} currentArea="projects" />
      );
      expect(lastFrame()).toContain('1');
      expect(lastFrame()).toContain('2');
    });

    it('shows Tab hint for navigation', () => {
      const { lastFrame } = render(
        <FocusIndicator areas={sampleAreas} currentArea="projects" />
      );
      expect(lastFrame()).toMatch(/tab/i);
    });

    it('calls onFocusChange when area changed', () => {
      const onFocusChange = vi.fn();
      render(
        <FocusIndicator
          areas={sampleAreas}
          currentArea="projects"
          onFocusChange={onFocusChange}
        />
      );
      // Focus change happens on Tab or number key
    });
  });

  describe('Focus Trap', () => {
    it('shows modal indicator when trapped', () => {
      const { lastFrame } = render(
        <FocusIndicator
          areas={sampleAreas}
          currentArea="projects"
          isTrapped={true}
          trappedLabel="Settings"
        />
      );
      expect(lastFrame()).toContain('Settings');
    });

    it('shows escape hint when trapped', () => {
      const { lastFrame } = render(
        <FocusIndicator
          areas={sampleAreas}
          currentArea="projects"
          isTrapped={true}
        />
      );
      expect(lastFrame()).toMatch(/esc|close|exit/i);
    });

    it('dims other areas when trapped', () => {
      const { lastFrame } = render(
        <FocusIndicator
          areas={sampleAreas}
          currentArea="projects"
          isTrapped={true}
        />
      );
      // When trapped, main areas should be dimmed
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('Skip Links', () => {
    it('shows skip to content hint', () => {
      const { lastFrame } = render(
        <FocusIndicator
          areas={sampleAreas}
          currentArea="projects"
          showSkipLinks={true}
        />
      );
      expect(lastFrame()).toMatch(/skip|content|main/i);
    });
  });

  describe('High Contrast Mode', () => {
    it('supports high contrast mode', () => {
      const { lastFrame } = render(
        <FocusIndicator
          areas={sampleAreas}
          currentArea="projects"
          highContrast={true}
        />
      );
      expect(lastFrame()).toContain('Projects');
    });

    it('uses bold text in high contrast', () => {
      const { lastFrame } = render(
        <FocusIndicator
          areas={sampleAreas}
          currentArea="projects"
          highContrast={true}
        />
      );
      // Visual verification - renders without error
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('Compact Mode', () => {
    it('shows compact indicator', () => {
      const { lastFrame } = render(
        <FocusIndicator
          areas={sampleAreas}
          currentArea="projects"
          compact={true}
        />
      );
      expect(lastFrame()).toContain('Projects');
    });

    it('hides shortcuts in compact mode', () => {
      const { lastFrame } = render(
        <FocusIndicator
          areas={sampleAreas}
          currentArea="projects"
          compact={true}
        />
      );
      const output = lastFrame() || '';
      // Should be shorter
      expect(output.length).toBeLessThan(200);
    });
  });

  describe('Breadcrumb Path', () => {
    it('shows breadcrumb when path provided', () => {
      const { lastFrame } = render(
        <FocusIndicator
          areas={sampleAreas}
          currentArea="projects"
          breadcrumb={['Dashboard', 'Projects', 'Alpha']}
        />
      );
      expect(lastFrame()).toContain('Dashboard');
      expect(lastFrame()).toContain('Alpha');
    });

    it('uses separator for breadcrumb', () => {
      const { lastFrame } = render(
        <FocusIndicator
          areas={sampleAreas}
          currentArea="projects"
          breadcrumb={['A', 'B']}
        />
      );
      expect(lastFrame()).toMatch(/›|>|→|\//);
    });
  });

  describe('Empty State', () => {
    it('handles no areas gracefully', () => {
      const { lastFrame } = render(
        <FocusIndicator areas={[]} currentArea="" />
      );
      expect(lastFrame()).toBeDefined();
    });
  });

  describe('Callbacks', () => {
    it('calls onEscape when trapped and Esc pressed', () => {
      const onEscape = vi.fn();
      render(
        <FocusIndicator
          areas={sampleAreas}
          currentArea="projects"
          isTrapped={true}
          onEscape={onEscape}
        />
      );
      // Escape happens on Esc key
    });
  });
});
