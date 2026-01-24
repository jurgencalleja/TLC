import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { AgentsPane, getIdleAgent } from './AgentsPane.js';

describe('AgentsPane', () => {
  describe('getIdleAgent', () => {
    it('returns first idle agent', () => {
      const agents = [
        { id: 1, status: 'working' as const, task: 'task1', issueNumber: 1, output: [], process: null },
        { id: 2, status: 'idle' as const, task: null, issueNumber: null, output: [], process: null },
        { id: 3, status: 'idle' as const, task: null, issueNumber: null, output: [], process: null },
      ];

      const idle = getIdleAgent(agents);
      expect(idle?.id).toBe(2);
    });

    it('returns undefined when all agents busy', () => {
      const agents = [
        { id: 1, status: 'working' as const, task: 'task1', issueNumber: 1, output: [], process: null },
        { id: 2, status: 'working' as const, task: 'task2', issueNumber: 2, output: [], process: null },
        { id: 3, status: 'done' as const, task: 'task3', issueNumber: 3, output: [], process: null },
      ];

      const idle = getIdleAgent(agents);
      expect(idle).toBeUndefined();
    });

    it('returns undefined for empty array', () => {
      const idle = getIdleAgent([]);
      expect(idle).toBeUndefined();
    });
  });

  describe('component rendering', () => {
    it('renders with all agents idle', () => {
      const { lastFrame } = render(<AgentsPane isActive={false} />);
      const output = lastFrame();

      expect(output).toContain('Agents');
      expect(output).toContain('0/3 active');
      expect(output).toContain('[1]');
      expect(output).toContain('[2]');
      expect(output).toContain('[3]');
      expect(output).toContain('Idle');
    });

    it('shows controls when active', () => {
      const { lastFrame } = render(<AgentsPane isActive={true} />);
      const output = lastFrame();

      expect(output).toContain('[1-3] Stop agent');
    });

    it('hides controls when inactive', () => {
      const { lastFrame } = render(<AgentsPane isActive={false} />);
      const output = lastFrame();

      expect(output).not.toContain('[1-3] Stop agent');
    });
  });
});
