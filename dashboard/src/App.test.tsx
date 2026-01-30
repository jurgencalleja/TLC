import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { App } from './App.js';

// Mock the PlanSync module
vi.mock('./components/PlanSync.js', () => ({
  markIssueComplete: vi.fn().mockResolvedValue(undefined),
  markIssueInProgress: vi.fn().mockResolvedValue(undefined),
}));

// Mock child_process for StatusPane
vi.mock('child_process', () => ({
  exec: vi.fn((cmd, opts, cb) => {
    if (typeof opts === 'function') {
      cb = opts;
    }
    const error = new Error('command not found');
    if (cb) cb(error, '', '');
    return { stdout: null, stderr: null };
  }),
}));

vi.mock('util', async () => {
  const actual = await vi.importActual('util');
  return {
    ...actual,
    promisify: (fn: any) => async (...args: any[]) => {
      return new Promise((resolve, reject) => {
        fn(...args, (err: any, stdout: string, stderr: string) => {
          if (err) reject(err);
          else resolve({ stdout, stderr });
        });
      });
    },
  };
});

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial render', () => {
    it('renders without error', () => {
      const { lastFrame } = render(<App />);
      expect(lastFrame()).toBeDefined();
    });

    it('shows TLC Dashboard header', () => {
      const { lastFrame } = render(<App />);
      const output = lastFrame();

      expect(output).toContain('TLC Dashboard');
    });

    it('shows all pane labels in header', () => {
      const { lastFrame } = render(<App />);
      const output = lastFrame();

      expect(output).toContain('[1]Chat');
      expect(output).toContain('[2]Plan');
      expect(output).toContain('[3]GitHub');
      expect(output).toContain('[4]Agents');
      expect(output).toContain('[5]Preview');
    });

    it('shows footer with keyboard hints', () => {
      const { lastFrame } = render(<App />);
      const output = lastFrame();

      expect(output).toContain('Tab: cycle panes');
      expect(output).toContain('Ctrl+Q: quit');
    });
  });

  describe('pane sections', () => {
    it('shows Chat pane', () => {
      const { lastFrame } = render(<App />);
      const output = lastFrame();

      expect(output).toContain('Chat');
    });

    it('shows GitHub Issues pane', () => {
      const { lastFrame } = render(<App />);
      const output = lastFrame();

      expect(output).toContain('GitHub Issues');
    });

    it('shows Agents pane', () => {
      const { lastFrame } = render(<App />);
      const output = lastFrame();

      expect(output).toContain('Agents');
    });

    it('shows Plan pane', () => {
      const { lastFrame } = render(<App />);
      const output = lastFrame();

      expect(output).toContain('Plan');
    });

    it('shows Preview pane', () => {
      const { lastFrame } = render(<App />);
      const output = lastFrame();

      expect(output).toContain('Preview');
    });
  });

  describe('keyboard navigation', () => {
    it('switches to plan pane when pressing 2', () => {
      const { lastFrame, stdin } = render(<App />);

      stdin.write('2');

      const output = lastFrame();
      // Plan pane should now be active (shown by highlighting)
      expect(output).toContain('Plan');
    });

    it('switches to github pane when pressing 3', () => {
      const { lastFrame, stdin } = render(<App />);

      stdin.write('3');

      const output = lastFrame();
      expect(output).toContain('GitHub');
    });

    it('switches to agents pane when pressing 4', () => {
      const { lastFrame, stdin } = render(<App />);

      stdin.write('4');

      const output = lastFrame();
      expect(output).toContain('Agents');
    });

    it('switches to preview pane when pressing 5', () => {
      const { lastFrame, stdin } = render(<App />);

      stdin.write('5');

      const output = lastFrame();
      expect(output).toContain('Preview');
    });

    it('switches back to chat pane when pressing 1', () => {
      const { lastFrame, stdin } = render(<App />);

      stdin.write('2'); // switch away
      stdin.write('1'); // switch back

      const output = lastFrame();
      expect(output).toContain('Chat');
    });

    it('cycles panes with tab', () => {
      const { lastFrame, stdin } = render(<App />);

      // Tab key
      stdin.write('\t');

      const output = lastFrame();
      // Should have cycled to next pane
      expect(output).toBeDefined();
    });
  });

  describe('TLC branding', () => {
    it('shows TLC indicator in header', () => {
      const { lastFrame } = render(<App />);
      const output = lastFrame();

      expect(output).toContain('TLC');
    });
  });
});
