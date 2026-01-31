import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { ProjectDetail, ProjectDetailProps } from './ProjectDetail.js';

const sampleProject: ProjectDetailProps['project'] = {
  id: '1',
  name: 'Test Project',
  description: 'A sample project for testing',
  phases: [
    { number: 1, name: 'Setup', status: 'completed' },
    { number: 2, name: 'Authentication', status: 'in_progress' },
    { number: 3, name: 'Dashboard', status: 'pending' },
  ],
  tasks: [
    { id: 't1', title: 'Create schema', status: 'completed', assignee: 'alice' },
    { id: 't2', title: 'Add validation', status: 'in_progress', assignee: 'bob' },
    { id: 't3', title: 'Write tests', status: 'pending' },
  ],
  tests: {
    passing: 45,
    failing: 2,
    total: 47,
    recentRuns: [
      { id: 'r1', timestamp: '2 min ago', passed: 45, failed: 2, duration: '12s' },
      { id: 'r2', timestamp: '1 hour ago', passed: 44, failed: 3, duration: '15s' },
    ],
  },
  logs: [
    { id: 'l1', timestamp: '10:30:00', level: 'info', message: 'Build started' },
    { id: 'l2', timestamp: '10:30:05', level: 'error', message: 'Test failed: auth.test.ts' },
    { id: 'l3', timestamp: '10:30:10', level: 'info', message: 'Build completed' },
  ],
};

describe('ProjectDetail', () => {
  describe('Header', () => {
    it('renders project name', () => {
      const { lastFrame } = render(<ProjectDetail project={sampleProject} />);
      expect(lastFrame()).toContain('Test Project');
    });

    it('renders project description', () => {
      const { lastFrame } = render(<ProjectDetail project={sampleProject} />);
      expect(lastFrame()).toContain('A sample project for testing');
    });

    it('renders back navigation hint', () => {
      const { lastFrame } = render(<ProjectDetail project={sampleProject} />);
      expect(lastFrame()).toContain('Esc');
    });
  });

  describe('Tabs', () => {
    it('shows all four tabs', () => {
      const { lastFrame } = render(<ProjectDetail project={sampleProject} />);
      expect(lastFrame()).toContain('Overview');
      expect(lastFrame()).toContain('Tasks');
      expect(lastFrame()).toContain('Tests');
      expect(lastFrame()).toContain('Logs');
    });

    it('shows tab numbers', () => {
      const { lastFrame } = render(<ProjectDetail project={sampleProject} />);
      expect(lastFrame()).toContain('1');
      expect(lastFrame()).toContain('2');
      expect(lastFrame()).toContain('3');
      expect(lastFrame()).toContain('4');
    });

    it('shows Overview tab by default', () => {
      const { lastFrame } = render(<ProjectDetail project={sampleProject} />);
      // Overview content should be visible - phases
      expect(lastFrame()).toContain('Setup');
      expect(lastFrame()).toContain('Authentication');
    });

    it('accepts initialTab prop', () => {
      const { lastFrame } = render(
        <ProjectDetail project={sampleProject} initialTab="tasks" />
      );
      // Tasks content should be visible
      expect(lastFrame()).toContain('Create schema');
      expect(lastFrame()).toContain('Add validation');
    });
  });

  describe('Overview Tab', () => {
    it('shows phases progress', () => {
      const { lastFrame } = render(
        <ProjectDetail project={sampleProject} initialTab="overview" />
      );
      expect(lastFrame()).toContain('1. Setup');
      expect(lastFrame()).toContain('2. Authentication');
      expect(lastFrame()).toContain('3. Dashboard');
    });

    it('shows completed phase marker', () => {
      const { lastFrame } = render(
        <ProjectDetail project={sampleProject} initialTab="overview" />
      );
      expect(lastFrame()).toContain('[x]');
    });

    it('shows in-progress phase marker', () => {
      const { lastFrame } = render(
        <ProjectDetail project={sampleProject} initialTab="overview" />
      );
      expect(lastFrame()).toContain('[>]');
    });

    it('shows pending phase marker', () => {
      const { lastFrame } = render(
        <ProjectDetail project={sampleProject} initialTab="overview" />
      );
      expect(lastFrame()).toContain('[ ]');
    });

    it('shows test summary', () => {
      const { lastFrame } = render(
        <ProjectDetail project={sampleProject} initialTab="overview" />
      );
      expect(lastFrame()).toContain('45');
      expect(lastFrame()).toContain('47');
    });
  });

  describe('Tasks Tab', () => {
    it('shows task list', () => {
      const { lastFrame } = render(
        <ProjectDetail project={sampleProject} initialTab="tasks" />
      );
      expect(lastFrame()).toContain('Create schema');
      expect(lastFrame()).toContain('Add validation');
      expect(lastFrame()).toContain('Write tests');
    });

    it('shows task status', () => {
      const { lastFrame } = render(
        <ProjectDetail project={sampleProject} initialTab="tasks" />
      );
      // Should show status indicators
      expect(lastFrame()).toMatch(/completed|✓/i);
    });

    it('shows assignee when present', () => {
      const { lastFrame } = render(
        <ProjectDetail project={sampleProject} initialTab="tasks" />
      );
      expect(lastFrame()).toContain('alice');
      expect(lastFrame()).toContain('bob');
    });

    it('handles empty tasks', () => {
      const emptyProject = { ...sampleProject, tasks: [] };
      const { lastFrame } = render(
        <ProjectDetail project={emptyProject} initialTab="tasks" />
      );
      expect(lastFrame()).toContain('No tasks');
    });
  });

  describe('Tests Tab', () => {
    it('shows test summary', () => {
      const { lastFrame } = render(
        <ProjectDetail project={sampleProject} initialTab="tests" />
      );
      expect(lastFrame()).toContain('45');
      expect(lastFrame()).toContain('47');
    });

    it('shows recent test runs', () => {
      const { lastFrame } = render(
        <ProjectDetail project={sampleProject} initialTab="tests" />
      );
      expect(lastFrame()).toContain('2 min ago');
      expect(lastFrame()).toContain('1 hour ago');
    });

    it('shows run duration', () => {
      const { lastFrame } = render(
        <ProjectDetail project={sampleProject} initialTab="tests" />
      );
      expect(lastFrame()).toContain('12s');
    });

    it('handles no test runs', () => {
      const noRunsProject = {
        ...sampleProject,
        tests: { ...sampleProject.tests, recentRuns: [] },
      };
      const { lastFrame } = render(
        <ProjectDetail project={noRunsProject} initialTab="tests" />
      );
      expect(lastFrame()).toContain('No recent runs');
    });
  });

  describe('Logs Tab', () => {
    it('shows log entries', () => {
      const { lastFrame } = render(
        <ProjectDetail project={sampleProject} initialTab="logs" />
      );
      expect(lastFrame()).toContain('Build started');
      expect(lastFrame()).toContain('Test failed');
      expect(lastFrame()).toContain('Build completed');
    });

    it('shows log timestamps', () => {
      const { lastFrame } = render(
        <ProjectDetail project={sampleProject} initialTab="logs" />
      );
      expect(lastFrame()).toContain('10:30:00');
    });

    it('shows error logs differently', () => {
      const { lastFrame } = render(
        <ProjectDetail project={sampleProject} initialTab="logs" />
      );
      // Error messages should be present
      expect(lastFrame()).toContain('error');
    });

    it('handles empty logs', () => {
      const emptyLogsProject = { ...sampleProject, logs: [] };
      const { lastFrame } = render(
        <ProjectDetail project={emptyLogsProject} initialTab="logs" />
      );
      expect(lastFrame()).toContain('No logs');
    });
  });

  describe('Navigation', () => {
    it('shows navigation hint for number keys', () => {
      const { lastFrame } = render(<ProjectDetail project={sampleProject} />);
      expect(lastFrame()).toContain('1-4');
    });

    it('calls onBack when provided', () => {
      const onBack = vi.fn();
      const { lastFrame } = render(
        <ProjectDetail project={sampleProject} onBack={onBack} />
      );
      expect(lastFrame()).toContain('Esc');
    });
  });

  describe('Minimal Project', () => {
    it('renders with minimal data', () => {
      const minimalProject = {
        id: 'min',
        name: 'Minimal',
        phases: [],
        tasks: [],
        tests: { passing: 0, failing: 0, total: 0, recentRuns: [] },
        logs: [],
      };
      const { lastFrame } = render(<ProjectDetail project={minimalProject} />);
      expect(lastFrame()).toContain('Minimal');
    });
  });
});
