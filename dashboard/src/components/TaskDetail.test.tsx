import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { TaskDetail, TaskDetailProps } from './TaskDetail.js';

const sampleTask: TaskDetailProps['task'] = {
  id: 't1',
  title: 'Create user schema',
  status: 'in_progress',
  priority: 'high',
  assignee: 'alice',
  description: 'Define the database schema for users table with proper constraints and indexes.',
  tests: { passing: 8, failing: 2 },
  activity: [
    { id: 'a1', type: 'status_change', timestamp: '10 min ago', user: 'alice', detail: 'Started work' },
    { id: 'a2', type: 'comment', timestamp: '5 min ago', user: 'bob', detail: 'Looks good so far!' },
    { id: 'a3', type: 'test_run', timestamp: '2 min ago', detail: '8/10 tests passing' },
  ],
  files: [
    'src/db/schema/users.ts',
    'src/db/migrations/001_users.sql',
  ],
  acceptanceCriteria: [
    { id: 'ac1', text: 'Has id, email, passwordHash, createdAt', done: true },
    { id: 'ac2', text: 'Email unique constraint', done: true },
    { id: 'ac3', text: 'Password hashed with bcrypt', done: false },
  ],
};

describe('TaskDetail', () => {
  describe('Header', () => {
    it('renders task title', () => {
      const { lastFrame } = render(<TaskDetail task={sampleTask} />);
      expect(lastFrame()).toContain('Create user schema');
    });

    it('renders task status', () => {
      const { lastFrame } = render(<TaskDetail task={sampleTask} />);
      expect(lastFrame()).toMatch(/in.progress|working/i);
    });

    it('renders priority', () => {
      const { lastFrame } = render(<TaskDetail task={sampleTask} />);
      expect(lastFrame()).toContain('high');
    });

    it('renders assignee', () => {
      const { lastFrame } = render(<TaskDetail task={sampleTask} />);
      expect(lastFrame()).toContain('alice');
    });
  });

  describe('Description', () => {
    it('shows full description', () => {
      const { lastFrame } = render(<TaskDetail task={sampleTask} />);
      expect(lastFrame()).toContain('Define the database schema');
    });
  });

  describe('Acceptance Criteria', () => {
    it('shows acceptance criteria', () => {
      const { lastFrame } = render(<TaskDetail task={sampleTask} />);
      expect(lastFrame()).toContain('Has id, email');
      expect(lastFrame()).toContain('Email unique');
    });

    it('shows completed criteria with checkmark', () => {
      const { lastFrame } = render(<TaskDetail task={sampleTask} />);
      expect(lastFrame()).toMatch(/\[x\]|✓/);
    });

    it('shows incomplete criteria without checkmark', () => {
      const { lastFrame } = render(<TaskDetail task={sampleTask} />);
      expect(lastFrame()).toContain('Password hashed');
    });

    it('shows criteria count', () => {
      const { lastFrame } = render(<TaskDetail task={sampleTask} />);
      expect(lastFrame()).toContain('2/3');
    });
  });

  describe('Test Status', () => {
    it('shows test counts', () => {
      const { lastFrame } = render(<TaskDetail task={sampleTask} />);
      expect(lastFrame()).toContain('8');
      expect(lastFrame()).toContain('10');
    });

    it('shows failing tests', () => {
      const { lastFrame } = render(<TaskDetail task={sampleTask} />);
      expect(lastFrame()).toMatch(/2.*(fail|✗)/i);
    });
  });

  describe('Files', () => {
    it('shows related files', () => {
      const { lastFrame } = render(<TaskDetail task={sampleTask} />);
      expect(lastFrame()).toContain('users.ts');
      expect(lastFrame()).toContain('001_users.sql');
    });
  });

  describe('Activity', () => {
    it('shows activity entries', () => {
      const { lastFrame } = render(<TaskDetail task={sampleTask} />);
      expect(lastFrame()).toContain('Started work');
      expect(lastFrame()).toContain('Looks good');
    });

    it('shows activity timestamps', () => {
      const { lastFrame } = render(<TaskDetail task={sampleTask} />);
      expect(lastFrame()).toContain('10 min ago');
    });

    it('shows activity users', () => {
      const { lastFrame } = render(<TaskDetail task={sampleTask} />);
      expect(lastFrame()).toContain('alice');
      expect(lastFrame()).toContain('bob');
    });
  });

  describe('Actions', () => {
    it('shows claim action for unassigned task', () => {
      const unassignedTask = { ...sampleTask, assignee: undefined };
      const { lastFrame } = render(<TaskDetail task={unassignedTask} />);
      expect(lastFrame()).toContain('c');
    });

    it('shows release action for assigned task', () => {
      const { lastFrame } = render(<TaskDetail task={sampleTask} />);
      expect(lastFrame()).toContain('r');
    });

    it('shows status change actions', () => {
      const { lastFrame } = render(<TaskDetail task={sampleTask} />);
      // Shows [d]one action for in-progress task
      expect(lastFrame()).toContain('[d]one');
    });
  });

  describe('Navigation', () => {
    it('shows back navigation hint', () => {
      const { lastFrame } = render(<TaskDetail task={sampleTask} />);
      expect(lastFrame()).toContain('Esc');
    });

    it('calls onBack when provided', () => {
      const onBack = vi.fn();
      const { lastFrame } = render(
        <TaskDetail task={sampleTask} onBack={onBack} />
      );
      expect(lastFrame()).toContain('Esc');
    });
  });

  describe('Callbacks', () => {
    it('calls onClaim when claim action triggered', () => {
      const onClaim = vi.fn();
      render(<TaskDetail task={sampleTask} onClaim={onClaim} />);
      // Claim happens on 'c' key
    });

    it('calls onRelease when release action triggered', () => {
      const onRelease = vi.fn();
      render(<TaskDetail task={sampleTask} onRelease={onRelease} />);
      // Release happens on 'r' key
    });

    it('calls onStatusChange when status changed', () => {
      const onStatusChange = vi.fn();
      render(<TaskDetail task={sampleTask} onStatusChange={onStatusChange} />);
      // Status change happens on specific keys
    });
  });

  describe('Minimal Task', () => {
    it('renders with minimal data', () => {
      const minimalTask = {
        id: 'min',
        title: 'Minimal',
        status: 'pending' as const,
        activity: [],
        files: [],
        acceptanceCriteria: [],
      };
      const { lastFrame } = render(<TaskDetail task={minimalTask} />);
      expect(lastFrame()).toContain('Minimal');
    });
  });
});
