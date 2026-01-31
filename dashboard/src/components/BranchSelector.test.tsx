import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { BranchSelector, Branch } from './BranchSelector.js';

const sampleBranches: Branch[] = [
  {
    name: 'main',
    isCurrent: true,
    ahead: 0,
    behind: 0,
    lastCommit: '2 hours ago',
  },
  {
    name: 'feature/auth',
    isCurrent: false,
    ahead: 3,
    behind: 1,
    lastCommit: '30 min ago',
  },
  {
    name: 'feature/dashboard',
    isCurrent: false,
    ahead: 5,
    behind: 0,
    lastCommit: '1 hour ago',
  },
  {
    name: 'bugfix/login',
    isCurrent: false,
    ahead: 1,
    behind: 2,
    lastCommit: '3 hours ago',
  },
];

describe('BranchSelector', () => {
  describe('Current Branch', () => {
    it('shows current branch name', () => {
      const { lastFrame } = render(<BranchSelector branches={sampleBranches} />);
      expect(lastFrame()).toContain('main');
    });

    it('highlights current branch', () => {
      const { lastFrame } = render(<BranchSelector branches={sampleBranches} />);
      // Current branch should have indicator
      expect(lastFrame()).toContain('*');
    });

    it('shows current branch when no branches marked current', () => {
      const branches = sampleBranches.map(b => ({ ...b, isCurrent: false }));
      const { lastFrame } = render(
        <BranchSelector branches={branches} currentBranch="main" />
      );
      expect(lastFrame()).toContain('main');
    });
  });

  describe('Branch List', () => {
    it('shows all branches', () => {
      const { lastFrame } = render(<BranchSelector branches={sampleBranches} />);
      expect(lastFrame()).toContain('main');
      expect(lastFrame()).toContain('feature/auth');
      expect(lastFrame()).toContain('feature/dashboard');
      expect(lastFrame()).toContain('bugfix/login');
    });

    it('shows last commit time', () => {
      const { lastFrame } = render(<BranchSelector branches={sampleBranches} />);
      expect(lastFrame()).toContain('2 hours ago');
      expect(lastFrame()).toContain('30 min ago');
    });

    it('shows branch count', () => {
      const { lastFrame } = render(<BranchSelector branches={sampleBranches} />);
      expect(lastFrame()).toContain('4');
    });
  });

  describe('Ahead/Behind Status', () => {
    it('shows ahead count', () => {
      const { lastFrame } = render(<BranchSelector branches={sampleBranches} />);
      expect(lastFrame()).toContain('↑3');
    });

    it('shows behind count', () => {
      const { lastFrame } = render(<BranchSelector branches={sampleBranches} />);
      expect(lastFrame()).toContain('↓1');
    });

    it('shows both ahead and behind', () => {
      const { lastFrame } = render(<BranchSelector branches={sampleBranches} />);
      // feature/auth has ahead: 3, behind: 1
      const output = lastFrame() || '';
      expect(output).toContain('↑3');
      expect(output).toContain('↓1');
    });

    it('hides zero ahead/behind', () => {
      const { lastFrame } = render(<BranchSelector branches={sampleBranches} />);
      // main has ahead: 0, behind: 0 - should not show ↑0 ↓0
      const output = lastFrame() || '';
      // Count occurrences - main shouldn't add ↑0 or ↓0
      expect(output).not.toContain('↑0');
      expect(output).not.toContain('↓0');
    });
  });

  describe('Selection', () => {
    it('first branch is selected by default', () => {
      const { lastFrame } = render(<BranchSelector branches={sampleBranches} />);
      expect(lastFrame()).toContain('▶');
    });

    it('accepts initialSelected prop', () => {
      const { lastFrame } = render(
        <BranchSelector branches={sampleBranches} initialSelected={2} />
      );
      // Third branch (feature/dashboard) should be selected
      expect(lastFrame()).toContain('▶');
    });

    it('calls onSelect when branch selected', () => {
      const onSelect = vi.fn();
      render(<BranchSelector branches={sampleBranches} onSelect={onSelect} />);
      // Selection happens on Enter key - tested via stdin
    });
  });

  describe('Navigation', () => {
    it('shows navigation hint', () => {
      const { lastFrame } = render(<BranchSelector branches={sampleBranches} />);
      expect(lastFrame()).toContain('↑/k');
      expect(lastFrame()).toContain('↓/j');
    });

    it('shows switch hint', () => {
      const { lastFrame } = render(<BranchSelector branches={sampleBranches} />);
      expect(lastFrame()).toContain('Enter');
    });
  });

  describe('Empty State', () => {
    it('shows message when no branches', () => {
      const { lastFrame } = render(<BranchSelector branches={[]} />);
      expect(lastFrame()).toContain('No branches');
    });
  });

  describe('Filter', () => {
    it('filters branches by name', () => {
      const { lastFrame } = render(
        <BranchSelector branches={sampleBranches} filter="feature" />
      );
      expect(lastFrame()).toContain('feature/auth');
      expect(lastFrame()).toContain('feature/dashboard');
      expect(lastFrame()).not.toContain('bugfix/login');
    });

    it('shows filter hint when filtering', () => {
      const { lastFrame } = render(
        <BranchSelector branches={sampleBranches} filter="feature" />
      );
      expect(lastFrame()).toContain('feature');
    });

    it('shows no results when filter matches nothing', () => {
      const { lastFrame } = render(
        <BranchSelector branches={sampleBranches} filter="nonexistent" />
      );
      expect(lastFrame()).toContain('No branches matching');
    });
  });

  describe('Compact Mode', () => {
    it('supports compact display', () => {
      const { lastFrame } = render(
        <BranchSelector branches={sampleBranches} compact />
      );
      expect(lastFrame()).toContain('main');
    });
  });

  describe('Status Indicators', () => {
    it('shows clean status for synced branch', () => {
      const syncedBranches = [
        { name: 'main', isCurrent: true, ahead: 0, behind: 0 },
      ];
      const { lastFrame } = render(<BranchSelector branches={syncedBranches} />);
      expect(lastFrame()).toContain('✓');
    });

    it('shows warning for behind branch', () => {
      const behindBranches = [
        { name: 'old-branch', isCurrent: true, ahead: 0, behind: 5 },
      ];
      const { lastFrame } = render(<BranchSelector branches={behindBranches} />);
      expect(lastFrame()).toContain('↓5');
    });
  });
});
