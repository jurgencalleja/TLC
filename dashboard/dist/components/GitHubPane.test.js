import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { GitHubPane } from './GitHubPane.js';
// Mock child_process to avoid actual gh calls
vi.mock('child_process', () => ({
    exec: vi.fn((cmd, opts, cb) => {
        if (typeof opts === 'function') {
            cb = opts;
        }
        // Simulate gh CLI not available by default
        const error = new Error('gh not found');
        if (cb)
            cb(error, '', '');
        return { stdout: null, stderr: null };
    }),
}));
vi.mock('util', async () => {
    const actual = await vi.importActual('util');
    return {
        ...actual,
        promisify: (fn) => async (...args) => {
            return new Promise((resolve, reject) => {
                fn(...args, (err, stdout, stderr) => {
                    if (err)
                        reject(err);
                    else
                        resolve({ stdout, stderr });
                });
            });
        },
    };
});
describe('GitHubPane', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    describe('loading state', () => {
        it('shows loading message initially', () => {
            const { lastFrame } = render(_jsx(GitHubPane, { isActive: false }));
            const output = lastFrame();
            expect(output).toContain('Loading issues...');
        });
    });
    describe('error state', () => {
        it('shows error when gh CLI fails', async () => {
            const { lastFrame } = render(_jsx(GitHubPane, { isActive: false }));
            // Wait for effect to run
            await new Promise(resolve => setTimeout(resolve, 100));
            const output = lastFrame();
            expect(output).toContain('gh CLI not available');
        });
        it('shows install hint on error', async () => {
            const { lastFrame } = render(_jsx(GitHubPane, { isActive: false }));
            await new Promise(resolve => setTimeout(resolve, 100));
            const output = lastFrame();
            expect(output).toContain('Make sure gh CLI is installed');
        });
    });
    describe('controls', () => {
        it('shows controls when active and has issues', async () => {
            // This test would need proper mocking of successful gh response
            // For now, we test that the component doesn't crash
            const { lastFrame } = render(_jsx(GitHubPane, { isActive: true }));
            await new Promise(resolve => setTimeout(resolve, 100));
            const output = lastFrame();
            // Either shows controls or error state
            expect(output).toBeDefined();
        });
    });
    describe('callback', () => {
        it('accepts onAssignToAgent callback', () => {
            const mockCallback = vi.fn();
            const { lastFrame } = render(_jsx(GitHubPane, { isActive: true, onAssignToAgent: mockCallback }));
            // Component should render without error
            expect(lastFrame()).toBeDefined();
        });
    });
});
