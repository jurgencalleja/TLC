import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { TaskCard, TaskCardProps } from './TaskCard.js';

const sampleTask: TaskCardProps = {
  id: 't1',
  title: 'Create user schema',
  status: 'pending',
  priority: 'high',
};

describe('TaskCard', () => {
  describe('Basic Display', () => {
    it('renders task title', () => {
      const { lastFrame } = render(<TaskCard {...sampleTask} />);
      expect(lastFrame()).toContain('Create user schema');
    });

    it('renders task status', () => {
      const { lastFrame } = render(<TaskCard {...sampleTask} />);
      expect(lastFrame()).toContain('pending');
    });

    it('renders in progress status', () => {
      const { lastFrame } = render(
        <TaskCard {...sampleTask} status="in_progress" />
      );
      expect(lastFrame()).toMatch(/in.progress|working/i);
    });

    it('renders completed status', () => {
      const { lastFrame } = render(
        <TaskCard {...sampleTask} status="completed" />
      );
      expect(lastFrame()).toMatch(/completed|done|✓/i);
    });
  });

  describe('Priority', () => {
    it('shows high priority indicator', () => {
      const { lastFrame } = render(
        <TaskCard {...sampleTask} priority="high" />
      );
      expect(lastFrame()).toMatch(/high|🔴|!/i);
    });

    it('shows medium priority indicator', () => {
      const { lastFrame } = render(
        <TaskCard {...sampleTask} priority="medium" />
      );
      expect(lastFrame()).toMatch(/medium|🟡/i);
    });

    it('shows low priority indicator', () => {
      const { lastFrame } = render(
        <TaskCard {...sampleTask} priority="low" />
      );
      expect(lastFrame()).toMatch(/low|🟢/i);
    });

    it('handles no priority', () => {
      const { lastFrame } = render(
        <TaskCard id="t1" title="Test" status="pending" />
      );
      expect(lastFrame()).toContain('Test');
    });
  });

  describe('Assignee', () => {
    it('shows assignee when present', () => {
      const { lastFrame } = render(
        <TaskCard {...sampleTask} assignee="alice" />
      );
      expect(lastFrame()).toContain('alice');
    });

    it('shows @ prefix for assignee', () => {
      const { lastFrame } = render(
        <TaskCard {...sampleTask} assignee="bob" />
      );
      expect(lastFrame()).toContain('@bob');
    });

    it('handles no assignee', () => {
      const { lastFrame } = render(<TaskCard {...sampleTask} />);
      expect(lastFrame()).not.toContain('@');
    });
  });

  describe('Test Status', () => {
    it('shows passing tests badge', () => {
      const { lastFrame } = render(
        <TaskCard {...sampleTask} tests={{ passing: 10, failing: 0 }} />
      );
      expect(lastFrame()).toMatch(/10.*(pass|✓)/i);
    });

    it('shows failing tests badge', () => {
      const { lastFrame } = render(
        <TaskCard {...sampleTask} tests={{ passing: 8, failing: 2 }} />
      );
      expect(lastFrame()).toMatch(/2.*(fail|✗)/i);
    });

    it('handles no tests', () => {
      const { lastFrame } = render(<TaskCard {...sampleTask} />);
      expect(lastFrame()).toContain('Create user schema');
    });
  });

  describe('Selection', () => {
    it('shows selection indicator when selected', () => {
      const { lastFrame } = render(
        <TaskCard {...sampleTask} isSelected={true} />
      );
      expect(lastFrame()).toContain('▶');
    });

    it('hides selection indicator when not selected', () => {
      const { lastFrame } = render(
        <TaskCard {...sampleTask} isSelected={false} />
      );
      expect(lastFrame()).not.toContain('▶');
    });
  });

  describe('Display Modes', () => {
    it('renders compact mode', () => {
      const { lastFrame } = render(
        <TaskCard {...sampleTask} compact={true} />
      );
      expect(lastFrame()).toContain('Create user schema');
    });

    it('renders full mode by default', () => {
      const { lastFrame } = render(<TaskCard {...sampleTask} />);
      expect(lastFrame()).toContain('Create user schema');
    });
  });

  describe('Description', () => {
    it('shows description when present', () => {
      const { lastFrame } = render(
        <TaskCard {...sampleTask} description="Define the database schema" />
      );
      expect(lastFrame()).toContain('Define the database schema');
    });

    it('truncates long description in compact mode', () => {
      const longDesc = 'A'.repeat(100);
      const { lastFrame } = render(
        <TaskCard {...sampleTask} description={longDesc} compact={true} />
      );
      // Should not show full description in compact mode
      const output = lastFrame() || '';
      expect(output.length).toBeLessThan(150);
    });
  });
});
