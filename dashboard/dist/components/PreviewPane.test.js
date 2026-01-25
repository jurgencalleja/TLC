import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { PreviewPane } from './PreviewPane.js';
describe('PreviewPane', () => {
    describe('initial state', () => {
        it('shows stopped status initially', () => {
            const { lastFrame } = render(_jsx(PreviewPane, { isActive: false }));
            const output = lastFrame();
            expect(output).toContain('Status:');
            expect(output).toContain('Stopped');
        });
    });
    describe('controls', () => {
        it('shows start control when active and stopped', () => {
            const { lastFrame } = render(_jsx(PreviewPane, { isActive: true }));
            const output = lastFrame();
            expect(output).toContain('[s] Start');
        });
        it('shows hint when inactive', () => {
            const { lastFrame } = render(_jsx(PreviewPane, { isActive: false }));
            const output = lastFrame();
            expect(output).toContain('Tab to this pane');
        });
    });
    describe('render states', () => {
        it('renders without error when active', () => {
            const { lastFrame } = render(_jsx(PreviewPane, { isActive: true }));
            expect(lastFrame()).toBeDefined();
        });
        it('renders without error when inactive', () => {
            const { lastFrame } = render(_jsx(PreviewPane, { isActive: false }));
            expect(lastFrame()).toBeDefined();
        });
    });
});
