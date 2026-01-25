import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { StatusPane } from './StatusPane.js';
// Mock child_process
vi.mock('child_process', () => ({
    exec: vi.fn((cmd, opts, cb) => {
        if (typeof opts === 'function') {
            cb = opts;
        }
        // Simulate test command not available
        const error = new Error('command not found');
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
describe('StatusPane', () => {
    it('renders without error', () => {
        const { lastFrame } = render(_jsx(StatusPane, {}));
        expect(lastFrame()).toBeDefined();
    });
    it('shows no results message when tests fail to run', async () => {
        const { lastFrame } = render(_jsx(StatusPane, {}));
        await new Promise(resolve => setTimeout(resolve, 100));
        const output = lastFrame();
        expect(output).toContain('No test results');
    });
    it('shows hint to run tests', async () => {
        const { lastFrame } = render(_jsx(StatusPane, {}));
        await new Promise(resolve => setTimeout(resolve, 100));
        const output = lastFrame();
        expect(output).toContain('Run tests to see status');
    });
});
