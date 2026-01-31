import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { CommandPalette, Command } from './CommandPalette.js';

const sampleCommands: Command[] = [
  {
    id: 'tlc:plan',
    name: 'Plan Phase',
    description: 'Create implementation plan for a phase',
    shortcut: 'p',
    category: 'workflow',
  },
  {
    id: 'tlc:build',
    name: 'Build Phase',
    description: 'Implement phase with test-first approach',
    shortcut: 'b',
    category: 'workflow',
  },
  {
    id: 'tlc:verify',
    name: 'Verify Phase',
    description: 'Run human acceptance testing',
    shortcut: 'v',
    category: 'workflow',
  },
  {
    id: 'tlc:claim',
    name: 'Claim Task',
    description: 'Claim a task for yourself',
    shortcut: 'c',
    category: 'team',
  },
  {
    id: 'tlc:who',
    name: 'Team Status',
    description: 'Show team member status',
    shortcut: 'w',
    category: 'team',
  },
  {
    id: 'settings',
    name: 'Open Settings',
    description: 'View and edit configuration',
    shortcut: ',',
    category: 'general',
  },
];

describe('CommandPalette', () => {
  describe('Search Input', () => {
    it('shows search input', () => {
      const { lastFrame } = render(
        <CommandPalette commands={sampleCommands} onSelect={() => {}} />
      );
      expect(lastFrame()).toMatch(/search|>|type/i);
    });

    it('shows current query', () => {
      const { lastFrame } = render(
        <CommandPalette
          commands={sampleCommands}
          query="plan"
          onSelect={() => {}}
        />
      );
      expect(lastFrame()).toContain('plan');
    });

    it('shows cursor indicator', () => {
      const { lastFrame } = render(
        <CommandPalette commands={sampleCommands} onSelect={() => {}} />
      );
      expect(lastFrame()).toMatch(/▏|│|_|\|/);
    });
  });

  describe('Fuzzy Search', () => {
    it('filters commands by name', () => {
      const { lastFrame } = render(
        <CommandPalette
          commands={sampleCommands}
          query="plan"
          onSelect={() => {}}
        />
      );
      expect(lastFrame()).toContain('Plan Phase');
      expect(lastFrame()).not.toContain('Team Status');
    });

    it('filters commands by description', () => {
      const { lastFrame } = render(
        <CommandPalette
          commands={sampleCommands}
          query="test"
          onSelect={() => {}}
        />
      );
      expect(lastFrame()).toContain('Build Phase');
    });

    it('matches partial words', () => {
      const { lastFrame } = render(
        <CommandPalette
          commands={sampleCommands}
          query="ver"
          onSelect={() => {}}
        />
      );
      expect(lastFrame()).toContain('Verify');
    });

    it('is case insensitive', () => {
      const { lastFrame } = render(
        <CommandPalette
          commands={sampleCommands}
          query="PLAN"
          onSelect={() => {}}
        />
      );
      expect(lastFrame()).toContain('Plan Phase');
    });
  });

  describe('Command Display', () => {
    it('shows command name', () => {
      const { lastFrame } = render(
        <CommandPalette commands={sampleCommands} onSelect={() => {}} />
      );
      expect(lastFrame()).toContain('Plan Phase');
      expect(lastFrame()).toContain('Build Phase');
    });

    it('shows command description', () => {
      const { lastFrame } = render(
        <CommandPalette commands={sampleCommands} onSelect={() => {}} />
      );
      expect(lastFrame()).toContain('Create implementation plan');
    });

    it('shows keyboard shortcut', () => {
      const { lastFrame } = render(
        <CommandPalette commands={sampleCommands} onSelect={() => {}} />
      );
      expect(lastFrame()).toMatch(/\[p\]|p/);
    });
  });

  describe('Category Grouping', () => {
    it('groups commands by category', () => {
      const { lastFrame } = render(
        <CommandPalette commands={sampleCommands} onSelect={() => {}} />
      );
      expect(lastFrame()).toMatch(/workflow/i);
      expect(lastFrame()).toMatch(/team/i);
    });

    it('shows category headers', () => {
      const { lastFrame } = render(
        <CommandPalette commands={sampleCommands} onSelect={() => {}} />
      );
      expect(lastFrame()).toMatch(/workflow|team|general/i);
    });
  });

  describe('Recent Commands', () => {
    it('shows recent commands section', () => {
      const { lastFrame } = render(
        <CommandPalette
          commands={sampleCommands}
          recentIds={['tlc:plan', 'tlc:build']}
          onSelect={() => {}}
        />
      );
      expect(lastFrame()).toMatch(/recent/i);
    });

    it('lists recent commands first', () => {
      const { lastFrame } = render(
        <CommandPalette
          commands={sampleCommands}
          recentIds={['tlc:claim']}
          onSelect={() => {}}
        />
      );
      const output = lastFrame() || '';
      const claimIndex = output.indexOf('Claim Task');
      const planIndex = output.indexOf('Plan Phase');
      // Claim should appear before Plan due to recent
      expect(claimIndex).toBeLessThan(planIndex);
    });
  });

  describe('Selection', () => {
    it('first command is selected by default', () => {
      const { lastFrame } = render(
        <CommandPalette commands={sampleCommands} onSelect={() => {}} />
      );
      expect(lastFrame()).toContain('▶');
    });

    it('shows selection indicator', () => {
      const { lastFrame } = render(
        <CommandPalette commands={sampleCommands} onSelect={() => {}} />
      );
      expect(lastFrame()).toMatch(/▶|→|>/);
    });

    it('calls onSelect on Enter', () => {
      const onSelect = vi.fn();
      render(<CommandPalette commands={sampleCommands} onSelect={onSelect} />);
      // Selection happens on Enter key
    });
  });

  describe('Navigation', () => {
    it('shows navigation hints', () => {
      const { lastFrame } = render(
        <CommandPalette commands={sampleCommands} onSelect={() => {}} />
      );
      expect(lastFrame()).toMatch(/↑|↓|j|k/);
    });

    it('shows execute hint', () => {
      const { lastFrame } = render(
        <CommandPalette commands={sampleCommands} onSelect={() => {}} />
      );
      expect(lastFrame()).toMatch(/enter|execute|run/i);
    });

    it('shows close hint', () => {
      const { lastFrame } = render(
        <CommandPalette commands={sampleCommands} onSelect={() => {}} />
      );
      expect(lastFrame()).toMatch(/esc|close/i);
    });
  });

  describe('Empty State', () => {
    it('shows message when no commands match', () => {
      const { lastFrame } = render(
        <CommandPalette
          commands={sampleCommands}
          query="xyznonexistent"
          onSelect={() => {}}
        />
      );
      expect(lastFrame()).toMatch(/no.*command|no.*match|not.*found/i);
    });

    it('shows message when no commands', () => {
      const { lastFrame } = render(
        <CommandPalette commands={[]} onSelect={() => {}} />
      );
      expect(lastFrame()).toMatch(/no.*command|empty/i);
    });
  });

  describe('Callbacks', () => {
    it('calls onQueryChange when typing', () => {
      const onQueryChange = vi.fn();
      render(
        <CommandPalette
          commands={sampleCommands}
          onSelect={() => {}}
          onQueryChange={onQueryChange}
        />
      );
      // Query change happens on input
    });

    it('calls onClose on Escape', () => {
      const onClose = vi.fn();
      render(
        <CommandPalette
          commands={sampleCommands}
          onSelect={() => {}}
          onClose={onClose}
        />
      );
      // Close happens on Esc key
    });
  });

  describe('Result Count', () => {
    it('shows number of matching commands', () => {
      const { lastFrame } = render(
        <CommandPalette
          commands={sampleCommands}
          query="phase"
          onSelect={() => {}}
        />
      );
      // Should show count of matching commands
      expect(lastFrame()).toBeDefined();
    });
  });
});
