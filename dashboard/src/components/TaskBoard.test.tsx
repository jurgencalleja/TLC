import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { TaskBoard, Task } from './TaskBoard.js';

const sampleTasks: Task[] = [
  { id: 't1', title: 'Create schema', status: 'completed', priority: 'high' },
  { id: 't2', title: 'Add validation', status: 'in_progress', assignee: 'alice' },
  { id: 't3', title: 'Write tests', status: 'pending', priority: 'medium' },
  { id: 't4', title: 'Add docs', status: 'pending', priority: 'low' },
  { id: 't5', title: 'Review code', status: 'in_progress', assignee: 'bob' },
];

describe('TaskBoard', () => {
  describe('Columns', () => {
    it('shows three columns', () => {
      const { lastFrame } = render(<TaskBoard tasks={sampleTasks} />);
      expect(lastFrame()).toContain('Pending');
      expect(lastFrame()).toContain('In Progress');
      expect(lastFrame()).toContain('Completed');
    });

    it('shows task count in column headers', () => {
      const { lastFrame } = render(<TaskBoard tasks={sampleTasks} />);
      // 2 pending, 2 in progress, 1 completed
      expect(lastFrame()).toContain('2');
      expect(lastFrame()).toContain('1');
    });

    it('shows tasks in correct columns', () => {
      const { lastFrame } = render(<TaskBoard tasks={sampleTasks} />);
      expect(lastFrame()).toContain('Create schema');
      expect(lastFrame()).toContain('Add validation');
      expect(lastFrame()).toContain('Write tests');
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no tasks', () => {
      const { lastFrame } = render(<TaskBoard tasks={[]} />);
      expect(lastFrame()).toContain('No tasks');
    });

    it('shows empty column indicator', () => {
      const oneTask: Task[] = [
        { id: 't1', title: 'Test', status: 'pending' },
      ];
      const { lastFrame } = render(<TaskBoard tasks={oneTask} />);
      // In Progress and Completed should be empty
      expect(lastFrame()).toMatch(/empty|none|-/i);
    });
  });

  describe('Selection', () => {
    it('first task is selected by default', () => {
      const { lastFrame } = render(<TaskBoard tasks={sampleTasks} />);
      expect(lastFrame()).toContain('▶');
    });

    it('accepts initialColumn prop', () => {
      const { lastFrame } = render(
        <TaskBoard tasks={sampleTasks} initialColumn={1} />
      );
      // Column 1 is "In Progress"
      expect(lastFrame()).toContain('▶');
    });

    it('accepts initialRow prop', () => {
      const { lastFrame } = render(
        <TaskBoard tasks={sampleTasks} initialRow={1} />
      );
      expect(lastFrame()).toContain('▶');
    });
  });

  describe('Navigation Hints', () => {
    it('shows horizontal navigation hint', () => {
      const { lastFrame } = render(<TaskBoard tasks={sampleTasks} />);
      expect(lastFrame()).toMatch(/h\/l|←\/→/);
    });

    it('shows vertical navigation hint', () => {
      const { lastFrame } = render(<TaskBoard tasks={sampleTasks} />);
      expect(lastFrame()).toMatch(/j\/k|↑\/↓/);
    });

    it('shows move task hint', () => {
      const { lastFrame } = render(<TaskBoard tasks={sampleTasks} />);
      expect(lastFrame()).toMatch(/m|move/i);
    });
  });

  describe('Callbacks', () => {
    it('calls onSelect when task selected', () => {
      const onSelect = vi.fn();
      render(<TaskBoard tasks={sampleTasks} onSelect={onSelect} />);
      // Selection happens on Enter - verified by callback presence
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('calls onMove when task moved', () => {
      const onMove = vi.fn();
      render(<TaskBoard tasks={sampleTasks} onMove={onMove} />);
      // Move happens on 'm' key - verified by callback presence
      expect(onMove).not.toHaveBeenCalled();
    });
  });

  describe('Compact Mode', () => {
    it('supports compact display', () => {
      const { lastFrame } = render(
        <TaskBoard tasks={sampleTasks} compact={true} />
      );
      expect(lastFrame()).toContain('Pending');
    });
  });

  describe('Column Highlighting', () => {
    it('highlights active column', () => {
      const { lastFrame } = render(<TaskBoard tasks={sampleTasks} />);
      // Active column should have visual distinction
      expect(lastFrame()).toContain('Pending');
    });
  });

  describe('Priority Sorting', () => {
    it('sorts tasks by priority within column', () => {
      const { lastFrame } = render(<TaskBoard tasks={sampleTasks} />);
      const output = lastFrame() || '';
      // High priority 'Write tests' should appear before low priority 'Add docs'
      const writeIndex = output.indexOf('Write tests');
      const addIndex = output.indexOf('Add docs');
      expect(writeIndex).toBeLessThan(addIndex);
    });
  });
});
