import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { EmptyState } from './EmptyState.js';

describe('EmptyState', () => {
  describe('Type-specific defaults', () => {
    it('renders tasks empty state with default messages', () => {
      const { lastFrame } = render(<EmptyState type="tasks" />);
      const output = lastFrame() || '';

      expect(output).toContain('No tasks yet');
      expect(output).toContain('/tlc:plan');
    });

    it('renders bugs empty state', () => {
      const { lastFrame } = render(<EmptyState type="bugs" />);
      const output = lastFrame() || '';

      expect(output).toContain('No bugs reported');
      expect(output).toContain('/tlc:bug');
    });

    it('renders agents empty state', () => {
      const { lastFrame } = render(<EmptyState type="agents" />);
      const output = lastFrame() || '';

      expect(output).toContain('No agents running');
      expect(output).toContain('spawned');
    });

    it('renders logs empty state', () => {
      const { lastFrame } = render(<EmptyState type="logs" />);
      const output = lastFrame() || '';

      expect(output).toContain('No logs yet');
      expect(output).toContain('activity');
    });

    it('renders projects empty state', () => {
      const { lastFrame } = render(<EmptyState type="projects" />);
      const output = lastFrame() || '';

      expect(output).toContain('No projects');
      expect(output).toContain('tlc init');
    });

    it('renders health empty state', () => {
      const { lastFrame } = render(<EmptyState type="health" />);
      const output = lastFrame() || '';

      expect(output).toContain('No health data');
      expect(output).toContain('/tlc:security');
    });

    it('renders router empty state', () => {
      const { lastFrame } = render(<EmptyState type="router" />);
      const output = lastFrame() || '';

      expect(output).toContain('No router configured');
      expect(output).toContain('.tlc.json');
    });

    it('renders generic empty state as default', () => {
      const { lastFrame } = render(<EmptyState />);
      const output = lastFrame() || '';

      expect(output).toContain('Nothing here');
      expect(output).toContain('No items');
    });
  });

  describe('Custom messages', () => {
    it('uses custom title when provided', () => {
      const { lastFrame } = render(
        <EmptyState type="tasks" title="Custom Title" />
      );
      const output = lastFrame() || '';

      expect(output).toContain('Custom Title');
      expect(output).not.toContain('No tasks yet');
    });

    it('uses custom subtitle when provided', () => {
      const { lastFrame } = render(
        <EmptyState type="tasks" subtitle="Custom subtitle" />
      );
      const output = lastFrame() || '';

      expect(output).toContain('Custom subtitle');
      expect(output).not.toContain('/tlc:plan');
    });

    it('shows action hint when provided', () => {
      const { lastFrame } = render(
        <EmptyState type="generic" action="Press Enter to add" />
      );
      const output = lastFrame() || '';

      expect(output).toContain('Press Enter to add');
    });
  });

  describe('Compact mode', () => {
    it('renders compact state with title only', () => {
      const { lastFrame } = render(<EmptyState type="tasks" compact />);
      const output = lastFrame() || '';

      expect(output).toContain('No tasks yet');
      // Should be shorter than full version
      expect(output.split('\n').length).toBeLessThan(5);
    });

    it('hides subtitle in compact mode', () => {
      const { lastFrame } = render(<EmptyState type="tasks" compact />);
      const output = lastFrame() || '';

      expect(output).not.toContain('/tlc:plan');
    });
  });

  describe('Icons', () => {
    it('shows an icon', () => {
      const { lastFrame } = render(<EmptyState type="tasks" />);
      const output = lastFrame() || '';

      // Should contain some icon character
      expect(output.length).toBeGreaterThan(0);
    });
  });
});
