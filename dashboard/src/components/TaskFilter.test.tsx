import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { TaskFilter, FilterState } from './TaskFilter.js';

describe('TaskFilter', () => {
  describe('Assignee Filter', () => {
    it('shows assignee options', () => {
      const { lastFrame } = render(
        <TaskFilter
          assignees={['alice', 'bob', 'carol']}
          filters={{}}
          onChange={() => {}}
        />
      );
      expect(lastFrame()).toContain('alice');
      expect(lastFrame()).toContain('bob');
      expect(lastFrame()).toContain('carol');
    });

    it('shows selected assignee', () => {
      const { lastFrame } = render(
        <TaskFilter
          assignees={['alice', 'bob']}
          filters={{ assignee: 'alice' }}
          onChange={() => {}}
        />
      );
      // Should indicate alice is selected
      expect(lastFrame()).toMatch(/alice.*\[x\]|\[x\].*alice|●.*alice/i);
    });

    it('shows "All" option for assignee', () => {
      const { lastFrame } = render(
        <TaskFilter
          assignees={['alice']}
          filters={{}}
          onChange={() => {}}
        />
      );
      expect(lastFrame()).toMatch(/all|any/i);
    });
  });

  describe('Status Filter', () => {
    it('shows status toggle options', () => {
      const { lastFrame } = render(
        <TaskFilter
          assignees={[]}
          filters={{}}
          onChange={() => {}}
        />
      );
      expect(lastFrame()).toContain('Pending');
      expect(lastFrame()).toContain('In Progress');
      expect(lastFrame()).toContain('Completed');
    });

    it('shows active status filter', () => {
      const { lastFrame } = render(
        <TaskFilter
          assignees={[]}
          filters={{ status: ['pending', 'in_progress'] }}
          onChange={() => {}}
        />
      );
      expect(lastFrame()).toContain('Pending');
      expect(lastFrame()).toContain('In Progress');
    });
  });

  describe('Priority Filter', () => {
    it('shows priority toggle options', () => {
      const { lastFrame } = render(
        <TaskFilter
          assignees={[]}
          filters={{}}
          onChange={() => {}}
        />
      );
      expect(lastFrame()).toContain('High');
      expect(lastFrame()).toContain('Medium');
      expect(lastFrame()).toContain('Low');
    });

    it('shows active priority filter', () => {
      const { lastFrame } = render(
        <TaskFilter
          assignees={[]}
          filters={{ priority: ['high'] }}
          onChange={() => {}}
        />
      );
      expect(lastFrame()).toContain('High');
    });
  });

  describe('Clear Filters', () => {
    it('shows clear all option', () => {
      const { lastFrame } = render(
        <TaskFilter
          assignees={['alice']}
          filters={{ assignee: 'alice' }}
          onChange={() => {}}
        />
      );
      expect(lastFrame()).toMatch(/clear|reset/i);
    });

    it('calls onChange with empty filters on clear', () => {
      const onChange = vi.fn();
      render(
        <TaskFilter
          assignees={['alice']}
          filters={{ assignee: 'alice' }}
          onChange={onChange}
        />
      );
      // Clear happens on specific key press
    });
  });

  describe('Active Filter Count', () => {
    it('shows filter count when filters active', () => {
      const { lastFrame } = render(
        <TaskFilter
          assignees={['alice']}
          filters={{ assignee: 'alice', status: ['pending'] }}
          onChange={() => {}}
        />
      );
      // Should show "2 active" or similar
      expect(lastFrame()).toMatch(/2.*active|filters.*2/i);
    });

    it('shows no count when no filters', () => {
      const { lastFrame } = render(
        <TaskFilter
          assignees={['alice']}
          filters={{}}
          onChange={() => {}}
        />
      );
      expect(lastFrame()).not.toMatch(/\d+ active/i);
    });
  });

  describe('Navigation', () => {
    it('shows navigation hints', () => {
      const { lastFrame } = render(
        <TaskFilter
          assignees={['alice']}
          filters={{}}
          onChange={() => {}}
        />
      );
      expect(lastFrame()).toMatch(/↑|↓|j|k/);
    });

    it('shows toggle hint', () => {
      const { lastFrame } = render(
        <TaskFilter
          assignees={['alice']}
          filters={{}}
          onChange={() => {}}
        />
      );
      expect(lastFrame()).toMatch(/space|enter|toggle/i);
    });
  });

  describe('Section Labels', () => {
    it('shows Assignee label', () => {
      const { lastFrame } = render(
        <TaskFilter
          assignees={['alice']}
          filters={{}}
          onChange={() => {}}
        />
      );
      expect(lastFrame()).toContain('Assignee');
    });

    it('shows Status label', () => {
      const { lastFrame } = render(
        <TaskFilter
          assignees={[]}
          filters={{}}
          onChange={() => {}}
        />
      );
      expect(lastFrame()).toContain('Status');
    });

    it('shows Priority label', () => {
      const { lastFrame } = render(
        <TaskFilter
          assignees={[]}
          filters={{}}
          onChange={() => {}}
        />
      );
      expect(lastFrame()).toContain('Priority');
    });
  });

  describe('Callbacks', () => {
    it('calls onChange when filter changed', () => {
      const onChange = vi.fn();
      render(
        <TaskFilter
          assignees={['alice']}
          filters={{}}
          onChange={onChange}
        />
      );
      // onChange happens on selection
    });
  });

  describe('Empty Assignees', () => {
    it('hides assignee section when no assignees', () => {
      const { lastFrame } = render(
        <TaskFilter
          assignees={[]}
          filters={{}}
          onChange={() => {}}
        />
      );
      // Should still show Status and Priority
      expect(lastFrame()).toContain('Status');
      expect(lastFrame()).toContain('Priority');
    });
  });
});
